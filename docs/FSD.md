# Nearmark — Functional Specification

A reference for what the platform does and how it's put together. For **setup and
deployment** see the [README](../README.md); this document describes **behaviour, data and
architecture**. It reflects the app as of migration 017.

---

## 1. Overview

Nearmark is a white-label, location-aware **heritage/walking-guide** platform. A single
codebase is themed and configured per deployment (env vars only) to serve many branded
clients — e.g. Tollesbury Arts Trail and LGBT History UK — each with its own Supabase
backend.

Two front-ends share one build:

| Entry | Served at | Audience |
|---|---|---|
| `index.html` | `/` | Public mobile web app (PWA) |
| `admin.html` | `/admin` | Content-management backoffice |

**Stack:** Vue 3 (`<script setup>`) + Vite · Supabase (Postgres + Auth + Storage + Edge
Functions) · Leaflet + OpenStreetMap tiles · hosted on Vercel · optional OpenRouteService
and PostHog.

---

## 2. Architecture

- **State-driven SPA, no router.** Each front-end is one root component orchestrating
  screen state (`src/App.vue` public; `src/admin/AdminApp.vue` admin). The admin uses a
  reactive `store` (`src/admin/store.js`) for session, data and navigation (`store.go`).
- **Config layer.** `src/config.js` reads `import.meta.env` at build time; `src/theme.js`
  + `src/lib/tokens.js` resolve the palette/fonts from the theme named by `VITE_THEME`
  (`src/themes/`). Components never hardcode branding — they read CSS variables + config.
- **Build/deploy.** Vite multi-page build (`index.html`, `admin.html`). A
  `transformIndexHtml` plugin injects the themed `<title>` and favicon/apple-touch icon
  (`VITE_ICON_URL`) into **both** HTML entry points. Pushes to `main` auto-deploy on Vercel.
- **Offline (PWA).** `vite-plugin-pwa` (Workbox, `autoUpdate`) precaches the app shell and
  adds runtime caching: OSM tiles (CacheFirst), Supabase REST (NetworkFirst), Supabase
  Storage media (CacheFirst) and Google Fonts. On top of that lazy caching, **opening a tour
  pre-fetches every stop's images + audio** (`src/lib/precache.js`) so a guided walk is fully
  cached before the walker loses signal — best-effort, and skipped when offline or under Data
  Saver. The admin is excluded from the offline shell (online-only).
- **Canonical host.** A tiny inline guard in each HTML entry redirects `www.` → apex in
  normal browser tabs (installed PWAs excepted), backing up the server 308.

---

## 3. Data model

Per-client Postgres on Supabase, guarded by Row-Level Security. Three core tables.

### `locations`
A place on the map with its story. Keyed by a stable `slug` (used as the app-level `id`).
Notable fields: `title`, `city`, `period`, `significance`, `summary`, `hue` (accent),
`lat`/`lng`, `trigger_radius`; imagery (`hero_image_url` = the lead photo; the before/after
slider's own pair `historic_image_url` + `slider_after_url`, the latter falling back to the
hero; `portrait_url`; focal `*_position`; alt text; slider labels; `caption`); credits
(`photo_credit`, `historic_credit`, + `show_photo_credit` toggle); `wiki_url` +
`link_label` (per-location CTA label); `audio_url`/`audio_duration` + `transcript`
(plain-text audio transcript, WCAG 1.2.1), `video_url`;
`related_ids`; `status` (draft/published); privacy (`visibility`, consent fields,
`publish_from`/`publish_until`); `guided_tour_only`.

### `tours`
An ordered collection of stops. Keyed by `slug`. Fields: `title`, `city`, `theme`,
`description`; cover imagery + credit (`cover_image_url`, `cover_position`, `cover_credit`,
`show_cover_credit`, `cover_alt`); `stop_ids` (ordered slugs); `stop_overrides`
(per-tour title/blurb per stop); `route_geometry` (stored road-following path,
`[[lat,lng],…]`); `duration_override_mins`; `sort_order`; event window (`event_start`,
`event_end`, `takedown_at`).

### `media`
Optional metadata for files in the `media` storage bucket, keyed by `storage_url`:
`type`, `filename`, `photographer`, `license`, `caption`.

### Migration index
`schema.sql` is the baseline; run every `migration-*.sql` in order after it.

| # | Adds |
|---|---|
| 002 | positions + tour ordering |
| 003 | tour cover image |
| 004 | historic-photo credit |
| 005 | alt text |
| 006 | captions + links |
| 007 | before/after slider labels |
| 008 | media-metadata table |
| 009 | artist/portrait (second) image |
| 010 | per-tour stop overrides |
| 011 | privacy / publication window |
| 012 | event-window inheritance |
| 013 | photo-credit visibility toggle |
| 014 | cover-credit visibility toggle |
| 015 | `guided_tour_only` flag |
| 016 | per-location `link_label` |
| 017 | tour `route_geometry` (walking routes) |
| 018 | persistent activity log |
| 019 | per-location audio `transcript` (WCAG 1.2.1) |
| 020 | slider `after` image (`slider_after_url`), separate from the hero |
| 021 | second-photo credit (`portrait_credit`, `portrait_credit_url`) |

---

## 4. Public app (`/`)

- **Onboarding.** Splash → optional location permission → (multi-city sites) city picker →
  cover screen. Location can be granted later, at the moment a mode needs it.
