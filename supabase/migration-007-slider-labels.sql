-- Migration 007 — editable captions for the two before/after slider images
-- (replaces the hardcoded "Today" and the reused period field).
-- Paste into the Supabase SQL Editor and Run. Safe to re-run.

alter table public.locations add column if not exists historic_label text;  -- LEFT slider caption (the "before" image)
alter table public.locations add column if not exists image_label    text;  -- RIGHT slider caption (the hero image)
