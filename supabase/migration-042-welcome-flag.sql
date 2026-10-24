-- Migration 042 — "welcomed" flag for the first-login Getting Started card.
-- Additive. Depends on 030 (profiles). Run on staging + each prod project.
--
-- A new editor should see a one-time Getting Started card the first time they open
-- the admin. We mark each profile once they've seen it. Existing profiles are
-- backfilled to now() so ONLY people invited from here on get the card — nobody who
-- already uses the backoffice is nagged.

begin;

alter table public.profiles add column if not exists welcomed_at timestamptz;

-- Everyone who already exists counts as already welcomed. New invitees get the
-- column's default (null) via the handle_new_user trigger, so only they see the card.
update public.profiles set welcomed_at = now() where welcomed_at is null;

-- The signed-in user stamps their OWN profile (SECURITY DEFINER, because the
-- profiles write policy is Super-Admin-only, so an editor can't update their row).
create or replace function public.mark_welcomed() returns void
language sql security definer set search_path = public as $$
  update public.profiles set welcomed_at = now()
  where user_id = auth.uid() and welcomed_at is null;
$$;

commit;

notify pgrst, 'reload schema';
