-- Stores the road/path-following walking route for a tour, computed once from a
-- directions service and drawn by the app (offline-friendly – no live API calls).
-- Shape: an array of [lat, lng] points (Leaflet order). Null = fall back to
-- straight lines between stops.
--
-- Run in EACH Supabase project running the core (Tollesbury AND LGBT).
alter table public.tours
  add column if not exists route_geometry jsonb;

notify pgrst, 'reload schema';
