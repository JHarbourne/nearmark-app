-- Nearmark example seed data – generated from src/data/seed.js
-- Paste into the Supabase SQL Editor AFTER running schema.sql.
-- Re-runnable: ON CONFLICT (slug) updates the row.

insert into public.locations (slug, title, city, period, significance, summary, wiki_url, lat, lng, trigger_radius, hero_image_url, historic_image_url, photo_credit, photo_credit_url, video_url, audio_url, audio_duration, thumbnail_url, hue, related_ids, tour_num, status, notes_internal) values
($b$cross$b$, $b$The Old Market Cross$b$, $b$London$b$, $b$14th century$b$, $b$Market Square · the heart of the old town$b$, $b$The market cross has stood at the centre of the old town for as long as anyone can remember – a meeting point for traders, proclamations and the weekly market. Worn stone steps mark where generations gathered to buy, sell and exchange news.

It is the natural place to begin a walk through the streets that grew up around it.$b$, NULL, 51.5118, -0.1226, 80, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, $b$#9B6DFF$b$, '{"guildhall","inn"}', 1, $b$published$b$, NULL),
($b$guildhall$b$, $b$The Guildhall$b$, $b$London$b$, $b$15th century$b$, $b$High Street · where the town governed itself$b$, $b$For centuries the guildhall was the seat of the town’s trade guilds and council. Its great timbered hall hosted markets, courts and feasts, and its cellars once stored the town’s grain.

Much altered over the years, it still anchors the high street and gives a sense of how a small town organised its affairs.$b$, NULL, 51.5135, -0.121, 80, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, $b$#3D9BFF$b$, '{"cross","church"}', 2, $b$published$b$, NULL),
($b$wharf$b$, $b$Riverside Wharf$b$, $b$London$b$, $b$18th century$b$, $b$The old trading quay$b$, $b$Goods once arrived here by barge – timber, coal and cloth – before being carried up into the town. The warehouses that lined the quay have mostly gone, but the street names still remember the trades that worked the water’s edge.$b$, NULL, 51.5101, -0.1205, 90, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, $b$#FFC53D$b$, '{"inn"}', 3, $b$published$b$, NULL),
($b$inn$b$, $b$The Coaching Inn$b$, $b$London$b$, $b$17th century$b$, $b$A stop on the old coach road$b$, $b$Travellers changed horses and rested here on the long road between cities. Its cobbled yard, archway and upper galleries are typical of the coaching inns that knitted the country together before the railways arrived.$b$, NULL, 51.5142, -0.1235, 70, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, $b$#2FBF71$b$, '{"cross","wharf"}', 4, $b$published$b$, NULL),
($b$church$b$, $b$St Aldate’s Church$b$, $b$London$b$, $b$Medieval$b$, $b$The parish church and its quiet churchyard$b$, $b$The parish church has watched over the town through plague, fire and rebuilding. Its tower is the tallest thing for streets around, and its churchyard offers a moment of calm at the end of the walk.$b$, NULL, 51.5128, -0.125, 80, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, $b$#FF4D5E$b$, '{"guildhall"}', 5, $b$published$b$, NULL),
($b$almshouses$b$, $b$The Almshouses$b$, $b$London$b$, $b$16th century$b$, $b$Charity Row · homes for the town’s poor$b$, $b$A modest row of cottages founded by a local benefactor to house elderly townsfolk who had fallen on hard times – an early form of social care, still recognisable in the neat gardens behind their low front doors.$b$, NULL, 51.515, -0.1228, 70, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, $b$#FF8C42$b$, '{}', NULL, $b$published$b$, NULL),
($b$clock$b$, $b$The Clock Tower$b$, $b$London$b$, $b$Victorian$b$, $b$A jubilee landmark$b$, $b$Built to mark a royal jubilee, the clock tower became an instant meeting place – “see you by the clock” has guided generations to the same spot at the junction of the main streets.$b$, NULL, 51.511, -0.1248, 70, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, $b$#FF5CA8$b$, '{}', NULL, $b$published$b$, NULL),
($b$mill$b$, $b$Mill Lane$b$, $b$London$b$, $b$19th century$b$, $b$Where the watermill once turned$b$, $b$A narrow lane named for the watermill that once ground the town’s flour. The mill is long gone, but the lane keeps its name and its gentle slope down toward the water.$b$, NULL, 51.5133, -0.119, 90, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, $b$#3D9BFF$b$, '{}', NULL, $b$published$b$, NULL)
on conflict (slug) do update set
  title = excluded.title,
  city = excluded.city,
  period = excluded.period,
  significance = excluded.significance,
  summary = excluded.summary,
  wiki_url = excluded.wiki_url,
  lat = excluded.lat,
  lng = excluded.lng,
  trigger_radius = excluded.trigger_radius,
  hero_image_url = excluded.hero_image_url,
  historic_image_url = excluded.historic_image_url,
  photo_credit = excluded.photo_credit,
  photo_credit_url = excluded.photo_credit_url,
  video_url = excluded.video_url,
  audio_url = excluded.audio_url,
  audio_duration = excluded.audio_duration,
  thumbnail_url = excluded.thumbnail_url,
  hue = excluded.hue,
  related_ids = excluded.related_ids,
  tour_num = excluded.tour_num,
  status = excluded.status,
  notes_internal = excluded.notes_internal;

insert into public.tours (slug, title, city, theme, description, cover_image_url, status, stop_ids, duration_override_mins) values
($b$old-town-walk$b$, $b$Old Town Heritage Walk$b$, $b$London$b$, $b$A short loop through the old town$b$, $b$A gentle loop through the heart of the old town, from the market cross to the parish church. Walk it at your own pace; stories unlock as you arrive.$b$, NULL, $b$published$b$, '{"cross","guildhall","wharf","inn","church"}', NULL)
on conflict (slug) do update set
  title = excluded.title,
  city = excluded.city,
  theme = excluded.theme,
  description = excluded.description,
  cover_image_url = excluded.cover_image_url,
  status = excluded.status,
  stop_ids = excluded.stop_ids,
  duration_override_mins = excluded.duration_override_mins;
