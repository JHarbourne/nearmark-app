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

In the Supabase dashboard, open the **SQL Editor**, then paste-and-run each file from the
`supabase/` folder **in order**:

1. `schema.sql` – tables, security policies, the `media` storage bucket
2. `seed.sql` – *(optional)* example rows; skip it if you'll add your own content
3. `migration-002-positions-and-order.sql`
4. `migration-003-tour-cover.sql`
5. `migration-004-historic-credit.sql`
6. `migration-005-alt-text.sql`
7. `migration-006-caption-links.sql`
8. `migration-007-slider-labels.sql`
9. `migration-008-media-metadata.sql`

Then create your first admin user: **Authentication → Users → Add user → Create new
user**, set an email + password, and tick **Auto Confirm User**. Keep **"Allow new users
to sign up" turned off** so only people you invite can reach the admin.

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
| `VITE_APP_DESCRIPTION` | Meta description (search/share preview) |
| `VITE_THEME_COLOR` | Browser UI / PWA splash colour (hex) |
| `VITE_THEME` | Named palette in [`src/themes`](src/themes) (e.g. `tollesbury`); blank = default dark |
| `VITE_PUBLIC_URL` | Canonical URL for the "Share this app" feature (blank = current site origin) |
| `VITE_COVER_HEADLINE` | Big cover headline; `{city}` is replaced with the city name |
| `VITE_COVER_INTRO` | Cover intro line; supports `{city}` |
| `VITE_SPLASH_TITLE` | Title on the first (location-permission) screen |
| `VITE_SPLASH_BODY` | Body text on the first screen |
| `VITE_DISCOVERY_PROMPT` | Text shown when prompting to enable location for Discovery |
| `VITE_COMPLETION_MESSAGE` | Message on the "tour complete" screen |
| `VITE_STORY_LINK_LABEL` | Label for a location's external link, e.g. `Visit the artist’s website` (the link hides when a location has no URL) |
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
| `VITE_CITY_NAME` | Active city label, e.g. `Tollesbury` (blank = bundled seed city) |
| `VITE_CITY_AREA` | City sub-label, e.g. `Essex` |
| `VITE_MAP_CENTER_LAT` / `VITE_MAP_CENTER_LNG` | Initial map centre |
| `VITE_MAP_ZOOM` | Initial map zoom level |

To rebrand further: replace the icons in `public/` (`icon-192.png`, `icon-512.png`,
`apple-touch-icon.png`, `favicon-48.png`), and adjust the colour/font tokens in
`src/lib/tokens.js`. Starter content for testing lives in `src/data/seed.js`.

---

## Licence

[MIT](LICENSE) – free to use, modify and deploy, including commercially. Copyright (c)
2026 Jonathan Harbourne / Nearmark.
