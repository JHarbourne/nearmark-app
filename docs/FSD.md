# Nearmark — Functional Specification

A reference for what the platform does and how it's put together. For **setup and
deployment** see the [README](../README.md); this document describes **behaviour, data and
architecture**. It reflects the app as of migration 029 (v1.8.0).

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
Functions) · MapLibre GL + self-hosted Protomaps/PMTiles vector basemap (public map; the
admin map is still Leaflet) · hosted on Vercel · optional OpenRouteService and PostHog.

---

## 2. Architecture

- **State-driven SPA, no router.** Each front-end is one root component orchestrating
  screen state (`src/App.vue` public; `src/admin/AdminApp.vue` admin). The admin uses a
  reactive `store` (`src/admin/store.js`) for session, data and navigation (`store.go`).
- **Config layer.** `src/config.js` reads `import.meta.env` at build time; `src/theme.js`
  + `src/lib/tokens.js` resolve the palette/fonts from the theme named by `VITE_THEME`
  (`src/themes/`). Components never hardcode branding — they read CSS variables + config.
- **Build/deploy.** Vite multi-page build (`index.html`, `admin.html`). A
  `transformIndexHtml` plugin bakes per-deployment branding into the **static** HTML: the
  themed `<title>` + favicon/apple-touch icon (`VITE_ICON_URL`) on both entries, and — on the
  public entry — the meta **description** + **Open Graph/Twitter** card (`VITE_APP_DESCRIPTION`,
  image `VITE_ICON_URL`, url `VITE_PUBLIC_URL`) and the static **theme-colour** + a matching
  first-paint page background (`VITE_THEME_COLOR`). This is done at build time because
  link-preview scrapers never run JS and the first paint happens before the app's CSS loads, so
  both must be in the markup rather than set at runtime. Pushes to `main` auto-deploy on Vercel.
- **Serverless functions & rewrites** (`api/`, Vercel; mapped by `vercel.json`). Beyond the
  static SPA, a few Node functions serve: the **crawlable SEO pages** + `sitemap.xml`/`robots.txt`
  (see §4); the **analytics reverse proxy** (`/ingest/*` → PostHog EU, so events are first-party
  and dodge tracker-blockers). Each reads *that* deployment's own Supabase, so the routes are
  per-tenant. (`google-site-verification` for Search Console is likewise baked into the static
  HTML from `VITE_GSC_VERIFICATION` — an inert meta tag, no cookies.)
- **Offline (PWA).** `vite-plugin-pwa` (Workbox, `autoUpdate`) precaches the app shell and
  adds runtime caching: the **vector basemap** (`.pmtiles`, CacheFirst with `rangeRequests`),
  Protomaps font glyphs (CacheFirst), Supabase REST (NetworkFirst), Supabase Storage media
  (CacheFirst) and Google Fonts. On top of that lazy caching, on load the app **pre-fetches
  the whole basemap file** and, on opening a tour, **every stop's images + audio**
  (`src/lib/precache.js`) — so the map *and* a guided walk are fully cached before the walker
  loses signal. Best-effort, and skipped when offline or under Data Saver. The map reads the
  `.pmtiles` via HTTP range requests; `rangeRequests` serves those byte-ranges out of the one
  cached full file, so the map renders with no network. The admin is excluded from the offline
  shell (online-only).
- **Canonical host.** A tiny inline guard in each HTML entry redirects `www.` → apex in
  normal browser tabs (installed PWAs excepted), backing up the server 308.

---

## 3. Data model

Per-client Postgres on Supabase, guarded by Row-Level Security. Content hierarchy is
**Tour → Location → Story**: a location is a place on the map; its content lives in one or
more child stories.

### `locations`
A place on the map. Keyed by a stable `slug` (used as the app-level `id`). Holds only
place/identity: `title` (the pin/list name), `city`, `address` (from geocoding), `lat`/`lng`,
`trigger_radius`, `tour_num`, `status` (draft/published); privacy (`visibility`, consent
fields, `publish_from`/`publish_until`, `coarse_pin`); `guided_tour_only`. **All content
lives on its stories.**

