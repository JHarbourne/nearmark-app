-- Cover-credit visibility toggle (the tour-cover equivalent of migration-013).
-- A tour cover credit can be stored but hidden (show_cover_credit = false).
-- Existing rows default to true, so current behaviour is unchanged.
alter table public.tours
  add column if not exists show_cover_credit boolean not null default true;

notify pgrst, 'reload schema';
