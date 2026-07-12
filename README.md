# Nearmark

**Deploy your own location-aware heritage walking guide.**

Nearmark is an open-source platform for building a mobile, map-based history guide to a
place – a queer-history trail, an arts walk, a pub crawl, an architecture tour, anything
tied to locations in a city. Visitors open it in their phone browser (or install it as an
app), explore a live map, and unlock illustrated, narrated stories as they walk – either
following a **guided tour** or wandering in **discovery mode**, where stories pop up when
they get near a site.

It comes with a simple admin backoffice so a non-technical team can manage all the
content themselves – no code, no spreadsheets.

---

## What this is

- **A public mobile web app (PWA)** – live OpenStreetMap map, story cards with photos,
  audio narration, before/after photo sliders, guided tours and proximity discovery.
  Installable to the home screen and works offline.
- **An admin backoffice** (`/admin`) – add and edit locations and tours, upload photos
  and audio, drag-to-reorder stops, publish/draft, manage editors. Fully keyboard- and
  screen-reader-accessible (WCAG 2.1 AA).
- **A backend on Supabase** – Postgres database, email/password admin auth, and file
  storage, all protected by row-level security.

Built with **Vue 3 + Vite**. Hosted free on **Vercel**. One codebase serves two pages:
the public app (`index.html`) and the admin (`admin.html`, served at `/admin`).

This repository is the platform. The branding, copy, content and integrations all come
from configuration – so you can stand up your own instance without editing component code.

> **Deeper reference:** [`docs/FSD.md`](docs/FSD.md) is the functional specification –
> features, data model, and architecture in one place.

---

## Prerequisites

You'll need (all have free tiers):

- **Node.js 20+** and npm – to run and build the app locally.
- A **Supabase account** – the backend (database, admin login, file storage).
- A **Vercel account** – to host the live site. (Any static host works; Vercel is the
  documented path.)
- A **GitHub account** – to fork the repo and connect it to Vercel for auto-deploys.

You do **not** need to be a senior engineer. If you can copy files, paste values into a
form, and run a couple of commands, you can deploy this. The steps below assume you're a
developer setting it up on behalf of an organisation.

---

## Setup in 5 steps

### 1. Fork the repo

Fork this repository to your own GitHub account, then clone your fork:

```bash
git clone https://github.com/YOUR-USERNAME/nearmark-app.git
cd nearmark-app
npm install
```

### 2. Create a Supabase project

