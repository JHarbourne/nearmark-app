-- ============================================================================
-- nearmark-staging bootstrap — reproduces CURRENT production schema.
-- Paste into the Supabase SQL Editor of the nearmark-staging project and Run.
-- = schema.sql + migrations 002..029, EXCLUDING the RBAC drafts 022/023/024
--   (those were never run on prod and are being reworked as 030+ for the stories layer).
-- Safe on a fresh empty project. Idempotent-ish (IF NOT EXISTS / drop-if-exists).
-- ============================================================================

-- ===== schema.sql =====
-- Nearmark – Supabase schema (content model + auth)
-- Run this in the Supabase SQL Editor (or via the migration script) on a fresh project.
-- Safe to re-run: uses IF NOT EXISTS / CREATE OR REPLACE where possible.

-- ── locations ──────────────────────────────────────────────────────────────
create table if not exists public.locations (
  id                 uuid primary key default gen_random_uuid(),
  slug               text unique not null,
  title              text not null,
  city               text default 'London',
  period             text,
  significance       text,
  summary            text,
  wiki_url           text,
  lat                double precision,
  lng                double precision,
  trigger_radius     integer default 80,
  hero_image_url     text,
  historic_image_url text,
  photo_credit       text,
  photo_credit_url   text,
  video_url          text,
  audio_url          text,
  audio_duration     integer default 0,
  thumbnail_url      text,
  hue                text,
  related_ids        text[] default '{}',
  tour_num           integer,
  status             text not null default 'draft' check (status in ('draft','published')),
  notes_internal     text,
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);

-- ── tours ──────────────────────────────────────────────────────────────────
create table if not exists public.tours (
  id                     uuid primary key default gen_random_uuid(),
  slug                   text unique not null,
  title                  text not null,
  city                   text default 'London',
  theme                  text,
  description            text,
  cover_image_url        text,
  status                 text not null default 'draft' check (status in ('draft','published')),
  stop_ids               text[] default '{}',   -- ordered location slugs
  duration_override_mins integer,
  created_at             timestamptz default now(),
  updated_at             timestamptz default now()
);

-- ── media (asset registry; files live in Storage) ──────────────────────────
create table if not exists public.media (
  id            uuid primary key default gen_random_uuid(),
  storage_url   text not null,
  type          text check (type in ('image','audio','video')),
  filename      text,
  size_bytes    bigint,
  width         integer,
  height        integer,
  duration_secs integer,
  created_at    timestamptz default now()
);

-- ── updated_at trigger ─────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists trg_locations_updated on public.locations;
create trigger trg_locations_updated before update on public.locations
  for each row execute function public.set_updated_at();

drop trigger if exists trg_tours_updated on public.tours;
create trigger trg_tours_updated before update on public.tours
  for each row execute function public.set_updated_at();

-- ── Row Level Security ─────────────────────────────────────────────────────
-- Public (anon key, used by the mobile app): read PUBLISHED records only.
-- Authenticated (admins logged in via Supabase Auth): full read/write.
alter table public.locations enable row level security;
alter table public.tours     enable row level security;
alter table public.media     enable row level security;

-- locations
drop policy if exists "anon read published locations" on public.locations;
create policy "anon read published locations" on public.locations
  for select to anon using (status = 'published');

drop policy if exists "auth full locations" on public.locations;
create policy "auth full locations" on public.locations
  for all to authenticated using (true) with check (true);

-- tours
drop policy if exists "anon read published tours" on public.tours;
create policy "anon read published tours" on public.tours
  for select to anon using (status = 'published');

drop policy if exists "auth full tours" on public.tours;
create policy "auth full tours" on public.tours
  for all to authenticated using (true) with check (true);

-- media (admin-only table; public gets URLs via locations)
drop policy if exists "auth full media" on public.media;
create policy "auth full media" on public.media
  for all to authenticated using (true) with check (true);

-- ── Storage bucket for uploaded photos/audio ───────────────────────────────
insert into storage.buckets (id, name, public)
  values ('media', 'media', true)
  on conflict (id) do nothing;

-- public can read files; authenticated can upload/update/delete
drop policy if exists "public read media files" on storage.objects;
create policy "public read media files" on storage.objects
  for select to anon, authenticated using (bucket_id = 'media');

