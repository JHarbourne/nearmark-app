-- Migration 039 — richer announcements: an address + map pin (for directions, like a
-- location) and full image metadata (focal point, caption, credit) so an announcement
-- photo matches the story/location treatment. All additive & nullable. Run after 038.

begin;

alter table public.announcements
  add column if not exists address           text,
  add column if not exists lat               double precision,
  add column if not exists lng               double precision,
  add column if not exists image_caption     text,
  add column if not exists image_credit      text,
  add column if not exists image_credit_url  text,
  add column if not exists show_image_credit boolean not null default true,
  add column if not exists image_position    text;

commit;

notify pgrst, 'reload schema';
