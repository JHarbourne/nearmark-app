-- Migration 040 — deletion requests + soft-archive (Phase 3 of the permissions spec).
-- Renumbered from the parked draft 024 and reconciled to the CURRENT schema
-- (stories layer 025 + per-tour scoping 036/037). See docs/backoffice-permissions-spec.md § 5.
--
-- ⚠️ Run on STAGING first, verify, then EACH prod project where 030/031/036/037 are
--    applied. The final `notify pgrst, 'reload schema';` is included.
--
-- Model: nothing is hard-deleted by an editor. "Delete" either soft-archives
-- (owner/SA — recoverable) or raises a request to the owner (a non-owner assigned
-- editor). Approving a request archives; only the Super Admin can permanently purge
-- (a real DELETE), which the SA-only delete policy below enforces.
--
-- ── The trap this rewrite exists to avoid ────────────────────────────────────
-- The parked draft (024) re-CREATEd notify_owner_on_edit() with its Phase-2 body,
-- which would have silently dropped migration 031's de-dupe helper AND its stories
-- edit-trigger. It also left archiving (itself an UPDATE) free to fire a bogus
-- "X edited your location" at the owner. This version leaves 031's helper and both
-- triggers intact and only teaches the location trigger to ignore an archive-only
-- change. It also does not reproduce 025's visibility helper — it wraps it — so an
-- archived location (and its stories) drops out of the public app without risking a
-- copy of that long policy body drifting from the original.

begin;

-- ── soft-archive columns ─────────────────────────────────────────────────────
alter table public.locations add column if not exists archived_at timestamptz;
alter table public.locations add column if not exists archived_by uuid references auth.users(id);
alter table public.tours     add column if not exists archived_at timestamptz;
alter table public.tours     add column if not exists archived_by uuid references auth.users(id);

-- ── keep archived rows out of the public app ─────────────────────────────────
-- Wrap (don't rewrite) the 025 visibility helper so both the anon locations policy
-- and the anon stories policy hide an archived location and its stories.
drop policy if exists "anon read published locations" on public.locations;
create policy "anon read published locations" on public.locations
  for select to anon using (
    archived_at is null and public.location_visible_to_anon(locations)
  );

drop policy if exists "anon read stories of public locations" on public.stories;
create policy "anon read stories of public locations" on public.stories
  for select to anon using (
    exists (select 1 from public.locations l
            where l.id = stories.location_id
              and l.archived_at is null
              and public.location_visible_to_anon(l))
  );

drop policy if exists "anon read published tours" on public.tours;
create policy "anon read published tours" on public.tours
  for select to anon using (
    archived_at is null
    and status = 'published'
    and (takedown_at is null or now() <= takedown_at)
  );

-- ── hard delete is now SUPER ADMIN ONLY (a purge) ────────────────────────────
-- Owners no longer hard-delete; they archive (recoverable) via request_delete().
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
-- Rows are created/decided via the SECURITY DEFINER functions below, never directly.

-- ── helpers to read/archive an entity generically ────────────────────────────
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

-- ── teach 031's location edit-trigger to ignore an archive-only change ────────
-- (Do NOT touch notify_owner_edit or the stories trigger — 031 owns those.)
-- Archiving/restoring is an UPDATE, so without this guard the owner would get a
-- spurious "X edited your location" every time a row is archived or restored.
create or replace function public.notify_owner_on_edit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.archived_at is distinct from old.archived_at then return new; end if;
  perform public.notify_owner_edit(new.created_by, new.id, new.title, 'edited your location');
  return new;
end; $$;

commit;

notify pgrst, 'reload schema';

-- App wiring (built in this phase — for reference):
--   • Delete button  → rpc('request_delete', { p_type, p_id })
--       'archived'  → toast "Moved to the archive (recoverable)"
--       'requested' → toast "Request sent to the owner for approval"
--   • Owner's bell → a 'delete_request' notification with Approve / Decline →
--       rpc('resolve_deletion', { p_request_id, p_approve })
--   • Archive view: archived locations/tours with Restore (rpc 'restore_entity');
--       the Super Admin also gets Purge (a real DELETE, SA-only by the policies above),
--       with rows archived > 30 days flagged as safe to clear.