drop policy if exists "auth write media files" on storage.objects;
create policy "auth write media files" on storage.objects
  for insert to authenticated with check (bucket_id = 'media');

drop policy if exists "auth update media files" on storage.objects;
create policy "auth update media files" on storage.objects
  for update to authenticated using (bucket_id = 'media');

drop policy if exists "auth delete media files" on storage.objects;
create policy "auth delete media files" on storage.objects
  for delete to authenticated using (bucket_id = 'media');

-- Admin accounts are created in Authentication → Users (no public signup).
-- Any authenticated user is treated as an admin for the pilot; add a roles
-- table later for Editor vs Super Admin (BRD §13).



-- ===== migration-002-positions-and-order.sql =====
-- Migration 002 — photo focal points + tour ordering.
-- Paste into the Supabase SQL Editor and Run. Safe to re-run.

-- Focal point (CSS background/object-position, e.g. '50% 30%') so cropped
-- hero / historic photos keep the right part in view.
alter table public.locations add column if not exists hero_position     text default '50% 50%';
alter table public.locations add column if not exists historic_position text default '50% 50%';

-- Manual ordering for tours (drag-to-reorder in the admin; lower = higher up).
alter table public.tours add column if not exists sort_order integer default 0;


-- ===== migration-003-tour-cover.sql =====
-- Migration 003 — tour cover focal point + photo credit.
-- Paste into the Supabase SQL Editor and Run. Safe to re-run.

alter table public.tours add column if not exists cover_position   text default '50% 50%';
alter table public.tours add column if not exists cover_credit      text;
alter table public.tours add column if not exists cover_credit_url  text;


-- ===== migration-004-historic-credit.sql =====
-- Migration 004 — separate credit for the historic (before) slider image.
-- Paste into the Supabase SQL Editor and Run. Safe to re-run.

alter table public.locations add column if not exists historic_credit     text;
alter table public.locations add column if not exists historic_credit_url text;


-- ===== migration-005-alt-text.sql =====
-- Migration 005 — image alt text (WCAG 2.1 AA: 1.1.1 Non-text Content).
-- Paste into the Supabase SQL Editor and Run. Safe to re-run.

alter table public.locations add column if not exists image_alt    text;  -- hero / contemporary photo
alter table public.locations add column if not exists historic_alt  text;  -- before/after slider "before" image
alter table public.tours     add column if not exists cover_alt     text;  -- tour cover photo


-- ===== migration-006-caption-links.sql =====
-- Migration 006 — image caption + "further reading" links.
-- Paste into the Supabase SQL Editor and Run. Safe to re-run.

alter table public.locations add column if not exists caption text;  -- short visible caption under the image
alter table public.locations add column if not exists links   text;  -- "Label | https://url" per line (further reading / sources)


-- ===== migration-007-slider-labels.sql =====
-- Migration 007 — editable captions for the two before/after slider images
-- (replaces the hardcoded "Today" and the reused period field).
-- Paste into the Supabase SQL Editor and Run. Safe to re-run.

alter table public.locations add column if not exists historic_label text;  -- LEFT slider caption (the "before" image)
alter table public.locations add column if not exists image_label    text;  -- RIGHT slider caption (the hero image)


-- ===== migration-008-media-metadata.sql =====
-- Migration 008 — editable metadata for the Media Library (name, credit, licence).
-- Paste into the Supabase SQL Editor and Run. Safe to re-run.

alter table public.media add column if not exists photographer text;
alter table public.media add column if not exists license      text;
alter table public.media add column if not exists caption      text;

-- one metadata row per stored file; lets the Media Library upsert by URL
create unique index if not exists media_storage_url_key on public.media (storage_url);


-- ===== migration-009-artist-portrait.sql =====
-- Migration 009 – in-body portrait image for a location (e.g. a photo of the
-- artist, shown within the story text, separate from the full-bleed hero).
-- Paste into the Supabase SQL Editor and Run. Safe to re-run.

alter table public.locations add column if not exists portrait_url     text;
alter table public.locations add column if not exists portrait_alt     text;
alter table public.locations add column if not exists portrait_caption text;


