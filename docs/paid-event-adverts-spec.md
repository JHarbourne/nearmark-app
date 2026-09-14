# Paid event adverts (monetising Announcements) — spec

Status: **Spec only — not built.** A monetisation avenue for Nearmark: let local
businesses/organisers pay to advertise an event as an **Announcement**. Builds on the
announcements feature (`migration-038/039`, `docs/announcements-spec.md`).

## Why
Announcements already put event cards on the app's home. Turning them into **paid adverts**
gives Nearmark (and/or the deploying organisation) a revenue stream without changing the app's
walking-guide focus — the same lightweight event card, but sold. Jonathan flagged this 2026-09-14.

## The shift this represents
Today announcements are an **internal tool** (the Super Admin posts village notices). Paid adverts
make them a **customer-facing paid product**, which pulls in real product/ops questions — so this is
deliberately a *separate* build from the lite announcements, not a bolt-on.

## Flow (proposed)
1. **Submit** — an advertiser provides the event (title, dates, place, image, link, description) and
   their contact + billing details. Two possible entry points:
   - **Admin-entered** (v1): the SA enters it on the advertiser's behalf and marks it paid offline.
   - **Self-service** (later): a public "Advertise your event" form.
2. **Review / moderate** — the SA approves or rejects (content standards; not a walk; appropriate).
3. **Pay** — payment taken (Stripe Checkout); on success the advert is scheduled/published.
4. **Live** — shows as an "Event" card until it ends (existing announcements lifecycle), then auto-hides.
5. **Record** — receipt/invoice to the advertiser; the SA sees paid/period/advertiser in the admin.

Reuse the existing **approval-token machinery** (participants + `/approve/<token>`, migrations 032–034)
for the advertiser-facing review/confirm step, and the **announcements** table as the base — add
advertiser + billing + approval columns rather than a new entity.

## Open decisions (settle before building)
- **Pricing:** flat fee per advert? by run-length (per day/week)? tiers (standard vs featured)?
- **Who may submit:** invite-only (SA-entered) first, or open self-service from day one?
- **Payment provider:** Stripe Checkout assumed — needs a Stripe account per deploying org, and a
  server endpoint (Supabase Edge Function) to create sessions + handle webhooks.
- **Moderation:** SA approval required before anything goes live (yes — protects the brand).
- **Money side:** VAT/receipts/invoicing, refunds/cancellation, who receives the money (Nearmark vs
  the client org), and how that's split for white-label deployments.
- **Legal:** advertising T&Cs, a content policy, and GDPR handling of advertiser data.

## Phasing
| Phase | Delivers |
|---|---|
| **1** | Approval + advertiser fields on announcements (advertiser contact, `approval_status`, paid/unpaid flag, run dates) — **SA-entered, payment offline**. A review/approve view. No Stripe. |
| **2** | Self-service **"Advertise your event"** submission form → a review queue the SA approves/rejects. |
| **3** | **Stripe Checkout** — pay to publish; webhook auto-publishes; receipts. |
| 4 | Niceties: featured placement, advertiser self-serve edits, basic performance stats. |

## Out of scope (initially)
Ad targeting, real-time bidding, recurring billing, advertiser analytics dashboards. Keep it simple:
a paid card with a start/end, approved by a human, paid once.

## Note
This is a Nearmark **platform/business** feature (revenue, T&Cs, payments) as much as an app feature —
worth aligning with the BRD reconcile ([brd-out-of-date]) when that happens.
