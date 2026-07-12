# Changelog

All notable changes to Nearmark are recorded here. This project follows
[Semantic Versioning](https://semver.org) (`MAJOR.MINOR.PATCH`). During the testing phase,
bug fixes bump the **patch** version; new features bump the **minor**.

The [README](README.md) is documentation; this file is the release history.

## [Unreleased]

## [1.6.1] — 2026-07-12

### Fixed
- **Too much empty space at the bottom on iPhone.** Bottom-pinned chrome (the map's tab bar, the
  "Start tour" footer, and the cover/splash/completion screens) padded the bottom with
  `calc(Npx + env(safe-area-inset-bottom))` — which *stacks* extra room on top of the phone's
  home-indicator inset, so on iOS (which already reserves ~34px) it double-padded. Switched to
  `max(Npx, env(safe-area-inset-bottom))`: non-inset devices (Android/desktop) keep the exact same
  `Npx`, while iPhones use just the safe-area, removing 18–30px of dead space per screen.

## [1.6.0] — 2026-07-12

### Added
- **"Suggest a correction" link on every story card.** A small, low-contrast link at the very
  foot of each story card (Discover *and* Guided Tour) opens the reader's mail app (a plain
  `mailto:` — no form, no backend, works offline) pre-addressed to the deployment's contact, with
  a subject of `<App> feedback – <Location> / <Story>` and a short pre-filled body. Set the
  recipient per deployment via **`VITE_FEEDBACK_EMAIL`**; the link is hidden when it's unset.

## [1.5.1] — 2026-07-12

### Fixed
- **Link-preview cards now match the deployment.** When the app is shared (WhatsApp, iMessage,
  etc.) the preview description came from a hardcoded default ("…in your city's streets") because
  scrapers read the static HTML and never run the JS that updated it. The build now bakes the
  per-deployment **description** (`VITE_APP_DESCRIPTION`) into the static `<meta>` and adds proper
  **Open Graph / Twitter** card tags (title, description, image, url). The generic default wording
  is now "…in your **area's** streets".
- **No more dark "black" flash on first load over a poor connection.** The static
  `<meta name="theme-color">` was hardcoded dark and only corrected once the app's JS ran — so on
  a light-themed deployment, the pre-app paint was black on a slow link. The build now bakes the
  deployment's **theme colour** (`VITE_THEME_COLOR`) into the static meta and sets a matching
  first-paint page background, so the boot screen is the app's own colour from the first frame.

## [1.5.0] — 2026-07-12

### Changed
- **Single-story locations are edited on one screen again.** After the Stories layer landed,
  even a location with just one story needed a second click and a second screen to reach its
  content. Now a location with **0 or 1 story** shows that story's content **inline** in the
  Location editor — place fields, story content and map on one screen, saved with a single
  **Save** (like it was before Stories). A location only switches to the **list** view once it
  has **two or more** stories; "**+ Add another story**" makes the jump. The single story's
  heading tracks the place title, and the location's own Published/Draft governs its visibility,
  so there's no separate per-story toggle in the inline case.

### Internal
- Extracted the story content form into a reusable **`StoryFields`** component, shared by the
  standalone Story editor and the Location editor's inline single-story view (no behaviour change
  to the multi-story flow).

## [1.4.1] — 2026-07-10

### Fixed
- The admin **"Open in PostHog"** link now points at the correct PostHog project
  (219590), not the previous incorrect project ID — so it lands on the dashboard
  that actually holds the app's analytics.

## [1.4.0] — 2026-07-10

### Added
- **Offline vector maps.** The public map moves from Leaflet + raster OpenStreetMap to
  **MapLibre GL rendering a self-hosted Protomaps vector basemap** (a per-deployment
  `.pmtiles` file via `VITE_MAP_PMTILES_URL`). The basemap file and font glyphs are cached,
  and the app pre-fetches the basemap on load, so the **map works with no signal** in the
  field — the point of the migration. This also takes the app off the OpenStreetMap tile
  server (whose policy forbids the offline prefetch we needed). A deployment without a tile
  file falls back to raster OSM (online-only). See `docs/maplibre-migration.md`.