-- ===== migration-010-stop-overrides.sql =====
-- Migration 010 – per-tour stop overrides. A shared location can present with a
-- different title / short blurb within a given tour. JSON keyed by location slug:
--   { "<location-slug>": { "title": "...", "blurb": "..." }, ... }
-- The app falls back to the location's own title / summary when a key is absent.
-- Paste into the Supabase SQL Editor and Run. Safe to re-run.

alter table public.tours add column if not exists stop_overrides jsonb;


-- ===== migration-011-privacy-publication.sql =====
-- Migration 011 – privacy, publication windows & consent (UK GDPR by design).
-- Private residential addresses (open studios/gardens) are only public for a
-- limited window around an event and require recorded consent. Paste into the
-- Supabase SQL Editor and Run. Safe to re-run.

-- ── locations: visibility + publication window + consent record ──────────────
alter table public.locations add column if not exists visibility text not null default 'public'
  check (visibility in ('public','private'));
alter table public.locations add column if not exists publish_from  timestamptz;
alter table public.locations add column if not exists publish_until timestamptz;
alter table public.locations add column if not exists consent_given boolean not null default false;
alter table public.locations add column if not exists consent_recorded_at    timestamptz;
alter table public.locations add column if not exists consent_recorded_by    text; -- admin email
alter table public.locations add column if not exists consent_notice_version text; -- privacy-notice version agreed
alter table public.locations add column if not exists consent_contact        text; -- resident name/email (record only)
alter table public.locations add column if not exists coarse_pin boolean not null default false; -- snap private pin to street level

-- ── tours (an "event"): window + auto take-down ──────────────────────────────
alter table public.tours add column if not exists event_start timestamptz;
alter table public.tours add column if not exists event_end   timestamptz;
alter table public.tours add column if not exists takedown_at timestamptz; -- default event_end + 7d, editable

-- ── consent gate: a private location can't be PUBLISHED without recorded consent
create or replace function public.enforce_location_consent()
returns trigger language plpgsql as $$
begin
  if new.visibility = 'private' and new.status = 'published'
     and coalesce(new.consent_given, false) = false then
    raise exception 'A private location cannot be published without recorded consent (consent_given = true).';
  end if;
  return new;
end;
$$;
drop trigger if exists trg_locations_consent on public.locations;
create trigger trg_locations_consent before insert or update on public.locations
  for each row execute function public.enforce_location_consent();

-- ── RLS (the real boundary): the public/anon role sees a location only when it
--    is published, inside its window, and — if private — consented. ──
drop policy if exists "anon read published locations" on public.locations;
create policy "anon read published locations" on public.locations
  for select to anon using (
    status = 'published'
    and (publish_from  is null or now() >= publish_from)
    and (publish_until is null or now() <= publish_until)
    and (visibility = 'public' or consent_given = true)
  );

-- A tour disappears the moment it passes its take-down date.
drop policy if exists "anon read published tours" on public.tours;
create policy "anon read published tours" on public.tours
  for select to anon using (
    status = 'published'
    and (takedown_at is null or now() <= takedown_at)
  );
-- (Authenticated admins keep the existing "auth full …" policies: they see and
--  manage every record regardless of window/consent.)


-- ===== migration-012-event-window-inheritance.sql =====
-- Migration 012 – private locations inherit their event's publication window.
-- The dates live on the event (tour): a private address is shown only when it is
-- published, consented, and either (a) its own override window is live, or (b) it
-- is a stop in at least one published event whose window is live now. Fail-safe:
-- a private address in no live event and with no own dates is hidden.
-- Public landmarks are unaffected. Paste into the Supabase SQL Editor and Run.
-- Safe to re-run.

drop policy if exists "anon read published locations" on public.locations;
create policy "anon read published locations" on public.locations
  for select to anon using (
    status = 'published' and (
      -- public landmarks: live all year (within an optional own window)
      ( visibility = 'public'
        and (publish_from  is null or now() >= publish_from)
        and (publish_until is null or now() <= publish_until) )
      or
      -- private addresses: must be consented, and within an effective window
      ( visibility = 'private' and consent_given = true and (
          -- (a) an explicit per-location override window is set → use it
          ( (publish_from is not null or publish_until is not null)
            and (publish_from  is null or now() >= publish_from)
            and (publish_until is null or now() <= publish_until) )
          or
          -- (b) no own window → inherit from a live event it's a stop in
          ( publish_from is null and publish_until is null
            and exists (
              select 1 from public.tours t
              where t.status = 'published'
                and locations.slug = any (t.stop_ids)
                and (t.event_start is null or now() >= t.event_start)
                and (t.takedown_at is null or now() <= t.takedown_at)
            ) )
        ) )
    )
  );


