# Map migration — Leaflet/OSM → MapLibre + PMTiles

Status and runbook for moving the **public** map off the OpenStreetMap tile server
(whose usage policy forbids the offline prefetch we need) onto a self-hosted
Protomaps vector basemap. The admin map (`PlaceMap.vue`) intentionally stays on
Leaflet.

## Status

- ✅ **Done & verified on staging.** `MapView.vue` rewritten on MapLibre GL; renders
  a self-hosted `.pmtiles` vector basemap via the `pmtiles://` protocol. Pins, the
  road-following GeoJSON route line, GPS marker, fit-to-bounds, zoom control and all
  overlay chrome work. Confirmed on the staging URL with real Tollesbury data + a
  Tollesbury tile extract (2.4 MB). Off the OSM tile server → policy issue resolved.
- ⏳ **Offline caching — NOT done yet.** The map currently works **online only**. The
  next stage is pre-caching the `.pmtiles` file + font glyphs in the service worker so
  the map works in airplane mode / poor signal (the original reason for the migration).
- 🎨 **Branding on staging** still shows the "London / Nearmark" demo defaults — cosmetic
  (see "Env var gotchas" below); does not affect the map.
- 🚢 **Not shipped to production.** Lives on `feature/maplibre-offline-maps`, merged into
  `staging` only. `main` is still Leaflet.

## What changed

| File | Change |
|---|---|
| `src/components/MapView.vue` | Full rewrite: Leaflet → MapLibre GL + `pmtiles` + `@protomaps/basemaps` |
| `src/config.js` | Added `mapPmtilesUrl` (`VITE_MAP_PMTILES_URL`) |
| `src/main.js` | Public entry: `leaflet.css` → `maplibre-gl.css` (admin keeps Leaflet) |
| `package.json` | Added `maplibre-gl`, `pmtiles`, `@protomaps/basemaps` |

Basemap style: `@protomaps/basemaps` `layers('protomaps', LIGHT, {lang:'en'})`; glyphs +
sprite from `protomaps.github.io/basemaps-assets`. Fallback to raster OSM when
`VITE_MAP_PMTILES_URL` is unset (keeps un-migrated deployments working).

## Generating a per-deployment `.pmtiles` extract (run on a real machine, not CI)

Each deployment needs its own small vector extract of its area. Recipe (macOS):

```bash
brew install pmtiles                     # Homebrew core; NOT the old protomaps/tap
# pick a recent build date from https://maps.protomaps.com/builds/
pmtiles extract https://build.protomaps.com/<YYYYMMDD>.pmtiles area.pmtiles \
  --bbox=<west,south,east,north>
pmtiles show area.pmtiles                 # sanity check: bounds, ~few MB
```

Tollesbury used `--bbox=0.78,51.72,0.90,51.80` → 2.4 MB. Host it where **HTTP range
requests** are served (Supabase Storage `media` bucket works) and set the public URL as
`VITE_MAP_PMTILES_URL`. LGBT History will need its **own** London extract + URL.

## Remaining work

1. **Offline stage** — pre-cache the `.pmtiles` + Protomaps glyphs so the map works
   offline; add a SW runtime-cache rule for the tile host + glyph CDN; verify on a device
   in airplane mode. (Also lazy-load MapLibre — it added ~800 KB to the bundle.)
2. **Ship** — merge `feature/maplibre-offline-maps` → `staging` → `main`. Before/at merge,
   set `VITE_MAP_PMTILES_URL` on **each** production project (Tollesbury; LGBT after its
   extract exists). Un-set = harmless raster-OSM fallback, so the merge is safe.

## Env var gotchas (hard-won — read before touching Vercel env vars)

- **`VITE_` vars are public** (baked into the browser bundle). The Supabase anon/publishable
  key belongs here and is safe to expose — RLS is the boundary. Don't use the **secret**
  Supabase key client-side (it bypasses RLS).
- **Supabase key naming:** `anon` (old) = `publishable` (new) = the public client key →
  goes in `VITE_SUPABASE_ANON_KEY`. `service_role` (old) = `secret` (new) = server-only.
- **`vercel env pull` returns BLANK values for "Sensitive" variables** — it cannot read
  them. So do **not** bulk-paste a pulled `.env` back into another project: you'll set
  everything to empty strings. (This was the root cause of a long staging debugging session
  — empty Supabase creds → the app fell back to demo/seed data, *not* a "sensitive vars
  don't build" problem. Sensitive vars build fine; the pulled values were just blank.)
- **Vercel env changes need a redeploy** to take effect (`VITE_` bakes at build time).
- Scope staging vars to **Production** — the `nearmark-app-staging` project's `staging`
  branch deploys to its *Production* environment.