1. In [supabase.com](https://supabase.com), create a new project. Pick a region near your
   audience and save the database password somewhere safe.
2. Open **Project Settings → API** and copy two values for step 4:
   the **Project URL** and the **publishable (anon) key**.

### 3. Run the schema + migrations

In the Supabase dashboard, open the **SQL Editor**, then paste-and-run, in order:

1. `schema.sql` – tables, security policies, the `media` storage bucket
2. `seed.sql` – *(optional)* example rows; skip it if you'll add your own content
3. **Every `migration-*.sql` file in numerical order** – `migration-002-…` through
   `migration-017-…`. Each one is small, additive and idempotent (`add column if not
   exists`), so run them all to bring the schema up to date; re-running is harmless.

> Running a client on the shared core? Any time you `git pull` new features, check for new
> `migration-*.sql` files and run them in each Supabase project – a missing column shows up
> as a "Save failed" in the admin.

Then create your first admin user: **Authentication → Users → Add user → Create new
user**, set an email + password, and tick **Auto Confirm User**. Keep **"Allow new users
to sign up" turned off** so only people you invite can reach the admin.

> **Branded invite emails (optional).** By default invites come from "Supabase Auth". To
> send them from your app instead, paste the branded templates and configure custom SMTP —
> see [`supabase/email-templates/`](supabase/email-templates/).

### 4. Set your `.env`

Copy the example and fill it in:

```bash
cp .env.example .env
```

At minimum set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (from step 2). Everything
else is optional – set `VITE_APP_NAME`, colours and copy to brand the app for your
organisation. See the [Configuration reference](#configuration-reference) below. Run it
locally to check:

```bash
npm run dev      # public app → http://localhost:5173/   admin → /admin.html
```

Sign in to `/admin.html` with the user you created and add a location or two. (With no
Supabase configured, the app falls back to bundled example content so you can preview the
look first.)

### 5. Deploy to Vercel

1. In [vercel.com](https://vercel.com), **Add New → Project**, and import your forked repo.
2. Framework preset: **Vite**. Build command `npm run build`, output directory `dist`
   (Vercel detects these).
3. Under **Settings → Environment Variables**, add the same variables from your `.env`.
4. Deploy. Every push to `main` thereafter auto-deploys.

Your app is now live at `your-project.vercel.app`, with the admin at `/admin`. To use your
own domain, add it under Vercel → Domains.

---

## Content management

Day-to-day content – locations, tours, photos, audio – is all managed in the admin
backoffice at **`/admin`**, no code required. Sign in with a Supabase user, then add
locations (drop a pin on the map, write the story, upload images), group them into tours,
and publish. Drafts stay hidden from the public app until published.

The editor also supports: a **media-library picker** (reuse an uploaded photo across
locations without re-uploading), in-place **image replace**, **before/after photo
sliders**, per-photo and per-cover **credit toggles**, a per-location **link-button label**,
a **"guided tour only"** flag (hide a stop from Discovery mode), **Preview** (open a
location or tour in the live app in a new tab; also shareable via `?story=<slug>` /
`?tour=<slug>`), road-following **walking routes** (below), and an **unsaved-changes
guard**. Admin login supports optional **two-factor (TOTP)**. Every screen is keyboard-
and screen-reader-navigable (WCAG 2.1 AA).

---

## Optional features (Supabase Edge Functions)

Two admin features are powered by [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
in `supabase/functions/`. They're optional – the app degrades gracefully without them –
but deploy them (with the [Supabase CLI](https://supabase.com/docs/guides/cli)) to enable:

**User management** – `admin-users` powers the screen for inviting/listing/removing admins:

```bash
supabase functions deploy admin-users --project-ref YOUR_PROJECT_REF
```

**Road-following walking routes** – `compute-route` snaps a tour's route to real
footpaths and roads (via [OpenRouteService](https://openrouteservice.org)) instead of
straight "crow-flies" lines:

1. Create a free API key at [openrouteservice.org/dev](https://openrouteservice.org/dev).
2. Store it as a secret, then deploy the function:
   ```bash
   supabase secrets set ORS_KEY='YOUR_FULL_ORS_KEY' --project-ref YOUR_PROJECT_REF
   supabase functions deploy compute-route --project-ref YOUR_PROJECT_REF
   ```
3. In the admin, open a tour → **Calculate walking route** → **Save**. The path is
   computed once and stored on the tour (`route_geometry`), so the app draws it **offline**
   with no per-visit API calls. A tour with no calculated route just falls back to straight
   lines, and the stored route auto-clears when you change the tour's stops.

---

## Configuration reference

Every value is optional and overridable via a `VITE_*` variable in `.env` (or in Vercel's
environment variables). Blank values fall back to generic Nearmark defaults. Visual theme
tokens (palette, fonts) live in [`src/theme.js`](src/theme.js) and
[`src/lib/tokens.js`](src/lib/tokens.js); identity and copy come from these variables:

| Variable | What it controls |
|---|---|
| `VITE_APP_NAME` | Product name – browser tab title and installed-app name |
| `VITE_APP_SHORT_NAME` | Short name shown under the home-screen icon |
| `VITE_ORG_NAME` | Wordmark shown top-left in the app |
| `VITE_BRAND_BARS` | Logo-mark bar colours, comma-separated hex (blank = neutral default) |
| `VITE_LOGO_URL` | Optional in-app logo image URL; blank shows the wordmark + bar mark (never another org's logo) |
| `VITE_ICON_URL` | Optional install icon (square ~512px PNG URL) → PWA manifest + favicon + apple-touch; blank = bundled neutral placeholder |
| `VITE_APP_DESCRIPTION` | Meta description – baked into the static `<meta>` + Open Graph/Twitter card, so link-preview scrapers (WhatsApp, iMessage…) show it |
| `VITE_THEME_COLOR` | Browser UI / PWA splash colour (hex); also the static first-paint page background, so a light theme doesn't flash dark while the app boots |
| `VITE_THEME` | Named palette in [`src/themes`](src/themes) (e.g. `tollesbury`); blank = default dark |
| `VITE_PUBLIC_URL` | Canonical URL for the "Share this app" feature (blank = current site origin) |
| `VITE_COVER_HEADLINE` | Big cover headline; `{city}` is replaced with the city name |
| `VITE_COVER_INTRO` | Cover intro line; supports `{city}` |
| `VITE_SPLASH_TITLE` | Title on the first (location-permission) screen |
| `VITE_SPLASH_BODY` | Body text on the first screen |
| `VITE_DISCOVERY_PROMPT` | Text shown when prompting to enable location for Discovery |
| `VITE_DISCOVERY_SCAN_LABEL` | Discovery "scan" button label (default `Scan for nearby stories`; e.g. `…history`, `…places of interest`) |
| `VITE_COMPLETION_MESSAGE` | Message on the "tour complete" screen |
| `VITE_STORY_LINK_LABEL` | Label for a location's external link, e.g. `Visit the artist’s website` (the link hides when a location has no URL) |
| `VITE_FEEDBACK_EMAIL` | Recipient for the story card's "Suggest a correction" `mailto:` link, e.g. `you@example.org` (blank hides the link) |
| `VITE_CONTENT_SOURCE_LABEL` | Attribution credit, e.g. `example.org` (blank hides it) |
| `VITE_PLATFORM_NAME` | "Powered by …" footer attribution (default `Nearmark`) |
| `VITE_PLATFORM_URL` | Link for the platform name (blank = plain text) |
| `VITE_CONTENT_SOURCE_NOTE` | Sourcing paragraph in Settings (blank hides it) |
| `VITE_WIKI_BASE_URL` | Base URL for article links + admin URL validation |
| `VITE_REPO_URL` | "Source code" link in the admin (blank hides it) |
| `VITE_SUPABASE_URL` | Supabase project URL (backend) |
| `VITE_SUPABASE_ANON_KEY` | Supabase publishable/anon key (safe in the client) |
| `VITE_POSTHOG_KEY` | PostHog project token for analytics (blank disables) |
| `VITE_POSTHOG_HOST` | PostHog host (default EU cloud) |
| `VITE_ANALYTICS_URL` | PostHog project URL for the admin "Open in PostHog" link (blank = derived from the host) |
| `VITE_ANALYTICS_EMBED_URL` | PostHog shared-dashboard **Embed** URL to show analytics inside the admin (blank = link out only) |
| `VITE_CITY_NAME` | Active city label, e.g. `Tollesbury` (blank = bundled seed city) |
| `VITE_CITY_AREA` | City sub-label, e.g. `Essex` |
| `VITE_CITIES` | Admin city options, comma-separated (e.g. `London,Brighton`); blank = just `VITE_CITY_NAME` (single-city sites skip the public city picker) |
| `VITE_MAP_CENTER_LAT` / `VITE_MAP_CENTER_LNG` | Initial map centre |
| `VITE_MAP_ZOOM` | Initial map zoom level |
| `VITE_MAP_PMTILES_URL` | Offline vector basemap: a per-deployment Protomaps `.pmtiles` file URL (served with HTTP range support, e.g. Supabase Storage). Blank → online-only raster OSM. See `docs/maplibre-migration.md` |

**App icons & logo (white-label).** The icons shipped in `public/`
(`icon-192.png`, `icon-512.png`, `apple-touch-icon.png`, `favicon-48.png`) are
**neutral Nearmark placeholders** – a fresh deployment never displays another
organisation's logo. A deployment supplies its own branding entirely through env,
without touching the shared codebase:

- **`VITE_ICON_URL`** – the install/home-screen icon (a square ~512px PNG URL,
  e.g. on the client's Supabase Storage/CDN). At build time it's wired into the
  PWA manifest, favicon and apple-touch link. Blank → the neutral placeholders.
- **`VITE_LOGO_URL`** – the in-app logo image. Blank → the `VITE_ORG_NAME`
  wordmark beside the neutral bar mark (`VITE_BRAND_BARS`).

(Forked/standalone deployments can instead just replace the four files in
`public/`.)

To rebrand further, adjust the colour/font tokens via `VITE_THEME` /
[`src/themes`](src/themes). Starter content for testing lives in `src/data/seed.js`.

---

## Licence

[MIT](LICENSE) – free to use, modify and deploy, including commercially. Copyright (c)
2026 Jonathan Harbourne / Nearmark.