### `stories`
The content shown when a pin is tapped. FK `location_id`, ordered by `sort_order`. Fields:
`heading` (card title), `period`, `significance` (subtitle), `summary` (body, Markdown
subset); imagery (`hero_image_url` = lead photo; before/after pair `historic_image_url` +
`slider_after_url`, the latter falling back to the hero; `portrait_url`; focal `*_position`;
alt text; slider labels; `caption`); credits (`hero_credit`, `historic_credit`, +
`show_hero_credit` toggle); `wiki_url` + `link_label`; `audio_url`/`audio_duration_secs` +
`transcript` (WCAG 1.2.1), `video_url` + `video_caption`; `related_ids`; `hue` (accent); `notes_internal`;
`status` (draft/published — a story can be hidden independently; a story is public only
when published *and* its parent location is publicly visible).
A location with **one** story opens it directly; **two or more** show a picker list first
(e.g. an arts-trail hub listing every exhibiting artist).

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
| 022–024 | back-office permissions (RBAC/ownership, notifications, deletion workflow) — **drafted, not run** (parked; see `docs/backoffice-permissions-spec.md`) |
| 025 | **`stories`** table + one-per-location backfill + shared `location_visible_to_anon()` visibility helper (Tour→Location→Story) |
| 026 | drop the moved content columns from `locations` (run after the app switch-over) |
| 027 | location `address` (for geocoding) |
| 028 | per-story `status` (draft/published) — hide an individual story |
| 029 | per-story `video_caption` (caption shown under an embedded video) |

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
- **Stories.** Tapping a pin opens its story card **directly** when the location has a single
  story (the common case — identical to before). With **two or more**, a **story picker** list
  shows first (heading + thumbnail), then the chosen card opens.
