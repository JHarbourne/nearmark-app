-- Migration 041 — explicit Data API grants (Supabase 2026-10-30 change).
--
-- From 2026-10-30 Supabase stops AUTOMATICALLY granting Data API (PostgREST /
-- supabase-js / GraphQL) access to new tables in the public schema. Our schema
-- and every earlier migration only ever set RLS policies — they never issued a
-- table GRANT, relying on that automatic grant. RLS alone is NOT enough: the API
-- needs BOTH a role grant AND an RLS policy, or it returns "permission denied".
--
-- Without this, after 2026-10-30: a fresh project built from these files, a
-- preview branch, a `supabase db reset`, or any NEW table added by a future
-- migration would be unreachable via the Data API. This makes the grants explicit
-- and durable. It does NOT widen exposure — RLS still governs which rows each role
-- can see; these grants only let the API reach the tables at all.
--
-- Grant model (matches our RLS: anon is read-only everywhere; anon writes go
-- through SECURITY DEFINER functions, which are granted separately):
--   • anon           → SELECT only
--   • authenticated  → SELECT, INSERT, UPDATE, DELETE
--   • service_role   → SELECT, INSERT, UPDATE, DELETE
--
-- Safe + idempotent: re-running only re-asserts the same grants.
-- ⚠️ Run on STAGING first, then EACH prod project.

-- 1) The API roles need to reach the schema at all.
grant usage on schema public to anon, authenticated, service_role;

-- 2) Grant on every table/sequence that ALREADY exists (covers a full rebuild,
--    where this migration runs after all the CREATE TABLE migrations).
grant select                         on all tables    in schema public to anon;
grant select, insert, update, delete on all tables    in schema public to authenticated, service_role;
grant usage, select                  on all sequences in schema public to anon, authenticated, service_role;

-- 3) Restore the auto-grant for tables created LATER by future migrations, so a
--    new feature's table is reachable without remembering to grant it by hand.
alter default privileges in schema public grant select                         on tables    to anon;
alter default privileges in schema public grant select, insert, update, delete on tables    to authenticated, service_role;
alter default privileges in schema public grant usage, select                  on sequences to anon, authenticated, service_role;

-- Tell PostgREST to reload so the new grants take effect immediately.
notify pgrst, 'reload schema';
