-- Migration 029 — optional caption for a story's in-body (YouTube) video.
-- Additive + safe to run against the LIVE app: the column defaults to NULL and
-- the currently deployed app ignores it. Run this in EACH project (Tollesbury +
-- LGBT). See docs/FSD.md.

begin;

alter table public.stories add column if not exists video_caption text;

commit;

-- Tell PostgREST to reload its schema cache so the new column is exposed.
notify pgrst, 'reload schema';
