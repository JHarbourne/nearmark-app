# Announcements ("What's on") — spec

Status: **Spec only — not built.** A deliberately-lite way to surface village events in the
app without turning it into an events app. Applies to the Nearmark core, so any deployment can
use it (Tollesbury first). Raised by Jonathan 2026-09-13; specced 2026-09-14.

## Why
Some things people open the app for aren't walks — the **Christmas Faire** (one afternoon in the
Parish Rooms), the **Beer Festival** (two days at the Sailing Club). And some events *are* also
walks (Open Gardens, the Arts Trail). An **Announcement** is a card on the Tours list that opens a
**simple event page** instead of a tour.

**Hard constraints (non-negotiable):**
- **The walks stay the focus** — announcements are subordinate, clearly badged, and never take over
  the list.
- **Simple and lite** — no RSVPs, ticketing, recurring events, reminders, or a calendar (see
  *Out of scope*). If a request would cross that line, that's the signal to stop.

## Decisions
- **Separate `announcements` table, not a `type` flag on tours.** A tour has stops/stories/route/
  ownership; an announcement has none of that. A standalone table keeps tours pure and is the
  *lighter* option (no "if announcement, hide this" scattered through the tour code).
- **Simple date, not the full event-schedule redesign.** Announcements use a plain date + auto-hide;
  they do **not** block on the deferred event-schedule/opening-times redesign — that can supersede this later.
- **Super-Admin-managed** for v1 (the site owner posts village notices). Independent of the per-tour
  editor scoping — announcements aren't tours.

## Data model
```sql
create table public.announcements (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique not null,        -- stable; event-page URL is /?event=<slug>
  title        text not null,
  event_start  date,                        -- the day it happens (null = evergreen notice)
  event_end    date,                        -- optional, for multi-day (Beer Festival)
  place        text,                        -- free text, e.g. "Parish Rooms", "Sailing Club"
  description  text,                        -- markdown-lite (same subset as story text)
  image_url    text,
  image_alt    text,
  link_url     text,                        -- optional "Book tickets" / Facebook event
  link_label   text,                        -- optional button label; blank → shows the host
  tour_slug    text,                        -- optional: an event that's also a walk → "Start the walk"
  status       text not null default 'draft' check (status in ('draft','published')),
  takedown_at  date,                        -- auto-hide from the public list after this
                                            --   (default on save: coalesce(event_end,event_start) + buffer)
  sort_order   int  not null default 0,
  created_by   uuid references auth.users(id),
  created_at   timestamptz not null default now()
);
alter table public.announcements enable row level security;

-- Public: only published, and only while current (evergreen if no takedown date).
create policy ann_anon_read on public.announcements for select to anon
  using (status = 'published' and (takedown_at is null or takedown_at >= current_date));
-- Admin: all authenticated can read; Super Admin manages (aligns with RBAC's is_super_admin()).
create policy ann_auth_read on public.announcements for select to authenticated using (true);
create policy ann_sa_write on public.announcements for all to authenticated
  using (is_super_admin()) with check (is_super_admin());
```
On projects **without** RBAC applied, `is_super_admin()` won't exist — either gate writes on
`authenticated` there, or (cleaner) ship announcements only where RBAC is on. Decide at build time.

## Admin
A new **"Announcements"** item in the sidebar (Super-Admin-only), with a small list + a **simple
editor** (much lighter than the story editor): title, event date(s), place, description, one image
(+ alt), optional link (url + label), optional linked tour (a picker of existing tours), draft/publish.
`takedown_at` is set automatically on save (event end/start + a buffer, e.g. 2 days) but editable.
Reuses the existing image upload/media-library controls and the markdown help.

## Public
- **"What's on" strip** at the **top of the Tours list**: cards the **same size** as tour cards but
  **badged "Event"** in a distinct colour, sorted by `event_start` (soonest first), showing only
  published + current rows. The walks list sits underneath, unchanged.
- **Event page** (`/?event=<slug>`): image, title, date(s), place, description, the optional link
  button, and — if `tour_slug` is set — a **"Start the walk"** button into that tour. No map pin in
  v1 (a place name is enough); add one later only if asked.

## Lifecycle
Published announcements show until `takedown_at` (default: last event day + buffer), then drop out
of the public list automatically; the admin still sees past ones to duplicate or delete. An
announcement with no date is an evergreen notice that shows until unpublished.

## Out of scope (keep it lite)
RSVPs · ticketing · recurring events · reminders/notifications · a calendar view · comments. These
are what make it "an events app" — deliberately excluded.

## Phasing / effort
**Small, self-contained** — one table, one admin section, one public event-page component, and the
badged cards on the Tours list. Suggested timing: after the railway tour is up; if the **Christmas
Faire** is the first real use, autumn makes seasonal sense. Later, only if wanted: a map pin, and
folding the dates into the event-schedule/opening-times redesign when that happens.