- **Admin Analytics screen** — embeds the PostHog dashboard, or links out.
- **Per-story draft/published** status (an individual story can be hidden).
- **Media library** — visible type filters and sort by date/name.

### Fixed
- The offline / "new version" notices no longer overlap the device status bar.
- Admin dashboard fills the viewport; the activity log scrolls within its own panel.
- Media "Used by" now accounts for stories; admin list tables stack on mobile.
- Story card resets scroll to the top when opened.

## [1.3.0] — 2026-07-08

### Added
- **Stories layer (Tour → Location → Story).** A location now holds only place/identity
  (title, map position, address, privacy, status); its content moves to a new **`stories`**
  table, and a location can hold **several stories**. Tapping a pin opens the story directly
  when there's one (unchanged for the single-story case); with two or more, a **story picker**
  list shows first. This lets a single venue — e.g. the arts-trail hub — list every exhibiting
  artist. (Migrations 025–027; existing content backfilled one-story-per-location.)
- **Address geocoding in the location editor.** Type an address and "Find on map" (or Enter)
  drops the pin and fills lat/lng via OpenStreetMap Nominatim (debounced, single-flight;
  "Address not found" inline error).
- **Story editor** — a dedicated content form per story, fields ordered to match the story
  card top-to-bottom.

### Changed
- **Location editor** slimmed to place fields + a **Stories** section (list, reorder, add/edit/
  delete); the right column is the address + map, with Stories and Save under the place fields.
- Content field renames carried by the migration: `photo_credit` → `hero_credit`,
  `audio_duration` → `audio_duration_secs`, plus a new `heading` (story title).

### Docs
- New `docs/staging-runbook.md` (staging setup + expand→deploy→contract release checklist) and
  `docs/backoffice-permissions-spec.md` (RBAC design; drafted migrations 022–024, parked).

## [1.2.0] — 2026-07-07

### Added
- **Pull-down-to-close on story cards** — drag/swipe the card down to dismiss it (in addition
  to the ✕, Esc and tapping the backdrop). It only engages from the top of the content and on a
  downward drag, so it never interferes with scrolling the story; a short drag springs back.
- **Light Markdown in story text** — the body supports `**bold**`, `*italic*` and `- ` bullet
  points (a tiny, safe subset — no toolbar, no headings/links/HTML, so nothing to abuse and
  nothing to sanitise; plain text is unaffected). Paragraph spacing is baked into the render.
- **"Powered by Nearmark" footer in the admin** — the backoffice sidebar now carries the same
  attribution + version the public app has, linking to the platform site. `platformUrl` now
  defaults to `nearmark.app` for the default brand (so both footers are real links); a
  white-label deploy with a custom platform name stays plain text unless it sets a URL.
- **Dashboard "Edits by editor"** — a bar chart summarising how many changes each editor has
  made (from the persistent activity log), so you can see who's been in and how active they are.
- **Dashboard "View analytics" link** — opens the PostHog dashboard (visitor/usage analytics)
  when PostHog is configured. Set `VITE_ANALYTICS_URL` to your project URL for a direct landing;
  otherwise it's derived from the PostHog host.
- **Second photo gets a credit** (migration 021) — the in-body "second photo" now takes a
  photographer/source credit + link, like the other photos, shown under it on the card. The
  whole second-photo section is now behind an **"Add a second photo"** toggle to keep the form
  tidy.
- **Separate before/after "after" image** (migration 020) — the story hero and the before/after
  slider are now independent photos. The slider has its own **After** image; left blank it
  falls back to the hero, so existing slider stops are unaffected. Previously the hero and the
  slider's "today" side were the same field, so a slider stop showed one photo twice.
- **YouTube in the story video field** — a YouTube link in a location's Video URL now shows
  as an embedded (cookie-free) player in the story body. A direct `.mp4`/`.webm` file still
  drives the muted looping hero background as before.
- **Audio transcripts (WCAG 1.2.1)** — a location with an audio narration can carry a
  plain-text transcript (migration 019). The editor shows a transcript field whenever an
  audio file is present and warns if it's missing; the public story card offers a "Show
  transcript" toggle below the player. Non-speech cues in `[square brackets]` (e.g.
  `[Sound of church bells]`) render in a muted italic style.
