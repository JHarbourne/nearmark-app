-- Migration 011 – privacy, publication windows & consent (UK GDPR by design).
-- Private residential addresses (open studios/gardens) are only public for a
-- limited window around an event and require recorded consent. Paste into the
-- Supabase SQL Editor and Run. Safe to re-run.

-- ── locations: visibility + publication window + consent record ──────────────
alter table public.locations add column if not exists visibility text not null default 'public'
  check (visibility in ('public','private'));
alter table public.locations add column if not exists publish_from  timestamptz;
alter table public.locations add column if not exists publish_until timestamptz;
alter table public.locations add column if not exists consent_given boolean not null default false;
alter table public.locations add column if not exists consent_recorded_at    timestamptz;
alter table public.locations add column if not exists consent_recorded_by    text; -- admin email
alter table public.locations add column if not exists consent_notice_version text; -- privacy-notice version agreed
alter table public.locations add column if not exists consent_contact        text; -- resident name/email (record only)
alter table public.locations add column if not exists coarse_pin boolean not null default false; -- snap private pin to street level

-- ── tours (an "event"): window + auto take-down ──────────────────────────────
alter table public.tours add column if not exists event_start timestamptz;
alter table public.tours add column if not exists event_end   timestamptz;
alter table public.tours add column if not exists takedown_at timestamptz; -- default event_end + 7d, editable

-- ── consent gate: a private location can't be PUBLISHED without recorded consent
create or replace function public.enforce_location_consent()
returns trigger language plpgsql as $$
begin
  if new.visibility = 'private' and new.status = 'published'
     and coalesce(new.consent_given, false) = false then
    raise exception 'A private location cannot be published without recorded consent (consent_given = true).';
  end if;
  return new;
end;
$$;
drop trigger if exists trg_locations_consent on public.locations;
create trigger trg_locations_consent before insert or update on public.locations
  for each row execute function public.enforce_location_consent();

-- ── RLS (the real boundary): the public/anon role sees a location only when it
--    is published, inside its window, and — if private — consented. ──
drop policy if exists "anon read published locations" on public.locations;
create policy "anon read published locations" on public.locations
  for select to anon using (
    status = 'published'
    and (publish_from  is null or now() >= publish_from)
    and (publish_until is null or now() <= publish_until)
    and (visibility = 'public' or consent_given = true)
  );

-- A tour disappears the moment it passes its take-down date.
drop policy if exists "anon read published tours" on public.tours;
create policy "anon read published tours" on public.tours
  for select to anon using (
    status = 'published'
    and (takedown_at is null or now() <= takedown_at)
  );
-- (Authenticated admins keep the existing "auth full …" policies: they see and
--  manage every record regardless of window/consent.)
