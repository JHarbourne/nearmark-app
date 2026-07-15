# Back-office permissions (RBAC + ownership) — spec

Status: **approved design, implementation held until the test month ends** (feature freeze).
Applies to the Nearmark core, so every deployment (Tollesbury, LGBT History, …) inherits it.
Super Admin for all current projects: **jharbourne@mac.com**.

> **Refreshed 2026-07-15 for the current schema.** The content model is now Tour → Location →
> **Story** (the stories-layer split). This spec extends roles/ownership/RLS/notifications to the
> `stories` table, and the migrations are **renumbered 030–033** — the original 022–024 numbers now
> collide with the shipped stories migrations 025–027. `media` and `activity_log` keep their existing
> blanket policies (shared asset library / append-only log — no per-record ownership).

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

**Stories inherit their parent location's ownership** — no `created_by` on `stories`. A story
belongs to exactly one location (`location_id … on delete cascade`), so the location's owner is
effectively the story's owner. Keeps the model simple (no per-story column or backfill) and matches
how editors think ("this is content on *my* location").

## 3. Permission matrix

| Action | Location | Story | Tour |
|---|---|---|---|
| Create | any editor/SA → becomes owner | anyone (belongs to its location) | any editor/SA → becomes owner |
| Read (admin) | all | all | all |
| **Edit** | anyone; **owner notified** if not the editor | anyone; **parent-location owner notified** | **owner or SA only** |
| **Delete** | owner or SA (others → request) | parent-location owner or SA | owner or SA (others → request) |

Stories follow their **parent location** (editable by anyone, deletable by the location's owner/SA) —
*not* the stricter tour rules.

Enforced in RLS (the real boundary — the UI only mirrors it). Replaces the blanket
`auth full locations/stories/tours` policies with per-action policies:
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

-- STORIES  (content within a location — inherit the parent location's rules)
create policy story_select on public.stories for select to authenticated using (true);
create policy story_insert on public.stories for insert to authenticated with check (true);
create policy story_update on public.stories for update to authenticated
  using (true) with check (true);              -- anyone edits; trigger notifies the location owner
create policy story_delete on public.stories for delete to authenticated
  using (is_super_admin() or exists (
    select 1 from public.locations l
    where l.id = stories.location_id and l.created_by = auth.uid()));
```
Immutability trigger keeps `created_by` from being reassigned on `locations`/`tours` update.

## 4. Edit notifications
`notifications` table: `recipient uuid`, `type`, `entity_type`, `entity_id`, `actor uuid`,
`actor_name`, `message`, `created_at`, `read_at`.

AFTER UPDATE trigger on `locations` **and `stories`**: if the editor is not the (parent-)location's
owner, insert a row for that owner — "Anita edited your location *St Mary's Church*" or "Anita edited
a story in your location *St Mary's Church*." Surfaced as an in-app **bell** (query
`recipient = auth.uid() and read_at is null`). Since most content now lives in stories, the story
trigger is the one that fires most. Tours don't need edit-notifications (only owner/SA can edit them).

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

**Stories aren't separately archived** — a story belongs to one location (`on delete cascade`), so
archiving/restoring/purging a location carries its stories with it. Removing a *single* story is a
plain delete by the parent-location owner or SA (`story_delete` above), not the request-workflow
(that stays at the location/tour level).

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
| **1** | `profiles`/roles, `created_by` + backfill, per-action RLS (locations, **stories**, tours), immutability trigger | `migration-030-rbac-ownership.sql` — draft exists as **022**; renumber + add the story policies |
| **2** | `notifications` + edit-notify trigger on **locations and stories** (+ admin bell UI to build) | `migration-031-notifications.sql` — draft exists as **023**; extend trigger to stories |
| **3** | `archived_at` + `deletion_requests` + `request_delete()`/`resolve_deletion()`/`restore_entity()`; hard-delete now SA-only (+ UI to build) | `migration-032-deletion-workflow.sql` — draft exists as **024** |
| 4 | duplicate-title warning + `evergreen` unique index + override-first UX | `033` (to draft) |
| 5 | email notifications (Brevo) | Edge Function |

Migrations renumbered from the original 022–024 → **030–032** (022–024 now collide with the shipped
stories migrations 025–027). Before running, the drafts need: (a) the renumber, (b) the `stories`
per-action policies + the story edit-notify trigger folded in. DB layer for phases 1–3 is otherwise
drafted; the **admin-app UI** (bell, delete→rpc wiring, Archive view with Restore/Purge, owner/SA-only
edit affordances) is still to build.

Every migration is additive and must be run in **each** project (Tollesbury and LGBT),
each followed by `notify pgrst, 'reload schema';`.

## Open items to confirm before Phase 2+
- Notification delivery: in-app bell only for v1, or email from the start?
- Recovery window length for soft-archive (default 30 days) and who can purge.
- Whether `editor`s may create tours at all, or only the Super Admin (currently: any editor).
- Whether removing a **single story** should soft-archive (recoverable) like locations/tours, or a
  plain delete is acceptable (it's sub-content, and its parent location stays archive-protected).
