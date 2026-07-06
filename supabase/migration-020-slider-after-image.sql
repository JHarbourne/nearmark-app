-- Migration 020 — separate the before/after slider's "after" image from the hero.
-- The hero (top of the story card) and the slider's "after"/today image used to be the
-- same field (hero_image_url), so a slider stop showed the same photo twice. This adds a
-- dedicated slider "after" image so the hero can be its own, independent lead photo.
-- Additive + idempotent. Run in BOTH client projects (Tollesbury + LGBT History).
-- No data change: where slider_after_url is blank the app falls back to hero_image_url,
-- so existing slider stops keep working until an editor gives them a distinct after photo.

alter table public.locations
  add column if not exists slider_after_url text,
  add column if not exists slider_after_position text default '50% 50%';

notify pgrst, 'reload schema';
