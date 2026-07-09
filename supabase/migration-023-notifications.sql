-- Migration 023 — notifications (Phase 2 of the back-office permissions spec).
-- See docs/backoffice-permissions-spec.md.
--
-- ⚠️ DRAFT — DO NOT RUN during the freeze. Depends on 022 (profiles, created_by).
--    Run in EACH project (Tollesbury + LGBT) once signed off.
--
-- Adds an in-app notification feed and an edit-notify trigger: when a NON-owner
-- edits a location, its owner gets "Anita edited your location …". Tours don't
-- notify on edit (only owner + SA can edit them).

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
-- Rows are created by SECURITY DEFINER triggers/functions (which bypass RLS),
-- so no INSERT policy is granted to ordinary sessions.

-- Edit-notify: fire when a non-owner edits a location. (024 re-defines this to
-- also ignore archive/restore actions once the archived_at column exists.)
create or replace function public.notify_owner_on_edit() returns trigger
language plpgsql security definer set search_path = public as $$
declare editor_name text;
begin
  if new.created_by is not null
     and new.created_by <> auth.uid() then
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

drop trigger if exists trg_locations_notify_edit on public.locations;
create trigger trg_locations_notify_edit after update on public.locations
  for each row execute function public.notify_owner_on_edit();

commit;

notify pgrst, 'reload schema';
