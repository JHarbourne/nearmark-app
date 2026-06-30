// Example seed data – a small, generic "old town" heritage walk used as an
// offline fallback so the app runs with no backend configured, and as starter
// content you can replace with your own. None of it is real history; it exists
// only to demonstrate the map, tours and discovery features. Coordinates sit in
// central London so the OpenStreetMap view renders on real streets.
//
// Replace these with your own locations via the admin backoffice, or edit this
// file directly. Admins can fine-tune any pin via click-to-place in the editor.

import { HUE } from '../lib/tokens.js'

export const SEED_LOCATIONS = [
  {
    id: 'cross', tourNum: 1, lat: 51.5118, lng: -0.1226, hue: HUE.violet,
    title: 'The Old Market Cross', period: '14th century', triggerRadius: 80, city: 'London',
    significance: 'Market Square · the heart of the old town',
    audioDuration: 0, audioUrl: null, heroImageUrl: null, historicImageUrl: null, photoCredit: null, photoCreditUrl: null, videoUrl: null, thumbnailUrl: null,
    summary:
      'The market cross has stood at the centre of the old town for as long as anyone can remember – a meeting point for traders, proclamations and the weekly market. Worn stone steps mark where generations gathered to buy, sell and exchange news.\n\nIt is the natural place to begin a walk through the streets that grew up around it.',
    wikiUrl: null,
    relatedIds: ['guildhall', 'inn'], status: 'published',
  },
  {
    id: 'guildhall', tourNum: 2, lat: 51.5135, lng: -0.1210, hue: HUE.blue,
    title: 'The Guildhall', period: '15th century', triggerRadius: 80, city: 'London',
    significance: 'High Street · where the town governed itself',
    audioDuration: 0, audioUrl: null, heroImageUrl: null, historicImageUrl: null, photoCredit: null, photoCreditUrl: null, videoUrl: null, thumbnailUrl: null,
    summary:
      'For centuries the guildhall was the seat of the town’s trade guilds and council. Its great timbered hall hosted markets, courts and feasts, and its cellars once stored the town’s grain.\n\nMuch altered over the years, it still anchors the high street and gives a sense of how a small town organised its affairs.',
    wikiUrl: null,
    relatedIds: ['cross', 'church'], status: 'published',
  },
  {
    id: 'wharf', tourNum: 3, lat: 51.5101, lng: -0.1205, hue: HUE.amber,
    title: 'Riverside Wharf', period: '18th century', triggerRadius: 90, city: 'London',
    significance: 'The old trading quay',
    audioDuration: 0, audioUrl: null, heroImageUrl: null, historicImageUrl: null, photoCredit: null, photoCreditUrl: null, videoUrl: null, thumbnailUrl: null,
    summary:
      'Goods once arrived here by barge – timber, coal and cloth – before being carried up into the town. The warehouses that lined the quay have mostly gone, but the street names still remember the trades that worked the water’s edge.',
    wikiUrl: null,
    relatedIds: ['inn'], status: 'published',
  },
  {
    id: 'inn', tourNum: 4, lat: 51.5142, lng: -0.1235, hue: HUE.green,
    title: 'The Coaching Inn', period: '17th century', triggerRadius: 70, city: 'London',
    significance: 'A stop on the old coach road',
    audioDuration: 0, audioUrl: null, heroImageUrl: null, historicImageUrl: null, photoCredit: null, photoCreditUrl: null, videoUrl: null, thumbnailUrl: null,
    summary:
      'Travellers changed horses and rested here on the long road between cities. Its cobbled yard, archway and upper galleries are typical of the coaching inns that knitted the country together before the railways arrived.',
    wikiUrl: null,
    relatedIds: ['cross', 'wharf'], status: 'published',
  },
  {
    id: 'church', tourNum: 5, lat: 51.5128, lng: -0.1250, hue: HUE.red,
    title: 'St Aldate’s Church', period: 'Medieval', triggerRadius: 80, city: 'London',
    significance: 'The parish church and its quiet churchyard',
    audioDuration: 0, audioUrl: null, heroImageUrl: null, historicImageUrl: null, photoCredit: null, photoCreditUrl: null, videoUrl: null, thumbnailUrl: null,
    summary:
      'The parish church has watched over the town through plague, fire and rebuilding. Its tower is the tallest thing for streets around, and its churchyard offers a moment of calm at the end of the walk.',
    wikiUrl: null,
    relatedIds: ['guildhall'], status: 'published',
  },
  // ── discovery-only sites (no tour number) ──
  {
    id: 'almshouses', tourNum: null, lat: 51.5150, lng: -0.1228, hue: HUE.orange,
    title: 'The Almshouses', period: '16th century', triggerRadius: 70, city: 'London',
    significance: 'Charity Row · homes for the town’s poor',
    audioDuration: 0, audioUrl: null, heroImageUrl: null, historicImageUrl: null, photoCredit: null, photoCreditUrl: null, videoUrl: null, thumbnailUrl: null,
    summary:
      'A modest row of cottages founded by a local benefactor to house elderly townsfolk who had fallen on hard times – an early form of social care, still recognisable in the neat gardens behind their low front doors.',
    wikiUrl: null,
    relatedIds: [], status: 'published',
  },
  {
    id: 'clock', tourNum: null, lat: 51.5110, lng: -0.1248, hue: HUE.magenta,
    title: 'The Clock Tower', period: 'Victorian', triggerRadius: 70, city: 'London',
    significance: 'A jubilee landmark',
    audioDuration: 0, audioUrl: null, heroImageUrl: null, historicImageUrl: null, photoCredit: null, photoCreditUrl: null, videoUrl: null, thumbnailUrl: null,
    summary:
      'Built to mark a royal jubilee, the clock tower became an instant meeting place – “see you by the clock” has guided generations to the same spot at the junction of the main streets.',
    wikiUrl: null,
    relatedIds: [], status: 'published',
  },
  {
    id: 'mill', tourNum: null, lat: 51.5133, lng: -0.1190, hue: HUE.blue,
    title: 'Mill Lane', period: '19th century', triggerRadius: 90, city: 'London',
    significance: 'Where the watermill once turned',
    audioDuration: 0, audioUrl: null, heroImageUrl: null, historicImageUrl: null, photoCredit: null, photoCreditUrl: null, videoUrl: null, thumbnailUrl: null,
    summary:
      'A narrow lane named for the watermill that once ground the town’s flour. The mill is long gone, but the lane keeps its name and its gentle slope down toward the water.',
    wikiUrl: null,
    relatedIds: [], status: 'published',
  },
]

// The example tour. Stops are the 5 numbered locations, in order.
export const SEED_TOURS = [
  {
    id: 'old-town-walk',
    title: 'Old Town Heritage Walk',
    city: 'London',
    theme: 'A short loop through the old town',
    description:
      'A gentle loop through the heart of the old town, from the market cross to the parish church. Walk it at your own pace; stories unlock as you arrive.',
    coverImageUrl: null,
    status: 'published',
    stopIds: ['cross', 'guildhall', 'wharf', 'inn', 'church'],
    durationOverrideMins: null,
  },
]

export const SEED_CITIES = [
  { id: 'london', name: 'London', area: 'Old Town', lat: 51.5137, lng: -0.1341, locationCount: 8, tourCount: 1 },
]
