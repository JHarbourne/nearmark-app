-- Migration 034 — approval-page fields (Phase 2, additive).
-- The /approve/<token> page (migration 033) lets an artist review their own DRAFT
-- story and approve it. This adds the few details we ask them to confirm/supply at
-- the same time — their name (the consent signature), a "keep my details for next
-- time" opt-in, and, for a solo studio, the chance to correct their own address —
-- all recorded through the same token-scoped SECURITY DEFINER RPCs. The
-- `participants` table stays anon-DENIED; the only public door is these functions.
--
-- Additive + safe to run against the LIVE app: it adds columns (nullable/defaulted)
-- and re-creates the two RPCs. Nothing here is destructive.
--
-- ⚠️ Review before running.

begin;

-- ── new participant columns ──────────────────────────────────────────────────
alter table public.participants add column if not exists name text;
-- recurring-consent opt-in: keep this artist's details on file for next time.
alter table public.participants add column if not exists keep_details boolean not null default false;
-- what the artist confirmed/typed for their address on the approval page (a record
-- even when we don't move the pin, e.g. a shared venue).
alter table public.participants add column if not exists address_input text;
-- flag: they edited a SOLO address → an admin should re-check / re-pin the map.
alter table public.participants add column if not exists address_changed boolean not null default false;

-- ── read the card behind one token ───────────────────────────────────────────
-- Same single, token-scoped row as migration 033, now also returning the venue's
-- address + coordinates, whether the location is SHARED (more than one story), and
-- the participant's name + keep_details (to prefill the approval form). Changing the
-- RETURNS TABLE shape means we must drop the old signature first.
drop function if exists public.approval_card(text);
create or replace function public.approval_card(p_token text)
returns table (
  location_title        text,
  address               text,
  lat                   double precision,
  lng                   double precision,
  is_shared             boolean,
  status                text,
  consent_given         boolean,
  approved_at           timestamptz,
  name                  text,
  keep_details          boolean,
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
    l.address,
    l.lat,
    l.lng,
    (select count(*) from public.stories s2 where s2.location_id = l.id) > 1 as is_shared,
    p.status,
    p.consent_given,
    p.approved_at,
    p.name,
    p.keep_details,
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

-- ── record a participant's approval (+ the confirmed details) ────────────────
-- On a valid, non-withdrawn token: record consent + the artist's name/keep-details,
-- optionally push their website → the story's wiki_url and a social URL → the story's
-- links, and — for a SOLO location only — apply an address correction to the location
-- (leaving lat/lng for an admin to re-pin) and flag address_changed. A shared venue's
-- address is never touched, but the typed value is still stored on the participant.
-- Returns true only if a participant row matched. New signature → drop the old one.
drop function if exists public.approval_submit(text, text);
create or replace function public.approval_submit(
  p_token   text,
  p_note    text default null,
  p_name    text default null,
  p_website text default null,
  p_social  text default null,
  p_keep    boolean default null,
  p_address text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_story_id        uuid;
  v_location_id     uuid;
  v_current_address text;
  v_story_count     integer;
  v_is_solo         boolean;
  v_addr_changed    boolean := false;
  v_links           text;
  v_host            text;
  v_link_label      text;
begin
  if p_token is null or p_token = '' then
    return false;
  end if;

  -- the token's own story (never withdrawn); no match → no-op false
  select p.story_id into v_story_id
    from public.participants p
   where p.token = p_token
     and p.withdrawn_at is null;
  if v_story_id is null then
    return false;
  end if;

  -- resolve the story's location + how many stories share it
  select s.location_id into v_location_id
    from public.stories s
   where s.id = v_story_id;
  select count(*) into v_story_count
    from public.stories s
   where s.location_id = v_location_id;
  v_is_solo := (v_story_count = 1);
  select l.address into v_current_address
    from public.locations l
   where l.id = v_location_id;

  -- ── address (SOLO only): correct the location, flag a re-pin; never lat/lng ──
  if v_is_solo
     and p_address is not null
     and btrim(p_address) <> ''
     and btrim(p_address) <> coalesce(v_current_address, '') then
    update public.locations
       set address = p_address
     where id = v_location_id;
    v_addr_changed := true;
  end if;

  -- ── website → story.wiki_url (override); set link_label if it's empty ──
  if p_website is not null and btrim(p_website) <> '' then
    update public.stories
       set wiki_url   = p_website,
           link_label = case when link_label is null or btrim(link_label) = ''
                             then 'Website' else link_label end
     where id = v_story_id;
  end if;

  -- ── social → append/merge into story.links, in the "Label | url" line format
  --    parseLinks reads. Label = the domain (e.g. Instagram) or 'Social'. Skip if
  --    the exact URL is already present, so re-submitting doesn't duplicate it. ──
  if p_social is not null and btrim(p_social) <> '' then
    select s.links into v_links from public.stories s where s.id = v_story_id;
    if v_links is null or position(btrim(p_social) in v_links) = 0 then
      v_host := lower(btrim(p_social));
      v_host := regexp_replace(v_host, '^https?://', '');
      v_host := regexp_replace(v_host, '^www\.', '');
      v_host := split_part(v_host, '/', 1);
      if v_host = '' or position('.' in v_host) = 0 then
        v_link_label := 'Social';
      else
        v_link_label := initcap(split_part(v_host, '.', 1));
      end if;
      update public.stories
         set links = case when v_links is null or btrim(v_links) = ''
                          then v_link_label || ' | ' || btrim(p_social)
                          else v_links || E'\n' || v_link_label || ' | ' || btrim(p_social) end
       where id = v_story_id;
    end if;
  end if;

  -- ── record consent + the confirmed participant details ──
  update public.participants
     set consent_given       = true,
         consent_recorded_at  = now(),
         approved_at          = now(),
         status               = 'approved',
         approval_note        = coalesce(p_note, approval_note),
         name                 = coalesce(p_name, name),
         keep_details         = coalesce(p_keep, keep_details),
         address_input        = coalesce(p_address, address_input),
         address_changed      = case when v_addr_changed then true else address_changed end
   where token = p_token
     and withdrawn_at is null;

  return true;
end;
$$;

-- ── grants: ONLY these two functions are anon-callable ───────────────────────
revoke execute on function public.approval_card(text)                                          from public;
revoke execute on function public.approval_submit(text, text, text, text, text, boolean, text) from public;
grant  execute on function public.approval_card(text)                                          to anon, authenticated;
grant  execute on function public.approval_submit(text, text, text, text, text, boolean, text) to anon, authenticated;

commit;

notify pgrst, 'reload schema';
