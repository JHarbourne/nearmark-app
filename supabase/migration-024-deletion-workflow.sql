-- Migration 024 — deletion requests + soft-archive (Phase 3 of the permissions spec).
-- See docs/backoffice-permissions-spec.md.
--
-- ⚠️ DRAFT — DO NOT RUN during the freeze. Depends on 022 (ownership) & 023 (notifications).
--    Run in EACH project (Tollesbury + LGBT) once signed off.
--
-- Model: nothing is hard-deleted by an editor. "Delete" either soft-archives
-- (owner/SA — recoverable) or raises a request to the owner (non-owner). Approving
-- a request archives; only the Super Admin can restore or permanently purge.

begin;

-- ── soft-archive columns ─────────────────────────────────────────────────────
alter table public.locations add column if not exists archived_at timestamptz;
alter table public.locations add column if not exists archived_by uuid references auth.users(id);
alter table public.tours     add column if not exists archived_at timestamptz;
alter table public.tours     add column if not exists archived_by uuid references auth.users(id);

-- Archived rows never reach the public app (extends the 011/012 anon policies).
drop policy if exists "anon read published locations" on public.locations;
create policy "anon read published locations" on public.locations
  for select to anon using (
    status = 'published'
    and archived_at is null
    and (publish_from  is null or now() >= publish_from)
    and (publish_until is null or now() <= publish_until)
    and (visibility = 'public' or consent_given = true)
  );

drop policy if exists "anon read published tours" on public.tours;
create policy "anon read published tours" on public.tours
  for select to anon using (
    status = 'published'
    and archived_at is null
    and (takedown_at is null or now() <= takedown_at)
  );

-- Hard delete is now SUPER ADMIN ONLY (a purge). Owners delete by archiving.
drop policy if exists loc_delete on public.locations;
create policy loc_delete on public.locations for delete to authenticated
  using (is_super_admin());
drop policy if exists tour_delete on public.tours;
create policy tour_delete on public.tours for delete to authenticated
  using (is_super_admin());

-- ── deletion_requests ────────────────────────────────────────────────────────
create table if not exists public.deletion_requests (
  id                bigint generated always as identity primary key,
  entity_type       text not null check (entity_type in ('location','tour')),
  entity_id         uuid not null,
  entity_title      text,
  requested_by      uuid not null references auth.users(id),
  requested_by_name text,
  owner             uuid references auth.users(id),
  status            text not null default 'pending'
                      check (status in ('pending','approved','declined','cancelled')),
  reason            text,
  created_at        timestamptz not null default now(),
  decided_at        timestamptz,
  decided_by        uuid references auth.users(id)
);
create index if not exists deletion_requests_owner_idx
  on public.deletion_requests (owner, status);
-- One open request per entity.
create unique index if not exists deletion_requests_one_open
  on public.deletion_requests (entity_type, entity_id) where status = 'pending';

alter table public.deletion_requests enable row level security;
drop policy if exists delreq_select on public.deletion_requests;
create policy delreq_select on public.deletion_requests for select to authenticated
  using (requested_by = auth.uid() or owner = auth.uid() or is_super_admin());
-- Rows are created/decided via the SECURITY DEFINER functions below, not directly.

-- ── helpers to read an entity's owner/title generically ──────────────────────
create or replace function public._entity_owner(p_type text, p_id uuid)
returns table (owner uuid, title text)
language plpgsql stable security definer set search_path = public as $$
begin
  if p_type = 'location' then
    return query select l.created_by, l.title from public.locations l where l.id = p_id;
  elsif p_type = 'tour' then
    return query select t.created_by, t.title from public.tours t where t.id = p_id;
  end if;
end; $$;

