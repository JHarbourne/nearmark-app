-- "Guided tour only" locations: hide a stop from Discover mode so it appears
-- ONLY while a user is following a guided tour that includes it. Some stops only
-- make sense in a narrated sequence and would be confusing out of context.
--
-- Default false, applied to every existing row — so no behaviour change until a
-- location is explicitly flagged in the admin.
--
-- Run in EACH Supabase project running the core (Tollesbury AND LGBT).
alter table public.locations
  add column if not exists guided_tour_only boolean not null default false;

notify pgrst, 'reload schema';
