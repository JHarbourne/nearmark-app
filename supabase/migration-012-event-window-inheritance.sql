-- Migration 012 – private locations inherit their event's publication window.
-- The dates live on the event (tour): a private address is shown only when it is
-- published, consented, and either (a) its own override window is live, or (b) it
-- is a stop in at least one published event whose window is live now. Fail-safe:
-- a private address in no live event and with no own dates is hidden.
-- Public landmarks are unaffected. Paste into the Supabase SQL Editor and Run.
-- Safe to re-run.

drop policy if exists "anon read published locations" on public.locations;
create policy "anon read published locations" on public.locations
  for select to anon using (
    status = 'published' and (
      -- public landmarks: live all year (within an optional own window)
      ( visibility = 'public'
        and (publish_from  is null or now() >= publish_from)
        and (publish_until is null or now() <= publish_until) )
      or
      -- private addresses: must be consented, and within an effective window
      ( visibility = 'private' and consent_given = true and (
          -- (a) an explicit per-location override window is set → use it
          ( (publish_from is not null or publish_until is not null)
            and (publish_from  is null or now() >= publish_from)
            and (publish_until is null or now() <= publish_until) )
          or
          -- (b) no own window → inherit from a live event it's a stop in
          ( publish_from is null and publish_until is null
            and exists (
              select 1 from public.tours t
              where t.status = 'published'
                and locations.slug = any (t.stop_ids)
                and (t.event_start is null or now() >= t.event_start)
                and (t.takedown_at is null or now() <= t.takedown_at)
            ) )
        ) )
    )
  );
