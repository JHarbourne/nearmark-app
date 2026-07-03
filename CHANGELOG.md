# Changelog

All notable changes to Nearmark are recorded here. This project follows
[Semantic Versioning](https://semver.org) (`MAJOR.MINOR.PATCH`). During the testing phase,
bug fixes bump the **patch** version; new features bump the **minor**.

The [README](README.md) is documentation; this file is the release history.

## [Unreleased]

### Fixed
- Tour-detail stop numbers are larger and bolder, with a subtle shadow, and use the
  per-hue readable-ink colour (dark on light accents, white on dark) — so the small
  badges over photo thumbnails are legible on every accent colour.

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

[1.0.0]: https://github.com/JHarbourne/nearmark-app/releases/tag/v1.0.0
