# Back-office permissions (RBAC + ownership) — spec

Status: **approved design, implementation held until the test month ends** (feature freeze).
Applies to the Nearmark core, so every deployment (Tollesbury, LGBT History, …) inherits it.
Super Admin for all current projects: **jharbourne@mac.com**.

## Why
Today every authenticated user is a full admin (`schema.sql`: the `auth full …` policies).
There is no role distinction and no record ownership, so any editor can delete anyone's
work. This spec adds roles, ownership, edit-notifications, a safe deletion path, and
duplicate-title guidance — building on machinery that already exists (`visibility`,
`publish_from/until`, tour `event_start/end/takedown_at`, `activity_log`, Supabase Auth).

## Decisions (signed off 2026-07-08)
- **Tour editing:** owner + Super Admin only (stricter than locations).
- **Deletion:** request-to-delete + **soft-archive** (recoverable ~30 days), never an
  immediate hard delete for non-owners. Permanent purge reserved for the Super Admin.

---

## 1. Roles
Two roles, stored in a new `profiles` table (`user_id → auth.users`, `role`,
`display_name`). `display_name` also upgrades the activity log / notifications from raw
emails to real names ("Anita").

| Role | Who | Powers |
|---|---|---|
| `super_admin` | jharbourne@mac.com | Everything; override any owner; delete/purge anything |
| `editor` | Anita, John, testers | Create anything; edit per matrix below; delete only what they own |

Helper (SECURITY DEFINER, avoids RLS recursion on `profiles`):
```sql
create or replace function public.is_super_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles
                 where user_id = auth.uid() and role = 'super_admin');
$$;
```

## 2. Ownership
Add to `locations` and `tours`:
- `created_by uuid references auth.users(id)` — set on insert, immutable after (trigger).
- `created_by_name text` — denormalised display name (snapshot at create).

Backfill every existing row to the Super Admin so nothing is left unowned.

## 3. Permission matrix

| Action | Location | Tour |
|---|---|---|
| Create | any editor/SA → becomes owner | any editor/SA → becomes owner |
| Read (admin) | all | all |
| **Edit** | anyone; **owner notified** if not the editor | **owner or SA only** |
| **Delete** | owner or SA (others → request) | owner or SA (others → request) |

Enforced in RLS (the real boundary — the UI only mirrors it). Replaces the blanket
`auth full` policies with per-action policies:
```sql
-- LOCATIONS
create policy loc_select on public.locations for select to authenticated using (true);
create policy loc_insert on public.locations for insert to authenticated
  with check (created_by = auth.uid());
create policy loc_update on public.locations for update to authenticated
  using (true) with check (true);              -- anyone edits; trigger notifies owner
create policy loc_delete on public.locations for delete to authenticated
  using (is_super_admin() or created_by = auth.uid());

-- TOURS  (edit locked to owner + SA)
create policy tour_select on public.tours for select to authenticated using (true);
create policy tour_insert on public.tours for insert to authenticated
  with check (created_by = auth.uid());
create policy tour_update on public.tours for update to authenticated
  using (is_super_admin() or created_by = auth.uid())
  with check (is_super_admin() or created_by = auth.uid());
create policy tour_delete on public.tours for delete to authenticated
  using (is_super_admin() or created_by = auth.uid());
```
Immutability trigger keeps `created_by` from being reassigned on update.

## 4. Edit notifications
`notifications` table: `recipient uuid`, `type`, `entity_type`, `entity_id`, `actor uuid`,
`actor_name`, `message`, `created_at`, `read_at`.

AFTER UPDATE trigger on `locations` (and any actor-vs-owner change): if the editor is not
the owner, insert a row for the owner — "Anita edited your location *St Mary's Church*."
Surfaced as an in-app **bell** (query `recipient = auth.uid() and read_at is null`).
Tours don't need edit-notifications (only owner/SA can edit them).

Email digests (Brevo) are a later add-on — see [brand-auth-emails] task.

## 5. Deletion — request + soft-archive
Add `archived_at timestamptz` (+ optional `archived_by`) to `locations`/`tours`; archived
rows are hidden from the admin lists and never served to the public.
`deletion_requests` table: `entity_type`, `entity_id`, `entity_title` (snapshot),
`requested_by`, `owner`, `status` in (`pending`,`approved`,`declined`,`cancelled`),
`reason`, `created_at`, `decided_at`, `decided_by`.

Flow:
1. **Non-owner** hits Delete → no delete; a `deletion_requests` row (pending) is created
   and the owner is notified ("John wants to delete your tour *Arts Trail* — Approve / Decline").
2. **Owner approves** → row is **archived** (soft, recoverable) via a SECURITY DEFINER
   `resolve_deletion(request_id, decision)` function; request marked approved.
   **Owner declines** → request closed, requester notified.
3. **Super Admin** may archive directly, resolve any request, **restore** an archived row,
   or **purge** permanently (hard delete) after the recovery window.

Owner/SA deleting their own record also archives first (recoverable), not hard-deletes.

## 6. Duplicate titles + evergreen / event-only

**Primary — avoid duplication via tour overrides (recommended).**
Migration 010 (`stop-overrides`) already lets a tour give a stop a custom title/blurb. So a
building used two ways is **one** location: e.g. the Congregational Church stays a single
record, and the Arts Trail tour overrides its role to "Arts Trail Hub" for that tour only —
no second record, no second pin, no drift.

**Fallback — a genuine second record** (only when coordinates or lifecycle truly differ):
governed by existing fields —
- **Evergreen** = always visible (no publish window).
- **Event-only** = visible only inside `publish_from/until` (migration 011/012 already
  hides it outside the window).
- Enforce "only one evergreen per title" in the DB:
```sql
alter table public.locations add column if not exists evergreen boolean not null default true;
create unique index if not exists one_evergreen_per_title
  on public.locations (lower(btrim(title))) where evergreen;  -- 2nd evergreen w/ same name → rejected
```

**Warning UX** — on create/rename, normalise the title (`lower(btrim(title))`); if a match
exists, show a non-blocking dialog:
> "A location called **Congregational Church** already exists (evergreen, used in *Discover
> Tollesbury*). Is this a different use of the same building?"
> → Edit the existing one · **Add the role via a tour override (recommended)** ·
> Create an event-only variant · Cancel

## Phasing (nothing runs on the live apps until sign-off)
| Phase | Delivers | Migration |
|---|---|---|
| **1** | `profiles`/roles, `created_by` + backfill, per-action RLS, immutability trigger | `migration-022-rbac-ownership.sql` — **drafted, not run** |
| **2** | `notifications` + edit-notify trigger (+ admin bell UI to build) | `migration-023-notifications.sql` — **drafted, not run** |
| **3** | `archived_at` + `deletion_requests` + `request_delete()`/`resolve_deletion()`/`restore_entity()`; hard-delete now SA-only (+ UI to build) | `migration-024-deletion-workflow.sql` — **drafted, not run** |
| 4 | duplicate-title warning + `evergreen` unique index + override-first UX | 025 (to draft) |
| 5 | email notifications (Brevo) | Edge Function |

DB layer for phases 1–3 is drafted; the **admin-app UI** (bell, delete→rpc wiring,
Archive view with Restore/Purge, owner/SA-only edit affordances) is still to build.

Every migration is additive and must be run in **each** project (Tollesbury and LGBT),
each followed by `notify pgrst, 'reload schema';`.

## Open items to confirm before Phase 2+
- Notification delivery: in-app bell only for v1, or email from the start?
- Recovery window length for soft-archive (default 30 days) and who can purge.
- Whether `editor`s may create tours at all, or only the Super Admin (currently: any editor).
