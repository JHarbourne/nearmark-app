# Consent & content intake — spec (draft)

> **Update (1.10.0):** the **approval** half of this spec is now built and live — owners
> preview and sign off a prepared draft card via a tokenised `/approve/<token>` page.
> See [`approval-flow.md`](approval-flow.md). What remains deferred here is the **intake**
> half: owners submitting their *own* text + images, rather than approving a card an
> organiser prepared.

**Status:** draft for build **after** the 2026 Tollesbury Arts Trail (feature-freeze/testing phase now).
**Origin:** Anita (Arts Trail organiser) struggles to collect written permission from householders/artists
opening their homes. Paper forms are slow to chase and weak to audit. Jonathan's proposal: one emailed,
tokenised web form that (a) captures GDPR-valid consent, (b) collects the participant's own text + images,
and (c) sets expectations that we edit for consistency and they approve the final page before it goes live.

Related: [[deferred-tour-permissions]] (admin RBAC — separate), the existing admin-side consent fields
(`consentGiven/consentContact/consentRecordedAt/consentRecordedBy/consentNoticeVersion`,
`VITE_CONSENT_NOTICE_VERSION`) + Private visibility + event-window RLS, the Moxii token-keyed self-removal
RPC pattern, and the pending Brevo-branded email work.

## What already exists (reuse, don't rebuild)
- **Private visibility** + **event-window** publication RLS: a home address stays hidden except during a
  set window. Already built for exactly this scenario.
- **Admin-attested consent**: the Location editor already stamps who recorded consent, when, the contact,
  and the **notice version**. Today it assumes consent was gathered *offline*.
- **This spec adds the missing half**: the participant gives consent + submits content *themselves*, via a
  no-login tokenised page — removing Anita's chasing, not just recording the result.

## The flow (participant-facing, no login)
1. **Invite email** (Brevo, branded). Personalised, one button: "Open your Arts Trail page". Links to a
   tokenised URL — random token only, **no PII in the URL/query string**.
2. **One page, three short sections:**
   - **a. What we'll do with your details (plain English).** e.g. *"Your name and address will appear in
     the free Arts Trail app from [DATE] to [DATE] — roughly a few weeks either side of the trail — so
     visitors can find you. After that we remove them. Your details are never sold or used for anything
     else."* Plus a one-line link to the fuller privacy note (versioned).
   - **b. Consent** — a single **unticked** checkbox: *"I agree to my name and address being shown in the
     app for the dates above, and I give permission to publish the words and images I submit below. I
     understand you may lightly edit them for consistency and that I'll approve the final page before it
     goes live. I can withdraw at any time."* (Affirmative action + specific + informed + demonstrable.)
   - **b2. (Optional) Keep for future events** — a **second, separate, unticked** box:
     *"Also keep my details for future [Trail] events so I don't have to fill this in again. We'll email
     you before each one to confirm you're still happy, and you can withdraw any time."* Must be genuinely
     optional — taking part can't depend on it.
   - **c. Your content** — free-text box **with a template/prompt** (see below) + **image upload**
     (with a line: *"I confirm I took these photos or have permission to use them."*).
3. **Submit** → confirmation screen + confirmation email. Status becomes `submitted`.
4. **We edit** for consistency (admin). Status `in-review`.
5. **Approval email** with a tokenised **preview link** to the *final rendered page*. One button:
   "Approve for publishing". Status `awaiting-approval` → `approved`.
6. **Publish** happens automatically only within the event window (existing RLS). Status `published`.
7. **Withdrawal** link present in every email and on the page: one click → `withdrawn`, page unpublished.

## Content template (shown in section c)
A short prompt so participants know what to write, reducing editing:
> *"In 2–4 sentences: who you are, what visitors will see, and anything special about your space or work.
> Example: 'I'm a ceramicist working from my garden studio. During the trail you can watch throwing demos
> and browse hand-glazed pieces. The cottage itself dates to 1780.' Don't worry about polish — we'll tidy
> it for consistency, and you'll approve the final version."*

