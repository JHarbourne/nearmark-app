# Staging environment — runbook

Why: the Stories restructure nearly caused an outage because a **destructive migration (026) ran against production before the app was ready**. A staging environment lets you rehearse the whole change — schema + app — against a copy of real data, so production only ever sees changes you've already watched work.

This is written for how Nearmark actually ships: one repo (`nearmark-app`) → `main` auto-deploys to each client's Vercel project, each backed by its own Supabase project. Migrations are run by hand in the Supabase SQL Editor.

---

## The model

```
                    ┌─ prod:  Tollesbury Supabase  ← tollesbury-app.vercel.app (main)
 nearmark-app repo ─┤        LGBT Supabase        ← lgbthistoryuk-app.vercel.app (main)
                    └─ STAGING: one Supabase project ← preview deploy (any non-main branch)
```

You do **not** need a staging copy of every client — **one** staging Supabase project (a clone of Tollesbury, the richest data) is enough to prove a schema+app change before it touches any production project.

---

## Part A — one-time setup (≈ 45–60 min)

### A1. Create the staging Supabase project
1. Supabase dashboard → **New project** → name it `nearmark-staging` (same region as Tollesbury).
2. Note its **Project URL** and **anon key** (Settings → API). You'll need them in A3.

### A2. Give staging the schema + a data snapshot
**Schema** — recreate it from the migration files in `supabase/`:
1. In the staging **SQL Editor**, run `schema.sql`.
2. Then run `migration-002…` through `migration-027` **in order** (they're idempotent). This lands staging on the exact current schema.
   - Skip the parked permissions drafts (022–024) for now — they aren't in production either.

**Data** — clone Tollesbury's public tables (needs the Supabase CLI or `pg_dump` once; run from your Mac, not here — it uses the DB password):
```bash
# connection string: Tollesbury → Settings → Database → Connection string (URI)
pg_dump "postgresql://postgres:[PW]@db.wijnnlzxjerymjrlvblv.supabase.co:5432/postgres" \
  --data-only --no-owner --schema=public \
  -t locations -t stories -t tours -t media -t activity_log \
  -f tollesbury-data.sql
```
Then paste/run `tollesbury-data.sql` in the **staging** SQL Editor.
- **Images don't need cloning** — locations/stories store public image *URLs* that point at Tollesbury's storage bucket; they'll render fine from staging. (You're testing data + behaviour, not re-hosting media.)
- Alternative if you don't want the CLI: just run `supabase/seed.sql` on staging for generic test data. Lower fidelity but zero fuss.

### A3. Create a staging admin login
Staging → **Authentication → Users → Add user** → your email + a password (staging-only). This is the account you'll log into the staging admin with.

### A4. Point a preview deploy at staging (no new Vercel project needed)
On an existing Vercel project for this repo (use **tollesbury-app**):
1. Settings → **Environment Variables**.
2. For `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, add a **second value scoped to the `Preview` environment** = the **staging** project's URL/key from A1. Leave the existing `Production`-scoped values (Tollesbury) untouched.
3. Every other `VITE_*` (brand name, icon, map centre…) stays as-is — those are shared, so Preview inherits them.

Now **any branch that isn't `main`** deploys to a Vercel **Preview URL that talks to the staging database**, while `main` keeps deploying production against Tollesbury. That's your staging environment.

> Optional nicety: in Vercel → Settings → Domains, alias a branch (e.g. `staging`) to a stable URL like `nearmark-staging.vercel.app` so the link never changes.

### A4b. (Recommended) A dedicated staging *project* with a stable URL

A4 reuses the Tollesbury project's Preview slot — quickest, but the URL changes per branch and staging shares the production project's settings. For a stable link you can hand testers, and a clean separation from the live projects, give staging its **own** Vercel project:

1. Vercel → **Add New → Project** → import `JHarbourne/nearmark-app` again. (One repo can back many projects — that's how the whitelabel setup already works.)
2. Name it `nearmark-staging`. Under **Settings → Git**, set the **Production Branch** to `staging` (not `main`). This project now only ever builds the `staging` branch, so your real Tollesbury/LGBT projects are never affected by staging work.
3. **Environment Variables** → add the `VITE_*` set pointing at the **staging Supabase** (A1), and copy the branding/map vars from Tollesbury so it looks real. Set `VITE_APP_NAME` to something like `Tollesbury (STAGING)` so nobody ever mistakes staging for the live app.
4. **Domains** → add a stable alias such as `staging.nearmark.app` (add the DNS record Vercel shows you), or just use the free `nearmark-staging.vercel.app`.

> ⚠️ **Env var gotcha:** don't bulk-paste a `vercel env pull` file into the staging project — `vercel env pull` returns **blank** values for any "Sensitive" variable, so you'd set everything to empty strings (empty Supabase creds → the app silently falls back to demo/seed data). Type the values you need by hand, keep `VITE_*` **non-sensitive** (they're public anyway), and remember env changes need a **redeploy**. Full write-up in `docs/maplibre-migration.md`.

The `staging` branch already exists in the repo. The release flow becomes: work on a feature branch → **merge into `staging`** (auto-deploys to the staging URL) → verify there → **merge `staging` into `main`** (releases to production). Nothing reaches a live app without passing through the staging URL first.

---

## Part B — the release checklist (use this for every structural change)

This is the part that prevents another 026. The rule: **expand → deploy → contract**, each step proven on staging first.

> **Front-end-only changes** — those that touch no database schema (e.g. the Leaflet→MapLibre map rewrite, a component or styling change) — skip the migration steps entirely. For those the flow is just: branch → merge to `staging` → verify on the staging URL (ideally on a real phone) → merge to `main`. Parts A1–A3 and steps 2–3, 6, 8 below apply **only** when a change touches the database.

1. **Branch:** `git checkout -b feature/xyz` off `main`.
2. **Write the additive migration** (new tables/columns, backfill, RLS) — never drop anything yet.
3. **Run the additive migration on STAGING** (SQL Editor). Run its VERIFY query.
4. **Push the branch** → open the **Preview URL** (staging DB). Test **both**:
   - Public app: the affected screens render, nothing blank.
   - Admin: log in (A3 account), create/edit/save the affected records — no missing-column errors.
5. **Merge to `main`** → production deploys. The app is now additive-compatible (old columns still there, new code tolerant).
6. **Run the additive migration on each PRODUCTION project** (Tollesbury, then LGBT), VERIFY each.
7. **Watch production** briefly (public + admin).
8. **Only now** run the **destructive migration** (drops) — on **staging first**, re-test on the Preview URL, then on each production project. Take a Supabase snapshot before the prod drop.

If any step looks wrong, you stop there — production is still on the previous, working shape.

> Compare with what happened last time: 025 (add) and 026 (drop) were both run on production before the app was deployed. Steps 4–7 above are exactly the gap.

---

## Part C — keeping staging fresh

Staging data drifts from production over time. When you want a fresh copy before a big change, re-run the A2 `pg_dump` → staging import (truncate the tables first, or reset the staging DB). Monthly, or before any risky change, is plenty.

---

## Cost & notes
- A second Supabase project on the free tier is £0; a preview deploy on Vercel is included. So staging is essentially free.
- Supabase also has a native **Preview Branches** feature (auto-clones schema per Git branch) — cleaner but a paid add-on and more setup. The manual project above is the pragmatic start; revisit branches if this grows.
- Storage/auth are **not** cloned (URLs point at prod storage; you make a staging admin by hand) — intentional, keeps setup light.
- Keep destructive migrations (`drop column`, `drop table`) in their **own** file, separate from the additive one, so step 8 is a deliberate, standalone action — as we did with 025 vs 026.
