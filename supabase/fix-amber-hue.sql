-- One-off data fix: bump existing pins from the old muted amber to the new bright
-- yellow (see tokens.js: amber #FFC53D → #FFD60A). Locations that picked "amber"
-- stored the old hex, so this repoints them. Safe to run once per project (Tollesbury
-- + LGBT). Only affects rows still on the exact old value; re-running is a no-op.

update public.locations
set hue = '#FFD60A'
where hue = '#FFC53D';
