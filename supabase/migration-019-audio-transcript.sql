-- Migration 019 — audio transcript (WCAG 1.2.1 – Audio-only, prerecorded)
-- A location with an audio narration should carry a plain-text transcript so the
-- content is available to people who can't hear it. Additive + idempotent.
-- Run in BOTH client projects (Tollesbury + LGBT History).

alter table public.locations
  add column if not exists transcript text;

-- refresh PostgREST's schema cache so the new column is exposed immediately
notify pgrst, 'reload schema';
