-- Migration 036 — per-tour editor scoping (RBAC Phase 1b).
-- See docs/backoffice-permissions-spec.md § "Per-tour scoping".
-- Builds on 030 (roles + ownership + per-action RLS) and 031 (notifications).
--
-- ⚠️ Run on STAGING first (nearmark-staging), verify, then EACH prod project
--    (Tollesbury AND LGBT) once 030 + 031 are already applied there. All additive.
--
-- What it does (tightens 030's "everyone reads / anyone edits" model):
--   • tour_editors(tour_id, user_id) — the explicit assignment table. An editor
--     works in a tour only if assigned (or if they own it).
--   • SELECT is now SCOPED: an editor sees only tours they own/are assigned to,
--     locations they own OR that sit in one of their assigned tours (SA-shared,
--     read-only), and stories under any location they can see. The Super Admin
--     still sees everything. Anon (public) policies are untouched.
--   • EDIT is now OWNER-ONLY for editors: an editor edits/deletes only locations
--     & stories they own; a location the SA shares into their tour is read-only.
--     (This supersedes 030's collaborative "anyone edits, owner notified" for
--     locations/stories — the signed-off scoping decision, 2026-09-13.)
--   • Cross-tour location sharing stays an SA privilege, enforced at the WRITE
--     layer: a non-SA may only add slugs to a tour's stop_ids that THEY own, so
--     an editor can't escalate read access by pasting a foreign slug into their
--     tour. Only the SA can add a shared location.
--   • Assigned editors may edit their tour (fields + stop order); tour delete
--     stays owner + SA (as 030).
--   • The tour creator is auto-assigned to their own tour (keeps the assignment
--     table the single source of truth for scope, incl. their own tours).

begin;

-- ── assignment table ─────────────────────────────────────────────────────────
create table if not exists public.tour_editors (
  tour_id     uuid not null references public.tours(id)   on delete cascade,
  user_id     uuid not null references auth.users(id)     on delete cascade,
  assigned_by uuid references auth.users(id),
  assigned_at timestamptz not null default now(),
  primary key (tour_id, user_id)
);
alter table public.tour_editors enable row level security;
-- Editors can read their own assignments (to know their scope); SA reads/writes all.
drop policy if exists te_select on public.tour_editors;
create policy te_select on public.tour_editors for select to authenticated
  using (is_super_admin() or user_id = auth.uid());
drop policy if exists te_sa_write on public.tour_editors;
create policy te_sa_write on public.tour_editors for all to authenticated
  using (is_super_admin()) with check (is_super_admin());

-- ── scope helpers (SECURITY DEFINER → bypass RLS, no recursion) ──────────────
-- Is `loc_slug` a stop in any tour the caller is assigned to?
create or replace function public.slug_in_my_tours(loc_slug text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.tours t
    join public.tour_editors te on te.tour_id = t.id
    where te.user_id = auth.uid() and loc_slug = any(t.stop_ids)
  );
$$;

-- Can the caller SEE this location (by id)? SA, owner, or it's a stop in one of
-- their assigned tours. Used by the stories SELECT policy for the parent lookup.
create or replace function public.can_see_location_id(loc_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.locations l
    where l.id = loc_id
      and (public.is_super_admin()
           or l.created_by = auth.uid()
           or public.slug_in_my_tours(l.slug))
  );
$$;

-- ── tighten SELECT: scope editors to their own + assigned-tour content ───────
-- TOURS
drop policy if exists tour_select on public.tours;
create policy tour_select on public.tours for select to authenticated
  using (
    is_super_admin()
    or created_by = auth.uid()
    or exists (select 1 from public.tour_editors te
               where te.tour_id = tours.id and te.user_id = auth.uid())
  );

-- LOCATIONS
drop policy if exists loc_select on public.locations;
create policy loc_select on public.locations for select to authenticated
  using (
    is_super_admin()
    or created_by = auth.uid()
    or slug_in_my_tours(slug)
  );

-- STORIES (visible if the caller can see the parent location)
drop policy if exists story_select on public.stories;
create policy story_select on public.stories for select to authenticated
  using (can_see_location_id(location_id));

-- ── tighten EDIT: editors edit only what they OWN (SA edits anything) ─────────
-- LOCATIONS — owner + SA only (was "anyone edits" in 030).
drop policy if exists loc_update on public.locations;
create policy loc_update on public.locations for update to authenticated
  using (is_super_admin() or created_by = auth.uid())
  with check (is_super_admin() or created_by = auth.uid());

-- STORIES — editable only by the parent-location owner + SA (was "anyone edits").
drop policy if exists story_update on public.stories;
create policy story_update on public.stories for update to authenticated
  using (is_super_admin() or exists (
    select 1 from public.locations l
    where l.id = stories.location_id and l.created_by = auth.uid()))
  with check (is_super_admin() or exists (
    select 1 from public.locations l
    where l.id = stories.location_id and l.created_by = auth.uid()));

-- STORIES — a story can only be added to a location the caller owns (or SA).
drop policy if exists story_insert on public.stories;
create policy story_insert on public.stories for insert to authenticated
  with check (is_super_admin() or exists (
    select 1 from public.locations l
    where l.id = stories.location_id and l.created_by = auth.uid()));

-- ── assigned editors may edit their tour (fields + stop order) ───────────────
-- Tour delete stays owner + SA (unchanged from 030).
drop policy if exists tour_update on public.tours;
create policy tour_update on public.tours for update to authenticated
  using (
    is_super_admin()
    or created_by = auth.uid()
    or exists (select 1 from public.tour_editors te
               where te.tour_id = tours.id and te.user_id = auth.uid())
  )
  with check (
    is_super_admin()
    or created_by = auth.uid()
    or exists (select 1 from public.tour_editors te
               where te.tour_id = tours.id and te.user_id = auth.uid())
  );

-- ── sharing stays an SA privilege (enforced at the write layer) ──────────────
-- A non-SA may only put slugs into a tour's stop_ids that THEY own. This stops
-- an editor from gaining read access to a location they shouldn't see by pasting
-- its slug into their tour. Only the SA can add a shared (foreign-owned) location.
create or replace function public.enforce_stop_ownership() returns trigger
language plpgsql security definer set search_path = public as $$
declare added text[]; s text;
begin
  if public.is_super_admin() then return new; end if;
  if tg_op = 'INSERT' then
    added := coalesce(new.stop_ids, '{}');
  else
    added := array(select unnest(coalesce(new.stop_ids,'{}'))
                   except
                   select unnest(coalesce(old.stop_ids,'{}')));
  end if;
  foreach s in array added loop
    if not exists (select 1 from public.locations l
                   where l.slug = s and l.created_by = auth.uid()) then
      raise exception
        'Only a super admin can add a shared location (%) to a tour.', s
        using errcode = '42501';
    end if;
  end loop;
  return new;
end; $$;
drop trigger if exists trg_tours_enforce_stops_ins on public.tours;
create trigger trg_tours_enforce_stops_ins before insert on public.tours
  for each row execute function public.enforce_stop_ownership();
drop trigger if exists trg_tours_enforce_stops_upd on public.tours;
create trigger trg_tours_enforce_stops_upd before update on public.tours
  for each row execute function public.enforce_stop_ownership();

-- ── auto-assign the tour creator to their own tour ──────────────────────────
create or replace function public.assign_tour_creator() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.created_by is not null then
    insert into public.tour_editors (tour_id, user_id, assigned_by)
    values (new.id, new.created_by, new.created_by)
    on conflict (tour_id, user_id) do nothing;
  end if;
  return new;
end; $$;
drop trigger if exists trg_tours_assign_creator on public.tours;
create trigger trg_tours_assign_creator after insert on public.tours
  for each row execute function public.assign_tour_creator();

-- Backfill: assign every existing tour's owner to it.
insert into public.tour_editors (tour_id, user_id, assigned_by)
  select id, created_by, created_by from public.tours where created_by is not null
  on conflict (tour_id, user_id) do nothing;

commit;

notify pgrst, 'reload schema';
