-- Migration 005 — image alt text (WCAG 2.1 AA: 1.1.1 Non-text Content).
-- Paste into the Supabase SQL Editor and Run. Safe to re-run.

alter table public.locations add column if not exists image_alt    text;  -- hero / contemporary photo
alter table public.locations add column if not exists historic_alt  text;  -- before/after slider "before" image
alter table public.tours     add column if not exists cover_alt     text;  -- tour cover photo
