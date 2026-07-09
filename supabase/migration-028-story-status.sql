-- Migration 028 — per-story draft/published status (hide a story like a location).
-- Additive + safe to run against the LIVE app: existing stories default to
-- 'published' (nothing hides), and the current deployed app ignores the new
-- column. Run this in EACH project (Tollesbury + LGBT) BEFORE the app update that
-- reads/writes it. See docs/FSD.md.

begin;

alter table public.stories add column if not exists status text not null default 'published'
  check (status in ('draft','published'));

-- A story is public only when it is published AND its parent location is publicly
-- visible (event window / consent inherited via the shared helper from 025).
drop policy if exists "anon read stories of public locations" on public.stories;
create policy "anon read stories of public locations" on public.stories
  for select to anon using (
    status = 'published'
    and exists (
      select 1 from public.locations l
      where l.id = stories.location_id
        and public.location_visible_to_anon(l)
    )
  );

commit;

notify pgrst, 'reload schema';
