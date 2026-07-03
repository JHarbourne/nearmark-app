-- Per-location text for the external "more information" link button. When blank,
-- the app falls back to the deployment default (VITE_STORY_LINK_LABEL, e.g.
-- "Visit the artist's website" for Tollesbury, "Read the full article" otherwise).
-- Lets a single stop say the right thing (e.g. a church vs an artist's studio).
--
-- Run in EACH Supabase project running the core (Tollesbury AND LGBT).
alter table public.locations
  add column if not exists link_label text;

notify pgrst, 'reload schema';
