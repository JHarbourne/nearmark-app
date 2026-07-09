-- Migration 026 — Stories layer, step 2 of 2: drop the moved content columns.
--
-- ⚠️ DESTRUCTIVE and IRREVERSIBLE. Run ONLY when ALL of these are true:
--    1. Migration 025 ran and the VERIFY query showed locations_without_a_story = 0.
--    2. The updated app (reading/writing stories, not location content) is DEPLOYED.
--    3. You have taken a Supabase backup / point-in-time snapshot.
-- Until then the current app still needs these columns, so DO NOT run this early.
--
-- Keeps on locations: id, slug, title, city, lat, lng, trigger_radius, status,
--   guided_tour_only, address, created_at, updated_at, tour_num, and the privacy
--   block (visibility, publish_from/until, consent_*, coarse_pin).

begin;

alter table public.locations
  drop column if exists period,
  drop column if exists significance,
  drop column if exists summary,
  drop column if exists wiki_url,
  drop column if exists link_label,
  drop column if exists hero_image_url,
  drop column if exists hero_position,
  drop column if exists image_alt,
  drop column if exists image_label,
  drop column if exists photo_credit,
  drop column if exists photo_credit_url,
  drop column if exists show_photo_credit,
  drop column if exists historic_image_url,
  drop column if exists historic_position,
  drop column if exists historic_alt,
  drop column if exists historic_label,
  drop column if exists historic_credit,
  drop column if exists historic_credit_url,
  drop column if exists video_url,
  drop column if exists audio_url,
  drop column if exists audio_duration,
  drop column if exists transcript,
  drop column if exists thumbnail_url,
  drop column if exists hue,
  drop column if exists related_ids,
  drop column if exists caption,
  drop column if exists links,
  drop column if exists portrait_url,
  drop column if exists portrait_alt,
  drop column if exists portrait_caption,
  drop column if exists portrait_credit,
  drop column if exists portrait_credit_url,
  drop column if exists slider_after_url,
  drop column if exists slider_after_position,
  drop column if exists notes_internal;

commit;

notify pgrst, 'reload schema';
