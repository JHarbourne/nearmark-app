-- Migration 030 — RBAC + ownership (Phase 1 of the back-office permissions spec).
-- See docs/backoffice-permissions-spec.md.  Supersedes the parked draft 022
-- (renumbered because 022–024 collide with the shipped stories migrations 025–027).
--
-- ⚠️ Run on STAGING first (nearmark-staging), verify, then EACH prod project
--    (Tollesbury AND LGBT) once signed off. All additive.
--
-- What it does:
--   • profiles table (role + display_name), seeded with the Super Admin
--   • created_by / created_by_name ownership on locations & tours, backfilled to SA
--   • a BEFORE INSERT trigger defaults created_by = auth.uid() (so the app needs no
--     change and inserts can't be spoofed) — this is what makes the migration safe to
--     run standalone: without it the new insert RLS would reject the current app.
--   • replaces the blanket "auth full" policies with per-action RLS on
--     locations / stories / tours (media & activity_log keep their blanket policies)
--   • tour editing locked to owner + Super Admin; location & story delete locked to
--     the (parent-)location owner + SA; stories otherwise follow their location
--   • keeps created_by immutable
--
-- ⚙️ Set the Super Admin email for THIS project on the one marked line below
--    (plain literal — the Supabase SQL Editor doesn't support psql \set):
--      staging  → 'staging@nearmark.co.uk'
--      prod     → 'jharbourne@mac.com'

begin;

-- ── profiles ────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  email        text,
  display_name text,
  role         text not null default 'editor' check (role in ('editor','super_admin')),
  created_at   timestamptz not null default now()
);

-- Seed a profile for every existing auth user (default editor), then promote the SA.
insert into public.profiles (user_id, email, display_name, role)
  select id, email, coalesce(raw_user_meta_data->>'name', split_part(email,'@',1)), 'editor'
  from auth.users
  on conflict (user_id) do nothing;

-- 👇 EDIT THIS EMAIL for the project you're running against (staging vs prod).
update public.profiles
  set role = 'super_admin'
  where email = 'staging@nearmark.co.uk';

-- Keep profiles in step as new admins are invited.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id, email, display_name, role)
  values (new.id, new.email,
          coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)), 'editor')
  on conflict (user_id) do nothing;
  return new;
end; $$;
drop trigger if exists trg_auth_user_created on auth.users;
create trigger trg_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Role helper (SECURITY DEFINER → no RLS recursion on profiles).
create or replace function public.is_super_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles
                 where user_id = auth.uid() and role = 'super_admin');
$$;

alter table public.profiles enable row level security;
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated using (true);
drop policy if exists profiles_sa_write on public.profiles;
create policy profiles_sa_write on public.profiles for all to authenticated
  using (is_super_admin()) with check (is_super_admin());

-- ── ownership columns ────────────────────────────────────────────────────────
alter table public.locations add column if not exists created_by uuid references auth.users(id);
alter table public.locations add column if not exists created_by_name text;
alter table public.tours     add column if not exists created_by uuid references auth.users(id);
alter table public.tours     add column if not exists created_by_name text;

-- Backfill existing rows to the Super Admin so nothing is left unowned.
do $$
declare sa_id uuid; sa_name text;
begin
  select user_id, coalesce(display_name, email) into sa_id, sa_name
  from public.profiles where role = 'super_admin' order by created_at limit 1;
  if sa_id is not null then
    update public.locations set created_by = sa_id, created_by_name = sa_name where created_by is null;
    update public.tours     set created_by = sa_id, created_by_name = sa_name where created_by is null;
  end if;
end $$;

-- Default ownership on insert: set created_by to the current user (and snapshot their
-- display name) when the app doesn't supply it. Runs BEFORE the insert RLS with-check,
-- so the app needs no change and created_by can't be forged to someone else.
create or replace function public.set_created_by() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.created_by is null then
    new.created_by := auth.uid();
  end if;
  if new.created_by_name is null then
    select coalesce(display_name, email) into new.created_by_name
    from public.profiles where user_id = new.created_by;
  end if;
  return new;
end; $$;
drop trigger if exists trg_locations_set_owner on public.locations;
create trigger trg_locations_set_owner before insert on public.locations
  for each row execute function public.set_created_by();
drop trigger if exists trg_tours_set_owner on public.tours;
create trigger trg_tours_set_owner before insert on public.tours
  for each row execute function public.set_created_by();

-- created_by is immutable once set.
create or replace function public.freeze_created_by() returns trigger
language plpgsql as $$
begin
  if new.created_by is distinct from old.created_by then
    new.created_by := old.created_by;
    new.created_by_name := old.created_by_name;
  end if;
  return new;
end; $$;
drop trigger if exists trg_locations_freeze_owner on public.locations;
create trigger trg_locations_freeze_owner before update on public.locations
  for each row execute function public.freeze_created_by();
drop trigger if exists trg_tours_freeze_owner on public.tours;
create trigger trg_tours_freeze_owner before update on public.tours
  for each row execute function public.freeze_created_by();

-- ── RLS: replace blanket "auth full …" with per-action policies ──────────────
-- LOCATIONS — anyone edits (owner notified in Phase 2); owner/SA delete.
drop policy if exists "auth full locations" on public.locations;
drop policy if exists loc_select on public.locations;
drop policy if exists loc_insert on public.locations;
drop policy if exists loc_update on public.locations;
drop policy if exists loc_delete on public.locations;
create policy loc_select on public.locations for select to authenticated using (true);
create policy loc_insert on public.locations for insert to authenticated
  with check (created_by = auth.uid());
create policy loc_update on public.locations for update to authenticated
  using (true) with check (true);
create policy loc_delete on public.locations for delete to authenticated
  using (is_super_admin() or created_by = auth.uid());

-- STORIES — content within a location; inherit the parent location's rules.
drop policy if exists "auth full stories" on public.stories;
drop policy if exists story_select on public.stories;
drop policy if exists story_insert on public.stories;
drop policy if exists story_update on public.stories;
drop policy if exists story_delete on public.stories;
create policy story_select on public.stories for select to authenticated using (true);
create policy story_insert on public.stories for insert to authenticated with check (true);
create policy story_update on public.stories for update to authenticated
  using (true) with check (true);
create policy story_delete on public.stories for delete to authenticated
  using (is_super_admin() or exists (
    select 1 from public.locations l
    where l.id = stories.location_id and l.created_by = auth.uid()));

-- TOURS — edit + delete locked to owner + SA.
drop policy if exists "auth full tours" on public.tours;
drop policy if exists tour_select on public.tours;
drop policy if exists tour_insert on public.tours;
drop policy if exists tour_update on public.tours;
drop policy if exists tour_delete on public.tours;
create policy tour_select on public.tours for select to authenticated using (true);
create policy tour_insert on public.tours for insert to authenticated
  with check (created_by = auth.uid());
create policy tour_update on public.tours for update to authenticated
  using (is_super_admin() or created_by = auth.uid())
  with check (is_super_admin() or created_by = auth.uid());
create policy tour_delete on public.tours for delete to authenticated
  using (is_super_admin() or created_by = auth.uid());

commit;

notify pgrst, 'reload schema';