- **App version in the footer** (from `package.json`, baked at build).
- **Dashboard "What's new" link** — the admin Dashboard shows the running version and links
  to the GitHub Releases page (dated version history + notes). Defaults to the core repo's
  releases; overridable via `VITE_RELEASES_URL` / `VITE_REPO_URL`.
- **Guided-tour media pre-caching** — opening a tour pre-fetches all its stops' images +
  audio so the whole route works offline before the walker loses signal (best-effort;
  skips offline / Data Saver).
- **Offline banner** — a discreet "you're offline, photos may not load" notice while the
  device is offline.
- **Update notice** — when a newer release is deployed, a "tap to update" banner. It's
  gated on the version number (only bumped at releases) so it stays quiet during rapid
  edit-time deploys, and is dismissible per-version.

### Changed
- **Related locations** is now an obvious picker — **removable chips** for the current picks
  plus a **"+ Add a related stop…" dropdown** — instead of a native multi-select that needed
  Cmd/Ctrl-click to add or remove (and wiped the selection on a plain click).
- Dashboard **stat cards are now shortcuts** — clicking "Total/Published/Draft locations" opens
  the Locations list and "Total tours" opens the Tours list.
- **Story text is now paragraph-spaced** — each line break in a stop's text renders as its
  own spaced paragraph (it previously needed a blank line between paragraphs, so single-spaced
  text ran together).
- **House-style typography on displayed text** — a `typo()` helper renders content with proper
  curly apostrophes/quotes and spaced en-dashes (applied to the story card and tour detail),
  whatever an editor typed; compound hyphens and number ranges are left alone. App "no value"
  placeholders now use an en-dash too.
- Location editor: the **Video URL** field label shortened ("mp4 or YouTube") so it stays on
  one line and aligns with the Audio-duration field beside it.
- Location editor **visual tidy-up**: text inputs, selects and date fields now share one
  height so they line up; the **Visibility** panel drops its misleading heading; the
  Visibility radios / Guided-tour checkbox are larger and brand-coloured, both panels share
  the same padding, and each "learn more" note sits **inline** on the control's row (opening
  below only when tapped). The Hero crop preview fills the full column width.
- Location editor now follows the **story-page order** — the photo/image block sits **above
  the Text field** (photo first, as on the finished card). The **Hero image** is its own
  section; the **before/after slider** (its own Before + After photos) and the **audio/video**
  fields each sit behind their own toggle to keep the form tidy. The **Visibility** and
  **Guided-tour-only** explanations are now tucked into small "learn more" accordions.
- Story card: the **before/after slider now sits below the hero and the full story text**
  (it was tucked in after the first paragraph). The image caption stays under the hero photo;
  the slider carries its own before/after labels.
- Location editor tidy-ups: the narrative field is labelled **"Text"** (not "Summary text",
  since it isn't a summary), and the accent-colour swatches now have breathing room above the
  "Add a historic before photo" toggle so they don't read as one control.
- **Media-library picker** now lays photos out as a **masonry grid** — each thumbnail keeps
  the photo's own shape, so the whole image is visible (wide panoramas no longer collapse to
  a thin strip) with its filename beneath.
- Brighter, purer **amber** accent (`#FFD60A`, was `#FFC53D`): it had been muted to a mustard
  gold to survive white numbers; now that pin/stop numbers use dark ink, the true yellow
  reads better still (dark-on-yellow ≈ 12.6:1). Existing locations keep their saved hex until
  re-picked.