- **Story card.** Hero photo (with focal point), category/period tag, title, narrative (a safe
  **Markdown subset** — `**bold**`, `*italic*`, `- ` bullets, plus **soft line breaks** within a
  paragraph for verse/quotes: end a line with a backslash `\`, two trailing spaces, or a literal
  `<br>`. Rendered with fixed paragraph spacing; a plain new line still starts a new paragraph, so
  existing text is unaffected), an
  optional **before/after slider** (its own before + after photos, independent of the hero;
  after falls back to the hero if unset), second photo, optional **video** (a direct `.mp4`/`.webm` plays as
  the muted looping hero; a **YouTube** link embeds as a player in the body, with an optional
  **caption** beneath it — a non-playable link is ignored so it can't blank the hero), audio
  narration (with a collapsible **"Show transcript"** panel when a transcript exists —
  `[bracketed]` non-speech cues rendered muted/italic), credits (respecting the show/hide
  toggles), an external link (label = `link_label` or the app default `VITE_STORY_LINK_LABEL`),
  "nearby stories", and a small, low-contrast **"Suggest a correction"** link at the foot that
  opens the reader's mail app (a plain `mailto:` — no backend, works offline) pre-addressed to
  `VITE_FEEDBACK_EMAIL` with the app name + location/story in the subject (hidden when that var is
  unset). The card is a
  bottom sheet, closed by the ✕, Esc, tapping the backdrop, or **pulling it down** (engages only
  from the top of the content, so it doesn't fight scrolling).
- **Map.** MapLibre GL rendering a self-hosted **Protomaps vector basemap** — a
  per-deployment `.pmtiles` file set via `VITE_MAP_PMTILES_URL` and read through the
  `pmtiles://` protocol (HTTP range requests; offline-cacheable). If the var is unset it
  falls back to raster OpenStreetMap (online-only), so a deployment renders either way.
  Hue-coloured numbered pins (dark/white number chosen per hue for contrast), "you are
  here" GPS marker, GeoJSON route line. See `docs/maplibre-migration.md`.
- **Share.** A sheet with a brand-coloured **QR code** (primary, for in-person sharing),
  copy-link, and a native "Share…" button where supported. URL = `VITE_PUBLIC_URL`.
- **Deep links.** `?story=<slug>` opens a story; `?tour=<slug>` opens a tour detail —
  shareable, and used by the admin Preview buttons. Drafts resolve when an admin is signed
  in in the same browser (shared session).
- **SEO / crawlable pages.** The app itself is client-rendered, so search engines see almost
  nothing. Vercel serverless functions (`api/place.js`, `api/tour.js`) render real, indexable
  HTML per stop (`/place/<slug>`) and tour (`/tour/<slug>`) — `<title>`, meta description,
  canonical, Open Graph, **JSON-LD** (`TouristAttraction` / `TouristTrip`), the story text +
  hero image, and an **"Open in the app"** button that deep-links back into the SPA. A live
  **`/sitemap.xml`** (`api/sitemap.js` — generated from Supabase, published stops + tours only,
  so it self-updates as content is added) and **`/robots.txt`** complete it. All read the
  deployment's own published content (via RLS) and are branded per-app from the same env, so
  every white-label deployment gets its own SEO pages automatically, always fresh — no rebuild.
  Canonical/OG URLs use the request host, so they follow whatever domain serves the app.
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
  **Duplicate** (clones the place *and* its stories as a numbered draft — "(copy)", "(copy 2)"…
  — staying on the list) · Delete.
- **Location editor.** Place fields — title, city, **address with one-click geocoding**
  ("Find on map" / Enter → OpenStreetMap Nominatim drops the pin and fills lat/lng),
  click-to-place map pin, trigger radius, visibility/consent, `guided_tour_only`,
  draft/publish. A location's content is edited **inline on the same screen** in the common
  **single-story** case (place + story + map, saved with one **Save** — like it was before the
  Stories split; the story's heading tracks the place title and the location's own draft/publish
  governs visibility). A location with **two or more** stories instead shows a **Stories list**
  (up/down reorder, edit, delete, "+ Add story"), each edited on its own screen; **"+ Add another
  story"** promotes a single-story location into the list.
- **Story editor.** The content form for one story, fields in roughly the card's
  top-to-bottom order (heading → period → significance → hero → text → before/after slider →
  second photo → audio/video → links → related); compact **upload** + **media-library picker**
  icons, in-place replace, focal point, alt/caption/credits + credit toggle; audio with its
  **duration** beside the URL and a **transcript** field + missing-transcript accessibility
  warning; video with an optional **caption** beside the URL; accent picker; live story-card
  preview. The form itself is a shared **`StoryFields`** component, reused both on this standalone
  screen (2+ stories) and inline in the Location editor (0–1 stories). Tour titles are capped at
  21 characters so the hero title stays on one line.
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
- **OpenStreetMap** — the public basemap is a self-hosted **Protomaps vector extract of OSM
  data** (a `.pmtiles` file per deployment; label glyphs from Protomaps' asset CDN). The
  admin map + geocoding still use OSM raster tiles / Nominatim. Map labels/POIs are OSM data
  (fix via osm.org).
- **PostHog** (optional) — privacy-light product analytics (`localStorage` id, no third-party
  cookies; Do-Not-Track honoured; a Settings opt-out toggle). Events go **first-party through a
  `/ingest` reverse proxy** (a `vercel.json` rewrite → PostHog EU), so tracker-blockers / Safari
  ITP don't drop them. The public write-only key is baked in, gated to the platform's own hosts;
  disabled when unset. The marketing site (`nearmark-website`) mirrors the proxy but stays fully
  cookieless (`persistence: 'memory'`) — which means its numbers show via raw event insights, not
  PostHog's session-based *Web Analytics* tab.
- **Google Search Console** — domain verification via `VITE_GSC_VERIFICATION` (an inert
  `<meta name="google-site-verification">` baked into the public HTML — no cookies/tracking).
  Accepts either the bare token or a whole pasted verification tag; blank = not emitted.

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
