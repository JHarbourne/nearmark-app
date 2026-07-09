-- Migration 022 — RBAC + ownership (Phase 1 of the back-office permissions spec).
-- See docs/backoffice-permissions-spec.md.
--
-- ⚠️ DRAFT — DO NOT RUN during the feature freeze / test month. Staged so it is
--    ready to apply (in EACH project: Tollesbury AND LGBT) the moment sign-off lands.
--
-- What it does (all additive):
--   • profiles table (role + display_name), seeded with the Super Admin
--   • created_by / created_by_name ownership on locations & tours, backfilled to SA
--   • replaces the blanket "auth full" policies with per-action RLS
--   • tour editing locked to owner + Super Admin; location delete locked to owner + SA
--   • keeps created_by immutable
--
-- ⚙️ Before running, set the Super Admin email for THIS project:
\set super_admin_email 'jharbourne@mac.com'

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

update public.profiles
  set role = 'super_admin'
  where email = :'super_admin_email';

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
drop policy if exists "auth full locations" on public.locations;
create policy loc_select on public.locations for select to authenticated using (true);
create policy loc_insert on public.locations for insert to authenticated
  with check (created_by = auth.uid());
create policy loc_update on public.locations for update to authenticated
  using (true) with check (true);                     -- anyone edits (owner notified in Phase 2)
create policy loc_delete on public.locations for delete to authenticated
  using (is_super_admin() or created_by = auth.uid());

drop policy if exists "auth full tours" on public.tours;
create policy tour_select on public.tours for select to authenticated using (true);
create policy tour_insert on public.tours for insert to authenticated
  with check (created_by = auth.uid());
create policy tour_update on public.tours for update to authenticated
  using (is_super_admin() or created_by = auth.uid())
  with check (is_super_admin() or created_by = auth.uid());  -- owner + SA only
create policy tour_delete on public.tours for delete to authenticated
  using (is_super_admin() or created_by = auth.uid());

-- NOTE: the admin app must send created_by = auth.uid() (and created_by_name) on insert,
-- or add a BEFORE INSERT trigger to default it. Left explicit so the app stays in control.

commit;

notify pgrst, 'reload schema';