- Story-card external link: with no per-location label set, it now shows the link's **web
  address** (e.g. "facebook.com") instead of the app-wide default — always accurate (a
  church isn't an "artist's website").
- Location editor: the historic "before" image is now **opt-in via a toggle**; a single
  photo fills the full width instead of being squashed into half a column.
- Media cache raised to 500 entries (was 200) so a full tour's pre-cached images fit.
- Editors now use a single **Save** button with a **Published / Draft** toggle (replacing
  the separate "Save draft" / "Publish" buttons and the Tour editor's status dropdown).
- Buttons/CTAs read a themeable **`--font-button`** (a theme may set a sans where its
  heading is a delicate serif). Tollesbury's buttons are now a clean sans instead of a
  weedy serif; headings are unchanged, and other themes (e.g. LGBT) are unaffected.
- Larger bottom-nav icons and labels for easier tapping on a walk.
- The share **QR code** foreground is themeable (`qrInk`); Tollesbury's is now near-black
  instead of its bright-red accent, which read as too heavy at QR scale.
- Load the **Fraunces** font the Tollesbury theme specifies (it was falling back to the
  system serif); the cover headline uses a heavier cut (weight 800) and the mode-button
  labels a heavier/slightly larger cut.

### Added
- **Accessibility test harness** — `npm run test:a11y` (Playwright + `@axe-core/playwright`)
  builds the app in seed mode and scans the public app (cover, main shell, a story card, a
  tour detail) **and the admin backoffice** (dashboard, locations list, location editor, tours
  list, media library), failing on serious/critical WCAG 2.x A/AA issues. It runs on every PR
  (CI `a11y` job), complementing the scheduled scan of the live sites.
- **Admin demo mode** — with no Supabase configured (the seed/OSS-demo build), the admin now
  opens **read-only without a login**, so the app can be explored end-to-end (and the a11y
  tests can reach it). Production always has Supabase, so a real login is always required there.

### Fixed
- **Cream border at the screen edge on phones** — on mobile the background layers were three
  different creams (`body` a darker `--bg-deep`, the stage a gradient), so the darker one peeked
  out around the safe-area edge. All layers are now the single app cream, edge to edge.
- "Nearby stories" cards are now **all the same height** (stretched to a shared height) with
  their colour squares and titles top-aligned, instead of varying with title length.
- Media library: the **Replace / Upload** buttons (styled `<label>`s) no longer sit low out of
  line with the other buttons — they were inheriting the field-label margin.
- **Bottom safe-area insets** — content no longer slides under the phone's bottom system
  bar/gesture area. The cover, splash, city-picker and completion screens, the tour "Start
  tour" CTA, the map's bottom nav, and the story card now pad by `env(safe-area-inset-bottom)`
  (0 where there's no inset), so the "Powered by Nearmark" footer and nav icons aren't cropped.
- Admin sidebar: the **external-link icons** ("View live app", "Suggest an improvement") no
  longer float mid-block on a wrapped link — they now sit inline after the text.
- **Version footer contrast** — the "· vX.Y.Z" in the "Powered by" footer used 60% opacity,
  dropping it to ~1.9:1 (well under AA). It now uses the full footer colour (found by the new
  a11y test).
- **"Published" status badge contrast** — the green-on-mint badge was 3.1:1; darkened the
  green to clear AA (5.5:1). Also caught by the new admin a11y scans.
- **Focal-point crop previews now match the card's proportions** — the editor's crop box was
  a fixed short strip (~4:1), so the focal point you set didn't reflect what the card would
  show. It now uses the real aspect of each image on the card (hero **39:20**, before/after
  slider images **4:3**), so setting the focal point is accurate.
- **"Show this credit" toggle is now respected in the before/after slider.** A stop with a
  historic image showed the hero photographer's credit even when the credit was switched off;
  the slider view now honours `show_photo_credit` just like the single-photo view does.
- **Video URL no longer blanks the hero.** A non-file link (e.g. a YouTube *watch* URL)
  pasted into a location's Video URL used to hijack the hero as an unplayable `<video>`,
  hiding the perfectly good photo behind a blank placeholder. Only a real video file now
  drives the hero; YouTube links embed in the body; anything else is ignored. The editor
  warns when the Video URL isn't a playable file or YouTube link.
- Tour-detail hero now uses a flex layout so the **back button always sits clear of the
  "Walking Tour" tag and title** — the earlier fix only brought it in front; on a long
  two-line title the circle still overlapped the tag.
- Tour-detail **title stays on one line** (ellipsis if too long) so it can't wrap and ride up
  over the gradient, becoming unreadable. Tour titles are now capped at **21 characters** in
  the editor (with a live counter) to keep them legible.

### Added
- Image-size guidance for content editors (in the Location & Tour editors and the Media
  library): a note that uploads are optimised automatically, with a recommended web-sized
  landscape JPG (~1400px wide) so people don't upload full-resolution phone photos.

### Changed
- Tuned the client-side image optimiser tighter — cap ~1400px (was 1600) and WebP quality
  0.78 (was 0.82), so stored images are smaller (~80–250 KB) with no visible loss on the
  phone-width cards.

### Fixed
- The **Install-app prompt** used a hardcoded light-lilac text colour (built for the dark
  theme) that was unreadable on light themes; it now uses theme-aware `--ink-muted`, and
  its title is the sans button font instead of a serif.

## [1.1.0] — 2026-07-03

### Added
- Persistent **activity log** (migration 018): the Dashboard "Recent activity" feed now
  survives refreshes and shows every admin's actions with a timestamp — so you can see
  when a tester has been in and what they changed.

### Changed
- Replaced the slanted "↗" on external links/buttons with a proper external-link icon,
  consistent with the other line icons.

### Fixed
- Tour-detail **back button** no longer hidden behind the "Walking Tour" tag on tours with
  a long (two-line) title.
- Tour-detail stop numbers are larger and bolder, with a subtle shadow, and use the
  per-hue readable-ink colour (dark on light accents, white on dark) — so the small
  badges over photo thumbnails are legible on every accent colour.
- The Discovery "scan" button copy is now themeable via `VITE_DISCOVERY_SCAN_LABEL`; the
  generic default is "Scan for nearby stories" instead of the hardcoded "…history" (which
  was wrong for non-history deployments).

### Removed
- The redundant per-location **"Tour stop #"** field (and its Locations-list column). Tour
  stop numbers are derived from the order of stops within each tour, so this legacy field
  was inert, couldn't represent a stop shared across multiple tours, and only caused
  confusion. The `tour_num` column is left dormant in the database (no migration needed).

## [1.0.0] — 2026-07-03

First feature-complete release — the build entering its testing phase. Two live clients run
on this core, themed by configuration only: **Tollesbury Arts Trail** and **LGBT History UK**.

### Public app
- Mobile-first **PWA**: installable to the home screen, offline-capable (app shell, map
  tiles and viewed media cached).
- Live **Leaflet + OpenStreetMap** map with hue-coloured, numbered pins.
- Two modes: **guided tours** (ordered route, GPS arrival within a trigger radius,
  next-stop tracking) and **discovery** (proximity-triggered stories).
- **Story cards**: hero photo with focal point, before/after slider, second photo, audio
  narration, credits, category/period tags, an external "read more" link, and nearby stories.
- **Road/path-following walking routes** for tours via OpenRouteService, drawn offline.
- **Share** sheet with a brand-coloured **QR code** (for in-person sharing) plus native
  share and copy-link.
- **Deep links**: `?story=<slug>` and `?tour=<slug>` — shareable, and used by the admin's
  Preview buttons.

### Admin backoffice
- Supabase email/password auth with optional **two-factor (TOTP)** and an MFA-aware
  password reset.
- **Dashboard** (live counts + session activity), **Locations** and **Tours** managers.
- **Location & Tour editors**: click-to-place map pin, accent picker, image upload +
  **media-library picker** + in-place replace, focal point, alt/caption/credits with
  show/hide toggles, per-location link-button label, "guided tour only" flag.
- **Tour editor**: drag/keyboard stop reordering, per-stop overrides, **Calculate walking
  route**, collapsible event window.
- **Media library** (list / upload / replace / delete + metadata) and **User management**.
- **Preview** buttons (open a location or tour in the live app), hero **thumbnails** on the
  Locations list, and an **unsaved-changes guard**.

### Platform
- **White-label** via `VITE_*` config + themes — no component edits per client.
- **Supabase** backend: Postgres with row-level security, Auth, Storage, and Edge Functions
  (`admin-users`, `compute-route`). Schema + migrations `002`–`017`.
- Accessibility to **WCAG 2.1 AA**, including per-hue readable number contrast; axe-core CI.
- **Docs**: [README](README.md) (setup) and [FSD](docs/FSD.md) (functional spec).

[1.2.0]: https://github.com/JHarbourne/nearmark-app/releases/tag/v1.2.0
[1.1.0]: https://github.com/JHarbourne/nearmark-app/releases/tag/v1.1.0
[1.0.0]: https://github.com/JHarbourne/nearmark-app/releases/tag/v1.0.0
