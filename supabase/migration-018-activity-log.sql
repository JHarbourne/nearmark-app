-- Persistent admin activity log: who created/updated/deleted what, and when.
-- Powers the Dashboard "Recent activity" feed so it survives refreshes and shows
-- other admins' actions (e.g. seeing whether a tester has been in and made changes).
--
-- Admin-only: authenticated users may read all and insert their own; the anon
-- (public app) role has no access.
--
-- Run in EACH Supabase project running the core (Tollesbury AND LGBT).
create table if not exists public.activity_log (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  actor      text,          -- email of the admin who acted
  action     text not null, -- e.g. "Updated location"
  target     text           -- e.g. the title acted on
);

create index if not exists activity_log_created_at_idx on public.activity_log (created_at desc);

alter table public.activity_log enable row level security;

drop policy if exists activity_log_select on public.activity_log;
create policy activity_log_select on public.activity_log
  for select to authenticated using (true);

drop policy if exists activity_log_insert on public.activity_log;
create policy activity_log_insert on public.activity_log
  for insert to authenticated with check (true);

notify pgrst, 'reload schema';
