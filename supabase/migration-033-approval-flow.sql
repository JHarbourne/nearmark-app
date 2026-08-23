-- Migration 033 — artist / participant approval flow (Phase 2).
-- Each participant (the resident or artist behind a DRAFT story) gets a private
-- link /approve/<token>. That page shows ONLY their own story card and lets them
-- read a plain consent notice and tap Approve, recording consent. The tour stays
-- unpublished throughout — nothing here publishes anything.
--
-- SECURITY IS THE POINT. The `participants` table stays anon-DENIED (migration 032:
-- RLS, no anon policy). The ONLY public access to a draft story is through the two
-- SECURITY DEFINER functions below, each scoped strictly to the row whose token was
-- supplied, with a fixed search_path, and each granted to `anon` and nothing more.
-- A caller can never enumerate participants or pass anything but a token.
--
-- Additive + safe to run against the LIVE app: it only adds a column + a default,
-- backfills tokens, and creates two functions. Nothing here is destructive.
--
-- ⚠️ Review before running.

begin;

-- ── tokens: give every participant a hard-to-guess token ─────────────────────
-- 12 random bytes → 24 hex chars. Default for new rows; backfill any existing
-- rows that predate this (migration 032 left token nullable + unused).
alter table public.participants
  alter column token set default encode(gen_random_bytes(12), 'hex');
update public.participants
  set token = encode(gen_random_bytes(12), 'hex')
  where token is null;

-- ── the participant's free-text "something looks wrong" note (optional) ──────
alter table public.participants add column if not exists approval_note text;

-- ── read the card behind one token ───────────────────────────────────────────
-- Returns exactly ONE row — the story card fields the public StoryCard needs,
-- plus the place title and this participant's consent status — for the story the
-- token belongs to, whatever its draft status. Returns no rows for a bad/blank
-- token, so nothing ever leaks. This is the only way the anon role can read a
-- draft story, and only ever the token's own story.
create or replace function public.approval_card(p_token text)
returns table (
  location_title        text,
  status                text,
  consent_given         boolean,
  approved_at           timestamptz,
  heading               text,
  period                text,
  significance          text,
  summary               text,
  hero_image_url        text,
  hero_position         text,
  image_alt             text,
  image_label           text,
  caption               text,
  hero_credit           text,
  hero_credit_url       text,
  show_hero_credit      boolean,
  historic_image_url    text,
  historic_position     text,
  historic_alt          text,
  historic_label        text,
  historic_credit       text,
  historic_credit_url   text,
  slider_after_url      text,
  slider_after_position text,
  portrait_url          text,
  portrait_alt          text,
  portrait_caption      text,
  portrait_credit       text,
  portrait_credit_url   text,
  wiki_url              text,
  link_label            text,
  links                 text,
  video_url             text,
  video_caption         text,
  hue                   text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    l.title,
    p.status,
    p.consent_given,
    p.approved_at,
    s.heading,
    s.period,
    s.significance,
    s.summary,
    s.hero_image_url,
    s.hero_position,
    s.image_alt,
    s.image_label,
    s.caption,
    s.hero_credit,
    s.hero_credit_url,
    s.show_hero_credit,
    s.historic_image_url,
    s.historic_position,
    s.historic_alt,
    s.historic_label,
    s.historic_credit,
    s.historic_credit_url,
    s.slider_after_url,
    s.slider_after_position,
    s.portrait_url,
    s.portrait_alt,
    s.portrait_caption,
    s.portrait_credit,
    s.portrait_credit_url,
    s.wiki_url,
    s.link_label,
    s.links,
    s.video_url,
    s.video_caption,
    s.hue
  from public.participants p
  join public.stories   s on s.id = p.story_id
  join public.locations l on l.id = s.location_id
  where p_token is not null
    and p_token <> ''
    and p.token = p_token;
$$;

-- ── record a participant's approval ──────────────────────────────────────────
-- If the token matches a row that hasn't been withdrawn, records consent +
-- approval (and any note) and returns true. Any other case — bad/blank token, or
-- a withdrawn row — is a no-op returning false. Never touches another row.
create or replace function public.approval_submit(p_token text, p_note text default null)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hit boolean := false;
begin
  if p_token is null or p_token = '' then
    return false;
  end if;
  update public.participants
    set consent_given       = true,
        consent_recorded_at  = now(),
        approved_at          = now(),
        status               = 'approved',
        approval_note        = coalesce(p_note, approval_note)
    where token = p_token
      and withdrawn_at is null;
  get diagnostics v_hit = row_count;
  return v_hit;
end;
$$;

-- ── grants: ONLY these two functions are anon-callable ───────────────────────
-- Lock the surface down: revoke the default public execute, then grant execute to
-- exactly the anon (and authenticated) roles. The participants table itself has no
-- anon policy, so it stays unreachable except through these token-scoped functions.
revoke execute on function public.approval_card(text)          from public;
revoke execute on function public.approval_submit(text, text)  from public;
grant  execute on function public.approval_card(text)          to anon, authenticated;
grant  execute on function public.approval_submit(text, text)  to anon, authenticated;

commit;

notify pgrst, 'reload schema';
