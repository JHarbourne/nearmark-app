-- Migration 031 — notifications (Phase 2 of the back-office permissions spec).
-- See docs/backoffice-permissions-spec.md. Supersedes the parked draft 023
-- (renumbered; depends on 030 = profiles + created_by).
--
-- ⚠️ Run on STAGING first, verify, then EACH prod project once signed off.
--
-- Adds an in-app notification feed + edit-notify triggers: when a NON-owner edits a
-- location, OR edits a story belonging to a location they don't own, the location's
-- owner gets "Anita edited your location …". Tours don't notify (only owner + SA can
-- edit them). A de-dupe guard means one logical edit (which touches the location AND
-- its inline story) only produces ONE notification.

begin;

create table if not exists public.notifications (
  id           bigint generated always as identity primary key,
  recipient    uuid not null references auth.users(id) on delete cascade,
  type         text not null,   -- edit | delete_request | delete_approved | delete_declined | restored
  entity_type  text,            -- location | tour
  entity_id    uuid,
  entity_title text,
  actor        uuid references auth.users(id),
  actor_name   text,
  message      text not null,
  created_at   timestamptz not null default now(),
  read_at      timestamptz
);
create index if not exists notifications_recipient_idx
  on public.notifications (recipient, read_at, created_at desc);

alter table public.notifications enable row level security;

-- Recipients read their own and may mark them read; no one edits anyone else's.
drop policy if exists notif_select on public.notifications;
create policy notif_select on public.notifications for select to authenticated
  using (recipient = auth.uid());
drop policy if exists notif_update on public.notifications;
create policy notif_update on public.notifications for update to authenticated
  using (recipient = auth.uid()) with check (recipient = auth.uid());
-- Rows are created by SECURITY DEFINER triggers (which bypass RLS), so no INSERT
-- policy is granted to ordinary sessions.

-- Shared de-dupe: skip if this owner already has an unread 'edit' notification from
-- this same actor for this same entity in the last hour. Collapses the location +
-- inline-story double-fire, and rapid repeated saves, into a single notification.
create or replace function public.notify_owner_edit(owner_id uuid, loc_id uuid, loc_title text, body_verb text)
returns void language plpgsql security definer set search_path = public as $$
declare editor_name text;
begin
  if owner_id is null or owner_id = auth.uid() then return; end if;
  if exists (
    select 1 from public.notifications
    where recipient = owner_id and actor = auth.uid() and entity_id = loc_id
      and type = 'edit' and read_at is null and created_at > now() - interval '1 hour'
  ) then return; end if;
  select coalesce(display_name, email) into editor_name
    from public.profiles where user_id = auth.uid();
  insert into public.notifications
    (recipient, type, entity_type, entity_id, entity_title, actor, actor_name, message)
  values
    (owner_id, 'edit', 'location', loc_id, loc_title, auth.uid(), editor_name,
     coalesce(editor_name, 'Someone') || ' ' || body_verb || ' “' || loc_title || '”');
end; $$;

-- A non-owner edited a location.
create or replace function public.notify_owner_on_edit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.notify_owner_edit(new.created_by, new.id, new.title, 'edited your location');
  return new;
end; $$;
drop trigger if exists trg_locations_notify_edit on public.locations;
create trigger trg_locations_notify_edit after update on public.locations
  for each row execute function public.notify_owner_on_edit();

-- A non-owner edited a story → notify the parent location's owner.
create or replace function public.notify_owner_on_story_edit() returns trigger
language plpgsql security definer set search_path = public as $$
declare owner_id uuid; loc_title text;
begin
  select created_by, title into owner_id, loc_title
    from public.locations where id = new.location_id;
  perform public.notify_owner_edit(owner_id, new.location_id, loc_title, 'edited a story in your location');
  return new;
end; $$;
drop trigger if exists trg_stories_notify_edit on public.stories;
create trigger trg_stories_notify_edit after update on public.stories
  for each row execute function public.notify_owner_on_story_edit();

commit;

notify pgrst, 'reload schema';
