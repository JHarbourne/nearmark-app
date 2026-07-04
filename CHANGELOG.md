# Changelog

All notable changes to Nearmark are recorded here. This project follows
[Semantic Versioning](https://semver.org) (`MAJOR.MINOR.PATCH`). During the testing phase,
bug fixes bump the **patch** version; new features bump the **minor**.

The [README](README.md) is documentation; this file is the release history.

## [Unreleased]

### Changed
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

[1.1.0]: https://github.com/JHarbourne/nearmark-app/releases/tag/v1.1.0
[1.0.0]: https://github.com/JHarbourne/nearmark-app/releases/tag/v1.0.0
