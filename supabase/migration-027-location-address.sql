-- Migration 027 — Location address field (Change 2, geocoding support).
-- Standalone and non-destructive: adds a nullable address to locations so the
-- admin can geocode (OpenStreetMap Nominatim) and drop the pin automatically.
-- Existing locations without an address keep working unchanged.
--
-- Independent of the Stories migrations (025/026) and the parked permissions
-- drafts (022–024) — safe to run on its own, in EACH project.

begin;

alter table public.locations add column if not exists address text;

commit;

notify pgrst, 'reload schema';
