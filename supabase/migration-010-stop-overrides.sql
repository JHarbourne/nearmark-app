-- Migration 010 – per-tour stop overrides. A shared location can present with a
-- different title / short blurb within a given tour. JSON keyed by location slug:
--   { "<location-slug>": { "title": "...", "blurb": "..." }, ... }
-- The app falls back to the location's own title / summary when a key is absent.
-- Paste into the Supabase SQL Editor and Run. Safe to re-run.

alter table public.tours add column if not exists stop_overrides jsonb;
