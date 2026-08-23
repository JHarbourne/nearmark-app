-- Migration 035 — per-tour "participatory" flag (additive).
-- A *participatory* tour (e.g. an Arts Trail) is one where the owners/artists
-- manage and approve their own story cards, so the public shouldn't be invited to
-- suggest edits. Setting this hides the public "Suggest a correction or addition"
-- link on that tour's story cards. *Curated* tours (LGBT History, Discover
-- Tollesbury) leave it off and keep the link.
--
-- Additive + safe to run against the LIVE app: one nullable-defaulted column.
-- Defaults to false, so existing/curated tours are unchanged.

begin;

alter table public.tours
  add column if not exists participatory boolean not null default false;

comment on column public.tours.participatory is
  'Owners/artists approve their own cards. Hides the public "Suggest a correction" link on this tour''s story cards. Default false (curated tours keep the link).';

commit;

notify pgrst, 'reload schema';
