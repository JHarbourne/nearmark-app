-- Migration 044 — a second (optional) image on an event, like a location's portrait.
-- Additive. Run on staging + both prod. Shown in the event page content, under the
-- description — a natural-aspect photo (not a cropped hero), so no focal point.

begin;

alter table public.announcements
  add column if not exists image2_url         text,
  add column if not exists image2_alt         text,
  add column if not exists image2_caption     text,
  add column if not exists image2_credit      text,
  add column if not exists image2_credit_url  text,
  add column if not exists show_image2_credit boolean not null default true;

commit;

notify pgrst, 'reload schema';