- **Two modes.**
  - **Guided tour** — follow an ordered route; the map draws the route line (road-following
    when a tour has `route_geometry`, else straight), tracks the next stop, and auto-opens
    a story on GPS arrival within `trigger_radius`.
  - **Discovery** — wander freely; stories surface by proximity. Stops flagged
    `guided_tour_only` are hidden here and appear only inside a guided tour.
- **Story card.** Hero photo (with focal point), category/period tag, title, narrative, an
  optional **before/after slider** (its own before + after photos, independent of the hero;
  after falls back to the hero if unset), second photo, optional **video** (a direct `.mp4`/`.webm` plays as
  the muted looping hero; a **YouTube** link embeds as a player in the body — a non-playable
  link is ignored so it can't blank the hero), audio narration (with a collapsible **"Show
  transcript"** panel when a transcript exists — `[bracketed]` non-speech cues rendered
  muted/italic), credits (respecting the show/hide toggles), an external link (label =
  `link_label` or the app default `VITE_STORY_LINK_LABEL`), and "nearby stories".
- **Map.** Leaflet + OSM tiles; hue-coloured numbered pins (dark/white number chosen per
  hue for contrast), "you are here" GPS marker, route polyline.
- **Share.** A sheet with a brand-coloured **QR code** (primary, for in-person sharing),
  copy-link, and a native "Share…" button where supported. URL = `VITE_PUBLIC_URL`.
- **Deep links.** `?story=<slug>` opens a story; `?tour=<slug>` opens a tour detail —
  shareable, and used by the admin Preview buttons. Drafts resolve when an admin is signed
  in in the same browser (shared session).
- **Offline.** Installable to the home screen; previously-viewed content, tiles and media
  are served from cache. Opening a tour pre-caches all its stops' images and audio up front,
  so the full route works offline even for stops not yet reached.

---

## 5. Admin backoffice (`/admin`)

- **Auth.** Supabase email/password, session-persisted; optional **TOTP two-factor**.
  Password reset via emailed recovery link, which prompts for the 2FA code first when the
  account has MFA enabled.
- **Dashboard.** Live counts (locations, tours, published, drafts), session activity feed,
  quick links.
- **Locations list.** Grouped by tour, searchable/filterable; hero **thumbnail** column
  (ghost box when none) so missing photos are obvious; row actions Edit · Preview ·
  Duplicate · Delete.
- **Location editor.** Full content form; click-to-place map pin; accent picker; image
  fields with compact **upload** + **media-library picker** icons (photos shown whole in a
  masonry grid), in-place replace, focal point, alt/caption/credits + credit toggle; audio
  (with a **transcript** field + a missing-transcript accessibility warning when audio is
  present); related locations; visibility/consent; `guided_tour_only`; live story-card
  preview. Tour titles are capped at 21 characters so the hero title stays on one line.
- **Tours list & editor.** Drag-to-reorder tours; editor with cover image (same icon
  controls), drag/keyboard stop reordering, per-stop tour overrides, **Calculate walking
  route** button + numbered route preview, collapsible event window.
- **Media library.** Lists everything in the bucket (folders + root); edit metadata; upload,
  replace, delete.
- **User management.** Invite/list/remove admins + manage own 2FA (needs the `admin-users`
  Edge Function).
- **Safety.** An **unsaved-changes guard** warns before leaving a dirty editor (in-app
  navigation and browser close/reload).

---

## 6. Integrations

- **Supabase** — Postgres (RLS: anon reads published only; authenticated admins read/write
  all), Auth (+ MFA), Storage (`media` bucket, public read), Edge Functions.
- **Brevo** (transactional SMTP) — auth emails (editor invites, magic links, password resets)
  send through Brevo with **branded per-app templates** and app-specific senders on
  DKIM/SPF-authenticated domains, instead of Supabase's default "Supabase Auth" mailer. Set
  per project in the dashboard; templates live in `supabase/email-templates/`.
- **OpenRouteService** (optional) — `compute-route` Edge Function calls the `foot-walking`
  directions API with a server-side `ORS_KEY` secret; result stored on the tour and drawn
  offline. See README → Optional features.
- **OpenStreetMap** — base map tiles; map labels/POIs are OSM data (fix via osm.org).
- **PostHog** (optional) — privacy-light analytics; disabled when `VITE_POSTHOG_KEY` is
  blank.

---

## 7. Accessibility

Target **WCAG 2.1 AA**. Keyboard paths for every pointer action (e.g. list rows are a
mouse shortcut, the Edit button the keyboard path); focus traps + Esc on dialogs; a main
landmark and page headings; `readableInk()` picks dark/white number colour per hue for
contrast on map pins and tour badges. Audio narration can carry a plain-text **transcript**
(WCAG 1.2.1); the editor warns when audio has none. **axe-core runs at two levels:** a
**PR gate** (`tests/a11y.spec.js` — Playwright builds the app in seed mode and scans the key
public screens **and the admin backoffice** — which the seed build opens read-only as a demo —
failing on serious/critical WCAG 2.x A/AA issues), and a **scheduled scan**
(`a11y-scan.yml`) of the live sites that files issues. Neither can evaluate SVG-over-map
contrast — those are handled in code (`readableInk()`).

---

## 8. Security & privacy notes

- The anon/publishable key is safe client-side; **RLS is the boundary**. Service-role keys
  and the `ORS_KEY` live only as Supabase secrets / Edge Function env — never in the bundle.
- Private addresses require recorded resident consent and only publish inside a tour's
  event window, auto-hiding after `takedown_at`.
- Edge Functions verify the caller's Supabase JWT by default (admin-only).
