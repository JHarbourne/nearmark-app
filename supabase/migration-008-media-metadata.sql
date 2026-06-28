-- Migration 008 — editable metadata for the Media Library (name, credit, licence).
-- Paste into the Supabase SQL Editor and Run. Safe to re-run.

alter table public.media add column if not exists photographer text;
alter table public.media add column if not exists license      text;
alter table public.media add column if not exists caption      text;

-- one metadata row per stored file; lets the Media Library upsert by URL
create unique index if not exists media_storage_url_key on public.media (storage_url);
