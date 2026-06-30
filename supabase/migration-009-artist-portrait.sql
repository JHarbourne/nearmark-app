-- Migration 009 – in-body portrait image for a location (e.g. a photo of the
-- artist, shown within the story text, separate from the full-bleed hero).
-- Paste into the Supabase SQL Editor and Run. Safe to re-run.

alter table public.locations add column if not exists portrait_url     text;
alter table public.locations add column if not exists portrait_alt     text;
alter table public.locations add column if not exists portrait_caption text;
