-- Migration 025 — Stories layer (Tour → Location → Story), step 1 of 2.
-- Creates the stories table, backfills one story per existing location, adds RLS.
-- This is ADDITIVE and safe: the current app keeps reading the location content
-- columns (still present) until the app is switched over and migration 026 drops them.
--
-- Independent of the parked permissions drafts (022–024) — does NOT require them.
-- Run in EACH project (Tollesbury + LGBT), then verify the backfill (query at bottom),
-- THEN switch the app over, and only afterwards run 026.
--
-- ⚠️ Review before running. Nothing here is destructive.

begin;

-- ── stories ──────────────────────────────────────────────────────────────────
create table if not exists public.stories (
  id                    uuid primary key default gen_random_uuid(),
  location_id           uuid not null references public.locations(id) on delete cascade,
  sort_order            integer not null default 1,
  heading               text,                 -- the story's own title (was location.title)
  period                text,
  significance          text,
  summary               text,
  wiki_url              text,
  link_label            text,
  hero_image_url        text,
  hero_position         text default '50% 50%',
  image_alt             text,
  image_label           text,
  hero_credit           text,                 -- renamed from locations.photo_credit
  hero_credit_url       text,
  show_hero_credit      boolean not null default false,
  historic_image_url    text,
  historic_position     text default '50% 50%',
  historic_alt          text,
  historic_label        text,
  historic_credit       text,
  historic_credit_url   text,
  video_url             text,
  audio_url             text,
  audio_duration_secs   integer default 0,    -- renamed from locations.audio_duration
  transcript            text,
  thumbnail_url         text,
  hue                   text,
  related_ids           text[] default '{}',
  caption               text,
  links                 text,                 -- "Label | https://url" per line
  portrait_url          text,
  portrait_alt          text,
  portrait_caption      text,
  portrait_credit       text,
  portrait_credit_url   text,
  slider_after_url      text,
  slider_after_position text default '50% 50%',
  notes_internal        text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists stories_location_idx on public.stories (location_id, sort_order);

-- keep updated_at fresh (reuses the existing helper from schema.sql)
drop trigger if exists trg_stories_updated on public.stories;
create trigger trg_stories_updated before update on public.stories
  for each row execute function public.set_updated_at();

-- ── backfill: one story per location, carrying all current content ───────────
-- Guarded so re-running does nothing (only fills locations that have no story yet).
insert into public.stories (
  location_id, sort_order, heading,
  period, significance, summary, wiki_url, link_label,
  hero_image_url, hero_position, image_alt, image_label, hero_credit, hero_credit_url, show_hero_credit,
  historic_image_url, historic_position, historic_alt, historic_label, historic_credit, historic_credit_url,
  video_url, audio_url, audio_duration_secs, transcript, thumbnail_url, hue, related_ids,
  caption, links, portrait_url, portrait_alt, portrait_caption, portrait_credit, portrait_credit_url,
  slider_after_url, slider_after_position, notes_internal, created_at, updated_at
)
select
  l.id, 1, l.title,
  l.period, l.significance, l.summary, l.wiki_url, l.link_label,
  l.hero_image_url, l.hero_position, l.image_alt, l.image_label, l.photo_credit, l.photo_credit_url, l.show_photo_credit,
  l.historic_image_url, l.historic_position, l.historic_alt, l.historic_label, l.historic_credit, l.historic_credit_url,
  l.video_url, l.audio_url, l.audio_duration, l.transcript, l.thumbnail_url, l.hue, l.related_ids,
  l.caption, l.links, l.portrait_url, l.portrait_alt, l.portrait_caption, l.portrait_credit, l.portrait_credit_url,
  l.slider_after_url, l.slider_after_position, l.notes_internal, l.created_at, l.updated_at
from public.locations l
where not exists (select 1 from public.stories s where s.location_id = l.id);

-- ── shared visibility helper (event-window inheritance, matches migration 012) ─
-- Single source of truth for "is this location visible to the public right now",
-- so the locations policy and the stories policy can never drift apart.
create or replace function public.location_visible_to_anon(l public.locations)
returns boolean language sql stable as $$
  select l.status = 'published' and (
    -- public landmarks: live all year (within an optional own window)
    ( l.visibility = 'public'
      and (l.publish_from  is null or now() >= l.publish_from)
      and (l.publish_until is null or now() <= l.publish_until) )
    or
    -- private addresses: consented, and within an effective window …
    ( l.visibility = 'private' and l.consent_given = true and (
        -- (a) an explicit per-location override window is set → use it
        ( (l.publish_from is not null or l.publish_until is not null)
          and (l.publish_from  is null or now() >= l.publish_from)
          and (l.publish_until is null or now() <= l.publish_until) )
        or
        -- (b) no own window → inherit from a live published event it is a stop in
        ( l.publish_from is null and l.publish_until is null
          and exists (
            select 1 from public.tours t
            where t.status = 'published'
              and l.slug = any (t.stop_ids)
              and (t.event_start is null or now() >= t.event_start)
              and (t.takedown_at is null or now() <= t.takedown_at) ) )
      ) )
  );
$$;

-- Repoint the locations anon policy to the shared helper (identical logic to 012).
drop policy if exists "anon read published locations" on public.locations;
create policy "anon read published locations" on public.locations
  for select to anon using (public.location_visible_to_anon(locations));

-- ── RLS: a story is public exactly when its parent location is public ────────
alter table public.stories enable row level security;

drop policy if exists "anon read stories of public locations" on public.stories;
create policy "anon read stories of public locations" on public.stories
  for select to anon using (
    exists (select 1 from public.locations l
            where l.id = stories.location_id
              and public.location_visible_to_anon(l))
  );

drop policy if exists "auth full stories" on public.stories;
create policy "auth full stories" on public.stories
  for all to authenticated using (true) with check (true);

commit;

notify pgrst, 'reload schema';

-- ── VERIFY after running (expect every location to have >=1 story, counts equal):
-- select
--   (select count(*) from public.locations) as locations,
--   (select count(*) from public.stories)   as stories,
--   (select count(*) from public.locations l
--      where not exists (select 1 from public.stories s where s.location_id = l.id)) as locations_without_a_story;
-- Spot-check a couple: select heading, left(summary,60), hero_image_url, hue from public.stories order by created_at limit 5;
