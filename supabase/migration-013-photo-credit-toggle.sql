-- Photo-credit visibility toggle.
-- A credit can now be stored on a location but hidden in the app (show_photo_credit
-- = false). Existing rows default to true, so current behaviour is unchanged: a
-- credit shows whenever the text is present. Turn it off to keep the attribution
-- on record without displaying it.
alter table public.locations
  add column if not exists show_photo_credit boolean not null default true;

notify pgrst, 'reload schema';