create or replace function public._archive_entity(p_type text, p_id uuid, p_by uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_type = 'location' then
    update public.locations set archived_at = now(), archived_by = p_by where id = p_id;
  elsif p_type = 'tour' then
    update public.tours set archived_at = now(), archived_by = p_by where id = p_id;
  end if;
end; $$;

-- ── single entry point the app calls when someone hits "Delete" ──────────────
-- Owner/SA → archives immediately (recoverable). Non-owner → raises a request and
-- notifies the owner. Returns 'archived' or 'requested'.
create or replace function public.request_delete(p_type text, p_id uuid, p_reason text default null)
returns text language plpgsql security definer set search_path = public as $$
declare v_owner uuid; v_title text; me uuid := auth.uid(); my_name text;
begin
  select owner, title into v_owner, v_title from public._entity_owner(p_type, p_id);
  if v_title is null then raise exception 'Entity not found'; end if;
  select coalesce(display_name, email) into my_name from public.profiles where user_id = me;

  if is_super_admin() or v_owner = me then
    perform public._archive_entity(p_type, p_id, me);
    return 'archived';
  end if;

  insert into public.deletion_requests
    (entity_type, entity_id, entity_title, requested_by, requested_by_name, owner, reason)
  values (p_type, p_id, v_title, me, my_name, v_owner, p_reason)
  on conflict (entity_type, entity_id) where status = 'pending' do nothing;

  insert into public.notifications
    (recipient, type, entity_type, entity_id, entity_title, actor, actor_name, message)
  values (v_owner, 'delete_request', p_type, p_id, v_title, me, my_name,
          coalesce(my_name,'Someone') || ' asked to delete your ' || p_type || ' “' || v_title || '”');
  return 'requested';
end; $$;

-- ── owner/SA decides a pending request ───────────────────────────────────────
create or replace function public.resolve_deletion(p_request_id bigint, p_approve boolean)
returns void language plpgsql security definer set search_path = public as $$
declare r public.deletion_requests; me uuid := auth.uid(); my_name text;
begin
  select * into r from public.deletion_requests where id = p_request_id and status = 'pending';
  if r.id is null then raise exception 'Request not found or already decided'; end if;
  if not (is_super_admin() or r.owner = me) then
    raise exception 'Only the owner or a super admin can decide this request';
  end if;
  select coalesce(display_name, email) into my_name from public.profiles where user_id = me;

  if p_approve then
    perform public._archive_entity(r.entity_type, r.entity_id, me);
    update public.deletion_requests set status='approved', decided_at=now(), decided_by=me where id=r.id;
    insert into public.notifications
      (recipient, type, entity_type, entity_id, entity_title, actor, actor_name, message)
    values (r.requested_by, 'delete_approved', r.entity_type, r.entity_id, r.entity_title, me, my_name,
            'Your request to delete “' || r.entity_title || '” was approved');
  else
    update public.deletion_requests set status='declined', decided_at=now(), decided_by=me where id=r.id;
    insert into public.notifications
      (recipient, type, entity_type, entity_id, entity_title, actor, actor_name, message)
    values (r.requested_by, 'delete_declined', r.entity_type, r.entity_id, r.entity_title, me, my_name,
            'Your request to delete “' || r.entity_title || '” was declined');
  end if;
end; $$;

-- ── restore an archived row (owner or SA) ────────────────────────────────────
create or replace function public.restore_entity(p_type text, p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_owner uuid;
begin
  select owner into v_owner from public._entity_owner(p_type, p_id);
  if not (is_super_admin() or v_owner = auth.uid()) then
    raise exception 'Only the owner or a super admin can restore this';
  end if;
  if p_type = 'location' then
    update public.locations set archived_at = null, archived_by = null where id = p_id;
  elsif p_type = 'tour' then
    update public.tours set archived_at = null, archived_by = null where id = p_id;
  end if;
end; $$;

-- ── 023's edit-notify now also ignores archive/restore actions ───────────────
create or replace function public.notify_owner_on_edit() returns trigger
language plpgsql security definer set search_path = public as $$
declare editor_name text;
begin
  if new.created_by is not null
     and new.created_by <> auth.uid()
     and new.archived_at is not distinct from old.archived_at then
    select coalesce(display_name, email) into editor_name
      from public.profiles where user_id = auth.uid();
    insert into public.notifications
      (recipient, type, entity_type, entity_id, entity_title, actor, actor_name, message)
    values
      (new.created_by, 'edit', 'location', new.id, new.title, auth.uid(), editor_name,
       coalesce(editor_name, 'Someone') || ' edited your location “' || new.title || '”');
  end if;
  return new;
end; $$;

commit;

notify pgrst, 'reload schema';

-- App wiring (Phase 3, when built):
--   • "Delete" button  → supabase.rpc('request_delete', { p_type, p_id, p_reason })
--       result 'archived'  → toast "Moved to archive (recoverable)"
--       result 'requested' → toast "Request sent to the owner for approval"
--   • Owner's notification bell → Approve/Decline → rpc('resolve_deletion', { p_request_id, p_approve })
--   • Admin lists filter out archived_at IS NOT NULL by default; an "Archive" view
--     shows them with Restore (rpc 'restore_entity') and, for the SA, permanent Purge
--     (a real DELETE, allowed only by the SA-only delete policy above).
--   • Purge window: SA may hard-delete anytime; suggest surfacing rows archived > 30 days.
