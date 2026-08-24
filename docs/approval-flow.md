# Artist / owner approval flow

**Status:** built and live (shipped in `1.10.0`). This is the self-service
"participant approves their own listing" piece that [`consent-intake-spec.md`](consent-intake-spec.md)
described as deferred. That spec's fuller vision (an emailed intake form that also
*collects* content) is still future work; what's built today is the **approval**
half — an organiser prepares a draft card, and the owner previews and signs it off.

## What it's for

On a **participatory** tour (an arts trail, open gardens, a charity trail) each stop
belongs to a different person. Rather than publish their listing unseen, each owner
gets a private link to preview their own story card exactly as it will appear and
approve it. Their story stays a draft, and the tour stays unpublished, until an
organiser publishes it. **Curated** tours (a local-history walk written entirely
in-house) don't use this — they keep the public "Suggest a correction" link instead.

## Moving parts

### Data
- **`participants`** (migration 032) — one private row per story: `contact_email`,
  `contact_mobile`, a unique `token`, `status`, consent columns. RLS is **admin-only /
  no anon** — it never appears in the public `select('*')` read path, so contact PII
  can't leak. Migration 034 adds `name`, `keep_details`, `address_input`,
  `address_changed`; migration 033 adds `approval_note` + the token default/backfill.
- **`tours.participatory`** (migration 035) — boolean, default `false`. Marks a tour
  as owner-managed and hides the public feedback link on its cards.

### The `/approve/<token>` page (`src/approve/`)
A dedicated, login-free mini-app (own Vite entry `approve.html` → `src/approve/main.js`),
kept separate from the public app + admin so it ships only the `StoryCard` render path
and can never reach the rest of the data. It:
- reads the token from the path (Vercel rewrite `/approve/:token → /approve.html`) or
  `?token=` as a dev fallback,
- shows the owner **only their own** draft card (reuses `StoryCard` with the `embedded`
  prop),
- lets them confirm the address (a solo location is editable → sets `address_changed`
  for an admin re-pin; a shared venue is read-only), add a website/social link, tick
  opt-in consent, and approve — or leave a correction note instead.

### Security — two RPCs, no enumeration
The only public door to a draft story is two `SECURITY DEFINER` RPCs (migrations
033/034), each with a fixed `search_path`, `revoke from public` then `grant to anon`,
and scoped strictly by token:
- **`approval_card(p_token)`** → the card fields for that one token (or nothing).
- **`approval_submit(p_token, …)`** → records consent + the owner's edits/note.

`participants` itself stays anon-denied; there is no way to list tokens or reach
another owner's card.

### Admin
`OwnerContact.vue` (hosted under the map in the Location editor) holds the owner's
email + mobile, shows **Pending / Approved** with who approved and when, the owner's
note, and an **address-changed → re-pin** flag. It surfaces the approval link with
one-tap **Copy / Text (`sms:`) / WhatsApp (`wa.me`) / Email (`mailto:`)** send buttons,
each pre-filled with a friendly message. `TourEditor.vue` carries the **Participatory
tour** toggle.

### Notifications (per-deployment, optional)
A DB trigger (`pg_net` → Brevo transactional API) can email the organisers when a
participant's status first flips to `approved`, including their note and the re-pin
flag. Lives outside this repo (per-instance SQL), because the sender + API key are
deployment-specific. Requires the Brevo sender to be verified and — a common gotcha —
Brevo's **Authorised IPs** restriction to be **off for API keys** (Supabase sends from
rotating IPs).

## Config
- **`VITE_PRIVACY_URL`** — privacy/consent policy link shown on the approval page;
  blank hides the link.

## Deploying to an instance
1. Run migrations **032 → 035** on that instance's Supabase.
2. Set `VITE_PRIVACY_URL` and redeploy.
3. Seed a `participants` row (with a token) per owner-managed story.
4. Mark the tour **Participatory** in the admin.
5. (Optional) install the per-instance Brevo approval-notify trigger.

## Not yet built
- The **intake** half of `consent-intake-spec.md` (owners submit their own text +
  photos, not just approve a prepared card).
- **Approximate pins** — `coarse_pin` exists on locations but the public `MapView`
  still plots exact coordinates; an exact-vs-approximate privacy option needs a
  `MapView` + admin change.
