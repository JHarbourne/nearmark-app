-- Migration 043 — editors can create events, Super Admin approves them.
-- Additive. Depends on 038 (announcements + created_by + can_manage_announcements)
-- and 030/031 (is_super_admin, profiles, notifications). Run on staging + both prod.
--
-- Until now announcements were Super-Admin-only. This lets an EDITOR create/edit their
-- own event, but it stays invisible to the public until a Super Admin approves it:
--   • public sees an event only when it's PUBLISHED *and* APPROVED (and not ended);
--   • an editor can never self-approve — any create/edit leaves it pending;
--   • a Super Admin's own new event is auto-approved (their flow is unchanged);
--   • ANY editor edit of an approved event sends it back to pending (changes can't
--     slip live after approval);
--   • the Super Admin is notified when an event is waiting, the editor when it's decided.

begin;

alter table public.announcements add column if not exists approved_at timestamptz;
alter table public.announcements add column if not exists approved_by uuid references auth.users(id);

-- Every existing event was Super-Admin-made and already live → treat as approved.
update public.announcements set approved_at = coalesce(created_at, now()) where approved_at is null;

-- Anon: published AND approved AND not past its end (was: published AND not ended).
drop policy if exists ann_anon_read on public.announcements;
create policy ann_anon_read on public.announcements for select to anon
  using (status = 'published'
         and approved_at is not null
         and (coalesce(event_end, event_start) is null or coalesce(event_end, event_start) >= now()));

-- Write: an admin/Super Admin manages anything; an editor manages their OWN events.
-- (can_manage_announcements() is is_super_admin() where RBAC is on, else true.)
drop policy if exists ann_write on public.announcements;
create policy ann_write on public.announcements for all to authenticated
  using (can_manage_announcements() or created_by = auth.uid())
  with check (can_manage_announcements() or created_by = auth.uid());

-- Notify every Super Admin (except the actor) — used when an event needs approval.
create or replace function public.notify_super_admins(p_type text, p_id uuid, p_title text, p_msg text)
returns void language plpgsql security definer set search_path = public as $$
declare actor_name text;
begin
  select coalesce(display_name, email) into actor_name from public.profiles where user_id = auth.uid();
  insert into public.notifications (recipient, type, entity_type, entity_id, entity_title, actor, actor_name, message)
  select p.user_id, p_type, 'event', p_id, p_title, auth.uid(), actor_name,
         coalesce(actor_name, 'Someone') || ' ' || p_msg
  from public.profiles p where p.role = 'super_admin' and p.user_id <> auth.uid();
end; $$;

-- Approval guard: editors can't self-approve; an admin's own NEW event auto-approves.
create or replace function public.ann_approval_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.can_manage_announcements() then
    if tg_op = 'INSERT' and new.approved_at is null then
      new.approved_at := now(); new.approved_by := auth.uid();
    end if;
  else
    new.approved_at := null; new.approved_by := null;
    -- Tell the Super Admins on a fresh submission, or when an approved event is edited
    -- back into pending — not on every repeated save of an already-pending one.
    if tg_op = 'INSERT' or (tg_op = 'UPDATE' and old.approved_at is not null) then
      perform public.notify_super_admins('event_pending', new.id, new.title,
        'submitted an event for approval: “' || new.title || '”');
    end if;
  end if;
  return new;
end; $$;
drop trigger if exists trg_ann_approval_guard on public.announcements;
create trigger trg_ann_approval_guard before insert or update on public.announcements
  for each row execute function public.ann_approval_guard();

-- A Super Admin approves (live) or declines (back to pending) an event, notifying its author.
create or replace function public.approve_announcement(p_id uuid, p_approve boolean)
returns void language plpgsql security definer set search_path = public as $$
declare a public.announcements; me uuid := auth.uid(); my_name text;
begin
  if not public.can_manage_announcements() then
    raise exception 'Only a Super Admin can approve events';
  end if;
  select * into a from public.announcements where id = p_id;
  if a.id is null then raise exception 'Event not found'; end if;
  if p_approve then
    update public.announcements set approved_at = now(), approved_by = me where id = p_id;
  else
    update public.announcements set approved_at = null, approved_by = null where id = p_id;
  end if;
  if a.created_by is not null and a.created_by <> me then
    select coalesce(display_name, email) into my_name from public.profiles where user_id = me;
    insert into public.notifications
      (recipient, type, entity_type, entity_id, entity_title, actor, actor_name, message)
    values (a.created_by, case when p_approve then 'event_approved' else 'event_declined' end,
            'event', p_id, a.title, me, my_name,
            case when p_approve then 'Your event “' || a.title || '” was approved and is now live'
                 else 'Your event “' || a.title || '” needs changes before it can go live' end);
  end if;
end; $$;

commit;

notify pgrst, 'reload schema';