## Data, retention & compliance (belt & braces)
- **Lawful basis:** consent (correct basis for publishing someone's home address + their own words/images).
- **Data stored:** name, address, contact email, submitted text, images, consent timestamp, notice
  **version**, submission/approval timestamps, withdrawal state, and (optionally) IP at consent for audit.
- **Two separate clocks — don't conflate them:**
  - **Display window** (how long details are *public*): configurable per trail, **max 3 months before →
    1 month after** the event (Jonathan, 2026-08). Data may be *collected* early but only *shown* once the
    window opens. Test: public no longer than the purpose needs. Enforced by existing event-window RLS;
    **auto-unpublish** at window end. *(2026 Tollesbury trail = Sat 12 Sep → public removed by 12 Oct.)*
  - **Storage/retention** (how long we *hold* it at all): default **delete/anonymise address + contact
    ~4 weeks after the display window closes**. Exception = the recurring opt-in below.
- **Recurring-trail opt-in (b2 above):** if ticked, retain until they withdraw **or 2 years since their
  last confirmed participation** (rolling; auto-delete on expiry), **and re-confirm before every edition**
  via a one-click *"still happy? confirm / withdraw"* email. Re-confirmation keeps consent current
  (regulators dislike indefinite silent retention) and catches **house moves/sales** (accuracy) —
  never republish a stale address at what's now a stranger's home. Even retained data is **only public
  during each trail's display window**; between trails it's dormant.
- **Withdrawal:** as easy as giving consent (one tokenised click) — a hard GDPR requirement.
- **Image rights:** the upload includes an ownership/permission confirmation — this is copyright/licence,
  distinct from the data-protection consent, so state both.
- **Verification:** the emailed token doubles as light proof the address belongs to the recipient.
- **Audit trail:** every state change stamped; the versioned notice means we can prove *what* they agreed to.
- **Accessibility:** plain language, large tap targets, works one-handed on a phone (older cohort).
- Not legal advice — worth a five-minute check with the non-profit's adviser before first live use.

## Technical shape (sketch)
- **No login.** Token-keyed **RPC** (same pattern as the Moxii self-removal RPC): the token maps to one
  participant record; all reads/writes go through the RPC, never raw table access.
- **Public consent route** in the app (e.g. `/consent/:token`), separate from admin.
- **Email** via Brevo (ties into the pending branded-auth-email work).
- **Statuses:** `invited → submitted → in-review → awaiting-approval → approved → published`,
  plus `withdrawn` and `expired` (token TTL). Reuse existing consent columns; add intake + status columns.
- **Admin side:** a queue of participants by status; edit content; send approval link; see consent record.

## Phasing
- **This year (no new code):** Anita collects consent by **email reply** (itself written consent); admin
  records each via the existing consent checkbox with notice version + Private visibility + event window.
  Compliant + auditable now.
- **Next (this spec):** the self-service consent + intake + approval loop. Post-freeze; not rushed onto a
  live trail carrying real home addresses.

## Decisions & open questions
- **Retention (decided 2026-08):** display max 3 months before → 1 month after; one-off data deleted after
  the window; recurring opt-in kept **2 years rolling** from last confirmed participation, with
  re-confirmation before each edition. Display + retention **configurable per tour**. **Publish a public
  data policy stating this with its justification.**
- **Public fields (decided):** publish **name AND address** — both are the point (visitors must find the
  studio/open home; artists want to be credited). Phone stays private/internal.
- **Reviewer (decided):** no formal adviser today → get **Ed Ireson** (neighbour; IT/data; overlapping
  Capgemini-type clients) to give the data policy + consent copy a second pair of eyes before first live use.
- **Open:** who edits submissions (per-tour editor via RBAC?) + who sees the consent audit; one flow vs
  separate copy for householders vs artists; notice-version wording sign-off before first live send.
