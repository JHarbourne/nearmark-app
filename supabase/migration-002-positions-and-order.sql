-- Migration 002 — photo focal points + tour ordering.
-- Paste into the Supabase SQL Editor and Run. Safe to re-run.

-- Focal point (CSS background/object-position, e.g. '50% 30%') so cropped
-- hero / historic photos keep the right part in view.
alter table public.locations add column if not exists hero_position     text default '50% 50%';
alter table public.locations add column if not exists historic_position text default '50% 50%';

-- Manual ordering for tours (drag-to-reorder in the admin; lower = higher up).
alter table public.tours add column if not exists sort_order integer default 0;