-- ===== migration-013-photo-credit-toggle.sql =====
-- Photo-credit visibility toggle.
-- A credit can now be stored on a location but hidden in the app (show_photo_credit
-- = false). Existing rows default to true, so current behaviour is unchanged: a
-- credit shows whenever the text is present. Turn it off to keep the attribution
-- on record without displaying it.
alter table public.locations
  add column if not exists show_photo_credit boolean not null default true;

notify pgrst, 'reload schema';


-- ===== migration-014-cover-credit-toggle.sql =====
-- Cover-credit visibility toggle (the tour-cover equivalent of migration-013).
-- A tour cover credit can be stored but hidden (show_cover_credit = false).
-- Existing rows default to true, so current behaviour is unchanged.
alter table public.tours
  add column if not exists show_cover_credit boolean not null default true;

notify pgrst, 'reload schema';


-- ===== migration-015-guided-tour-only.sql =====
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


-- ===== migration-016-link-label.sql =====
-- Per-location text for the external "more information" link button. When blank,
-- the app falls back to the deployment default (VITE_STORY_LINK_LABEL, e.g.
-- "Visit the artist's website" for Tollesbury, "Read the full article" otherwise).
-- Lets a single stop say the right thing (e.g. a church vs an artist's studio).
--
-- Run in EACH Supabase project running the core (Tollesbury AND LGBT).
alter table public.locations
  add column if not exists link_label text;

notify pgrst, 'reload schema';


-- ===== migration-017-route-geometry.sql =====
-- Stores the road/path-following walking route for a tour, computed once from a
-- directions service and drawn by the app (offline-friendly – no live API calls).
-- Shape: an array of [lat, lng] points (Leaflet order). Null = fall back to
-- straight lines between stops.
--
-- Run in EACH Supabase project running the core (Tollesbury AND LGBT).
alter table public.tours
  add column if not exists route_geometry jsonb;

notify pgrst, 'reload schema';


-- ===== migration-018-activity-log.sql =====
-- Persistent admin activity log: who created/updated/deleted what, and when.
-- Powers the Dashboard "Recent activity" feed so it survives refreshes and shows
-- other admins' actions (e.g. seeing whether a tester has been in and made changes).
--
-- Admin-only: authenticated users may read all and insert their own; the anon
-- (public app) role has no access.
--
-- Run in EACH Supabase project running the core (Tollesbury AND LGBT).
create table if not exists public.activity_log (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  actor      text,          -- email of the admin who acted
  action     text not null, -- e.g. "Updated location"
  target     text           -- e.g. the title acted on
);

create index if not exists activity_log_created_at_idx on public.activity_log (created_at desc);

alter table public.activity_log enable row level security;

drop policy if exists activity_log_select on public.activity_log;
create policy activity_log_select on public.activity_log
  for select to authenticated using (true);

drop policy if exists activity_log_insert on public.activity_log;
create policy activity_log_insert on public.activity_log
  for insert to authenticated with check (true);

notify pgrst, 'reload schema';


-- ===== migration-019-audio-transcript.sql =====
-- Migration 019 — audio transcript (WCAG 1.2.1 – Audio-only, prerecorded)
-- A location with an audio narration should carry a plain-text transcript so the
-- content is available to people who can't hear it. Additive + idempotent.
-- Run in BOTH client projects (Tollesbury + LGBT History).

alter table public.locations
  add column if not exists transcript text;

-- refresh PostgREST's schema cache so the new column is exposed immediately
notify pgrst, 'reload schema';


-- ===== migration-020-slider-after-image.sql =====
-- Migration 020 — separate the before/after slider's "after" image from the hero.
-- The hero (top of the story card) and the slider's "after"/today image used to be the
-- same field (hero_image_url), so a slider stop showed the same photo twice. This adds a
-- dedicated slider "after" image so the hero can be its own, independent lead photo.
-- Additive + idempotent. Run in BOTH client projects (Tollesbury + LGBT History).
-- No data change: where slider_after_url is blank the app falls back to hero_image_url,
-- so existing slider stops keep working until an editor gives them a distinct after photo.

alter table public.locations
  add column if not exists slider_after_url text,
  add column if not exists slider_after_position text default '50% 50%';

notify pgrst, 'reload schema';


-- ===== migration-021-portrait-credit.sql =====
-- Migration 021 — give the second (in-body) photo a credit, like the other photos.
-- Additive + idempotent. Run in BOTH client projects (Tollesbury + LGBT History).

alter table public.locations
  add column if not exists portrait_credit text,
  add column if not exists portrait_credit_url text;

notify pgrst, 'reload schema';


-- ===== migration-025-stories.sql =====
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
-- Guarded twice: (1) only fills locations that have no story yet, and (2) the whole
-- backfill is skipped unless `locations` still has the legacy content columns.
-- Reason: the column-drop below (drop column period, …) makes this script NOT safe
-- to naively re-run — a half-run that reached the drop leaves `locations` without
-- `period`, and re-running would fail to even parse `l.period`. Wrapping the insert
-- in dynamic SQL behind an EXISTS check means a re-run (or a run against an already
-- migrated DB) is a clean no-op instead of "column l.period does not exist".
do $backfill$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'locations' and column_name = 'period'
  ) then
    execute $sql$
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
    $sql$;
  end if;
