-- Migration 037 — editors may edit any stop in a tour they're assigned to.
-- See docs/backoffice-permissions-spec.md § "Per-tour scoping".
-- Builds on 036. The 2026-09-13 decision: an assigned editor should be able to
-- edit the content of every stop in their tour, not only the locations they own —
-- so a team can build/maintain a shared tour together.
--
-- ⚠️ Run on STAGING first, then each prod project where 036 is already applied.
--
-- What changes: editability now MATCHES visibility. If a location is a stop in a
-- tour you're assigned to (or you own it), you can edit it and its stories.
--   • This is safe: sharing a location INTO a tour is still SA-only (the
--     enforce_stop_ownership trigger blocks a non-SA adding a slug they don't own),
--     so "edit any stop in my tour" can only ever reach locations the SA chose to
--     put there, or ones the editor created.
--   • created_by stays immutable (freeze trigger), so editing never changes ownership.
--   • DELETE is unchanged — still owner + SA only (deletion is the destructive one;
--     the soft-delete/archive workflow is a later phase).

begin;

-- LOCATIONS — editable by SA, the owner, or any assigned editor whose tour it's in.
drop policy if exists loc_update on public.locations;
create policy loc_update on public.locations for update to authenticated
  using (is_super_admin() or created_by = auth.uid() or slug_in_my_tours(slug))
  with check (is_super_admin() or created_by = auth.uid() or slug_in_my_tours(slug));

-- STORIES — editable whenever the caller can see (and now edit) the parent location.
drop policy if exists story_update on public.stories;
create policy story_update on public.stories for update to authenticated
  using (can_see_location_id(location_id))
  with check (can_see_location_id(location_id));

-- STORIES — a story can be added to any location the caller can edit (own or in-tour).
drop policy if exists story_insert on public.stories;
create policy story_insert on public.stories for insert to authenticated
  with check (can_see_location_id(location_id));

commit;

notify pgrst, 'reload schema';
