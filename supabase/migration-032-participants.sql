-- Migration 032 — private per-story owner contact (participants).
-- A place's story may belong to a resident/artist we need to reach (open studios,
-- private gardens). Their contact details are operational-only: kept for the
-- record, and used later for a consent flow — never published. This table is
-- therefore PRIVATE: authenticated admins only, with NO anon policy, so the
-- public/anon API can never read it.
--
-- Additive + safe to run against the LIVE app: nothing else references this table
-- and the current app ignores it. The consent columns are provisioned now
-- (nullable/defaulted, unused) so the later flow is a data change, not a schema one.
--
-- ⚠️ Review before running. Nothing here is destructive.

begin;

create table if not exists public.participants (
  story_id              uuid primary key references public.stories(id) on delete cascade,
  contact_email         text,
  contact_mobile        text,
  -- future consent flow (provisioned, unused for now) ─────────────────────────
  status                text not null default 'draft',
  token                 text unique,
  consent_given         boolean not null default false,
  consent_recorded_at   timestamptz,
  consent_notice_version text,
  approved_at           timestamptz,
  withdrawn_at          timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- keep updated_at fresh (reuses the existing helper from schema.sql)
drop trigger if exists trg_participants_updated on public.participants;
create trigger trg_participants_updated before update on public.participants
  for each row execute function public.set_updated_at();

-- RLS is the real boundary. Authenticated admins get full access; there is
-- deliberately NO anon policy, so contact details are never exposed publicly.
alter table public.participants enable row level security;

drop policy if exists participants_admin on public.participants;
create policy participants_admin on public.participants
  for all to authenticated using (true) with check (true);

commit;

notify pgrst, 'reload schema';
