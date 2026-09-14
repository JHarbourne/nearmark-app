-- Migration 038 — Announcements ("What's on").
-- See docs/announcements-spec.md. A lightweight, standalone events table — cards on
-- the Tours list that open a simple event page (NOT a tour). Additive; safe to run
-- on any project (with or without RBAC applied).
--
-- Lifecycle: like a time-based tour it has a start and end time, but an announcement
-- disappears from the public list IMMEDIATELY after it ends (no takedown buffer).

begin;

create table if not exists public.announcements (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique not null,        -- event-page deep link: /?event=<slug>
  title        text not null,
  event_start  timestamptz,                 -- start date+time (null = evergreen notice)
  event_end    timestamptz,                 -- end date+time (optional; falls back to start)
  place        text,                        -- free text, e.g. "Parish Rooms"
  description  text,                        -- markdown-lite (same subset as story text)
  image_url    text,
  image_alt    text,
  link_url     text,                        -- optional "Book tickets" / Facebook event
  link_label   text,                        -- optional button label; blank → shows the host
  tour_slug    text,                        -- optional: an event that's also a walk → "Start the walk"
  status       text not null default 'draft' check (status in ('draft','published')),
  sort_order   int  not null default 0,
  created_by   uuid references auth.users(id),
  created_at   timestamptz not null default now()
);

-- Default created_by to the current user on insert (portable — no RBAC dependency).
create or replace function public.ann_set_created_by() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.created_by is null then new.created_by := auth.uid(); end if;
  return new;
end; $$;
drop trigger if exists trg_ann_created_by on public.announcements;
create trigger trg_ann_created_by before insert on public.announcements
  for each row execute function public.ann_set_created_by();

-- Who may manage announcements: the Super Admin where RBAC is applied, otherwise
-- any signed-in admin (full access, exactly as the rest of that project). Resolved
-- dynamically so the policy works whether or not is_super_admin() exists.
create or replace function public.can_manage_announcements() returns boolean
language plpgsql stable security definer set search_path = public as $$
declare sa boolean;
begin
  if to_regprocedure('public.is_super_admin()') is null then
    return true;                     -- no RBAC on this project
  end if;
  execute 'select public.is_super_admin()' into sa;
  return coalesce(sa, false);
end; $$;

alter table public.announcements enable row level security;

-- Public: only published, and only until the event ends (evergreen when no dates).
-- Hides the instant coalesce(event_end, event_start) passes — no buffer.
drop policy if exists ann_anon_read on public.announcements;
create policy ann_anon_read on public.announcements for select to anon
  using (
    status = 'published'
    and (coalesce(event_end, event_start) is null or coalesce(event_end, event_start) >= now())
  );

-- Admin: all signed-in admins can read; managers (SA / any admin off-RBAC) write.
drop policy if exists ann_auth_read on public.announcements;
create policy ann_auth_read on public.announcements for select to authenticated using (true);
drop policy if exists ann_write on public.announcements;
create policy ann_write on public.announcements for all to authenticated
  using (public.can_manage_announcements())
  with check (public.can_manage_announcements());

commit;

notify pgrst, 'reload schema';
