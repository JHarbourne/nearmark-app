-- Nearmark – Supabase schema (content model + auth)
-- Run this in the Supabase SQL Editor (or via the migration script) on a fresh project.
-- Safe to re-run: uses IF NOT EXISTS / CREATE OR REPLACE where possible.

-- ── locations ──────────────────────────────────────────────────────────────
create table if not exists public.locations (
  id                 uuid primary key default gen_random_uuid(),
  slug               text unique not null,
  title              text not null,
  city               text default 'London',
  period             text,
  significance       text,
  summary            text,
  wiki_url           text,
  lat                double precision,
  lng                double precision,
  trigger_radius     integer default 80,
  hero_image_url     text,
  historic_image_url text,
  photo_credit       text,
  photo_credit_url   text,
  video_url          text,
  audio_url          text,
  audio_duration     integer default 0,
  thumbnail_url      text,
  hue                text,
  related_ids        text[] default '{}',
  tour_num           integer,
  status             text not null default 'draft' check (status in ('draft','published')),
  notes_internal     text,
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);

-- ── tours ──────────────────────────────────────────────────────────────────
create table if not exists public.tours (
  id                     uuid primary key default gen_random_uuid(),
  slug                   text unique not null,
  title                  text not null,
  city                   text default 'London',
  theme                  text,
  description            text,
  cover_image_url        text,
  status                 text not null default 'draft' check (status in ('draft','published')),
  stop_ids               text[] default '{}',   -- ordered location slugs
  duration_override_mins integer,
  created_at             timestamptz default now(),
  updated_at             timestamptz default now()
);

-- ── media (asset registry; files live in Storage) ──────────────────────────
create table if not exists public.media (
  id            uuid primary key default gen_random_uuid(),
  storage_url   text not null,
  type          text check (type in ('image','audio','video')),
  filename      text,
  size_bytes    bigint,
  width         integer,
  height        integer,
  duration_secs integer,
  created_at    timestamptz default now()
);

-- ── updated_at trigger ─────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists trg_locations_updated on public.locations;
create trigger trg_locations_updated before update on public.locations
  for each row execute function public.set_updated_at();

drop trigger if exists trg_tours_updated on public.tours;
create trigger trg_tours_updated before update on public.tours
  for each row execute function public.set_updated_at();

-- ── Row Level Security ─────────────────────────────────────────────────────
-- Public (anon key, used by the mobile app): read PUBLISHED records only.
-- Authenticated (admins logged in via Supabase Auth): full read/write.
alter table public.locations enable row level security;
alter table public.tours     enable row level security;
alter table public.media     enable row level security;

-- locations
drop policy if exists "anon read published locations" on public.locations;
create policy "anon read published locations" on public.locations
  for select to anon using (status = 'published');

drop policy if exists "auth full locations" on public.locations;
create policy "auth full locations" on public.locations
  for all to authenticated using (true) with check (true);

-- tours
drop policy if exists "anon read published tours" on public.tours;
create policy "anon read published tours" on public.tours
  for select to anon using (status = 'published');

drop policy if exists "auth full tours" on public.tours;
create policy "auth full tours" on public.tours
  for all to authenticated using (true) with check (true);

-- media (admin-only table; public gets URLs via locations)
drop policy if exists "auth full media" on public.media;
create policy "auth full media" on public.media
  for all to authenticated using (true) with check (true);

-- ── Storage bucket for uploaded photos/audio ───────────────────────────────
insert into storage.buckets (id, name, public)
  values ('media', 'media', true)
  on conflict (id) do nothing;

-- public can read files; authenticated can upload/update/delete
drop policy if exists "public read media files" on storage.objects;
create policy "public read media files" on storage.objects
  for select to anon, authenticated using (bucket_id = 'media');

drop policy if exists "auth write media files" on storage.objects;
create policy "auth write media files" on storage.objects
  for insert to authenticated with check (bucket_id = 'media');

drop policy if exists "auth update media files" on storage.objects;
create policy "auth update media files" on storage.objects
  for update to authenticated using (bucket_id = 'media');

drop policy if exists "auth delete media files" on storage.objects;
create policy "auth delete media files" on storage.objects
  for delete to authenticated using (bucket_id = 'media');

-- Admin accounts are created in Authentication → Users (no public signup).
-- Any authenticated user is treated as an admin for the pilot; add a roles
-- table later for Editor vs Super Admin (BRD §13).
