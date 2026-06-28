-- Migration 006 — image caption + "further reading" links.
-- Paste into the Supabase SQL Editor and Run. Safe to re-run.

alter table public.locations add column if not exists caption text;  -- short visible caption under the image
alter table public.locations add column if not exists links   text;  -- "Label | https://url" per line (further reading / sources)