end
$backfill$;

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


-- ===== migration-026-drop-location-content.sql =====
-- Migration 026 — Stories layer, step 2 of 2: drop the moved content columns.
--
-- ⚠️ DESTRUCTIVE and IRREVERSIBLE. Run ONLY when ALL of these are true:
--    1. Migration 025 ran and the VERIFY query showed locations_without_a_story = 0.
--    2. The updated app (reading/writing stories, not location content) is DEPLOYED.
--    3. You have taken a Supabase backup / point-in-time snapshot.
-- Until then the current app still needs these columns, so DO NOT run this early.
--
-- Keeps on locations: id, slug, title, city, lat, lng, trigger_radius, status,
--   guided_tour_only, address, created_at, updated_at, tour_num, and the privacy
--   block (visibility, publish_from/until, consent_*, coarse_pin).

begin;

alter table public.locations
  drop column if exists period,
  drop column if exists significance,
  drop column if exists summary,
  drop column if exists wiki_url,
  drop column if exists link_label,
  drop column if exists hero_image_url,
  drop column if exists hero_position,
  drop column if exists image_alt,
  drop column if exists image_label,
  drop column if exists photo_credit,
  drop column if exists photo_credit_url,
  drop column if exists show_photo_credit,
  drop column if exists historic_image_url,
  drop column if exists historic_position,
  drop column if exists historic_alt,
  drop column if exists historic_label,
  drop column if exists historic_credit,
  drop column if exists historic_credit_url,
  drop column if exists video_url,
  drop column if exists audio_url,
  drop column if exists audio_duration,
  drop column if exists transcript,
  drop column if exists thumbnail_url,
  drop column if exists hue,
  drop column if exists related_ids,
  drop column if exists caption,
  drop column if exists links,
  drop column if exists portrait_url,
  drop column if exists portrait_alt,
  drop column if exists portrait_caption,
  drop column if exists portrait_credit,
  drop column if exists portrait_credit_url,
  drop column if exists slider_after_url,
  drop column if exists slider_after_position,
  drop column if exists notes_internal;

commit;

notify pgrst, 'reload schema';


-- ===== migration-027-location-address.sql =====
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


-- ===== migration-028-story-status.sql =====
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


-- ===== migration-029-video-caption.sql =====
-- Migration 029 — optional caption for a story's in-body (YouTube) video.
-- Additive + safe to run against the LIVE app: the column defaults to NULL and
-- the currently deployed app ignores it. Run this in EACH project (Tollesbury +
-- LGBT). See docs/FSD.md.

begin;

alter table public.stories add column if not exists video_caption text;

commit;

-- Tell PostgREST to reload its schema cache so the new column is exposed.
notify pgrst, 'reload schema';
