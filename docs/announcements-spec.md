# Announcements ("What's on") — spec

Status: **Built (v1.15.0) + verified on staging** (`migration-038-announcements.sql`); dormant on a
project until that migration is run. A deliberately-lite way to surface village events in the
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
- **Start + end date-time; hides the instant it ends.** Like a time-based tour, an announcement has a
  start and end **date-time** — but unlike a tour (which lingers for a takedown window) it disappears
  from the public list **the moment `event_end` passes**, no buffer. Still doesn't block on the
  deferred event-schedule/opening-times redesign.
- **Super-Admin-managed** for v1 (the site owner posts village notices). Independent of the per-tour
  editor scoping — announcements aren't tours.

## Data model
```sql
create table public.announcements (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique not null,        -- stable; event-page URL is /?event=<slug>
  title        text not null,
  event_start  timestamptz,                 -- start date+time (null = evergreen notice)
  event_end    timestamptz,                 -- end date+time (optional; falls back to start)
  place        text,                        -- free text, e.g. "Parish Rooms", "Sailing Club"
  description  text,                        -- markdown-lite (same subset as story text)
  image_url    text,
  image_alt    text,
  link_url     text,                        -- optional "Book tickets" / Facebook event
  link_label   text,                        -- optional button label; blank → shows the host
  tour_slug    text,                        -- optional: an event that's also a walk → "Start the walk"
  status       text not null default 'draft' check (status in ('draft','published')),
  sort_order   int  not null default 0,
  created_by   uuid references auth.users(id),
  created_at   timestamptz not null default now()
);
alter table public.announcements enable row level security;

-- Public: only published, and only until the event ends (evergreen if no dates).
-- Hides the instant coalesce(event_end, event_start) passes — no buffer.
create policy ann_anon_read on public.announcements for select to anon
  using (status = 'published'
         and (coalesce(event_end, event_start) is null or coalesce(event_end, event_start) >= now()));
-- Admin: all authenticated can read; Super Admin manages (aligns with RBAC's is_super_admin()).
create policy ann_auth_read on public.announcements for select to authenticated using (true);
create policy ann_sa_write on public.announcements for all to authenticated
  using (is_super_admin()) with check (is_super_admin());
```
On projects **without** RBAC applied, `is_super_admin()` won't exist — either gate writes on
`authenticated` there, or (cleaner) ship announcements only where RBAC is on. Decide at build time.

## Admin (merged with Tours — decided 2026-09-14)
Tours and announcements share **one** sidebar item, **"Tours & events"** — a single list showing
both, each row badged Tour / Event, drag/▲▼-reorderable in a **shared order** (`sort_order` written
to whichever table the row belongs to; see `store.homeItems` / `store.reorderHome`). A single
**"+ New"** button asks which type to create. The **editors stay separate**: the announcement editor
mirrors the story/location treatment — title, start/end **date-time** (`datetime-local`), place,
**address + map pin** (for directions), description, one image with **focal point + caption + credit
(+ show toggle) + credit link**, optional link (url + label), optional linked tour, draft/publish.
No takedown field — visibility is derived live from the end time.

## Public
- **One ordered list** on the Tours screen: tours and current events interleaved in the admin's
  shared order. Event cards are a compact row **badged "Event"** (thumbnail + date + venue). Only
  published, not-yet-ended (or evergreen) announcements appear.
- **Event page** (`/?event=<slug>`): image (with focal point), title, date/time, venue + **address +
  a Directions link** (device maps app), caption/credit, description, the optional link button, and —
  if `tour_slug` is set — a **"Start the walk"** button into that tour.
- **Paid adverts:** monetising these as paid event adverts is a separate, later feature — see
  `docs/paid-event-adverts-spec.md`.

## Lifecycle
A published announcement shows until `coalesce(event_end, event_start)` passes, then drops out of the
public list **immediately** (no buffer — that's the difference from a tour's takedown window). The
admin still sees past ones to duplicate or delete. Three shapes, all from the same two fields:
- **Dated event** — start + end: shows with its date/time, hides the moment it ends.
- **Dateless notice / advert** — **no start, an end**: shows with **no public date** (a standing
  notice, a business advert); the end acts as an **expiry** that auto-hides it. The admin list shows
  "Until &lt;date&gt;". (`eventWhen` returns nothing without a start, so nothing dated is shown publicly.)
- **Evergreen** — no dates at all: shows until unpublished.

## Out of scope (keep it lite)
RSVPs · ticketing · recurring events · reminders/notifications · a calendar view · comments. These
are what make it "an events app" — deliberately excluded.

## Phasing / effort
**Small, self-contained** — one table, one admin section, one public event-page component, and the
badged cards on the Tours list. Suggested timing: after the railway tour is up; if the **Christmas
Faire** is the first real use, autumn makes seasonal sense. Later, only if wanted: a map pin, and
folding the dates into the event-schedule/opening-times redesign when that happens.
