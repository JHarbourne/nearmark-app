// Example seed data for a fresh Nearmark deployment.
//
// Three clearly fictional locations + one example tour, so a new deployer can run
// the app and see something on the map before wiring up Supabase or adding real
// content. Replace this with your own content via the admin backoffice (or import
// it into Supabase). Coordinates are generic points in central London.
//
// To use these as the no-backend fallback, point src/lib/supabase.js at
// ./example-seed.js instead of ./seed.js (or just add real content in the admin).

import { HUE } from '../lib/tokens.js'

const blankMedia = {
  audioDuration: 0, audioUrl: null, heroImageUrl: null, historicImageUrl: null,
  photoCredit: null, photoCreditUrl: null, videoUrl: null, thumbnailUrl: null,
}

export const SEED_LOCATIONS = [
  {
    id: 'example-1', tourNum: 1, lat: 51.5080, lng: -0.1281, hue: HUE.violet,
    title: 'Example Location 1', period: '1900s', triggerRadius: 80, city: 'Example City',
    significance: 'A short one-line subtitle describing why this place matters.',
    ...blankMedia,
    summary:
      'Placeholder summary for Example Location 1. Write 80–100 words here describing the history of this site — what happened, who was involved, and why it is worth a visit.\n\nThis is example content shipped with the Nearmark platform so you can test your instance. Replace it with your own stories in the admin backoffice.',
    wikiUrl: '', relatedIds: ['example-2'], status: 'published',
  },
  {
    id: 'example-2', tourNum: 2, lat: 51.5117, lng: -0.1240, hue: HUE.blue,
    title: 'Example Location 2', period: '1950s', triggerRadius: 80, city: 'Example City',
    significance: 'Another placeholder subtitle for the second example stop.',
    ...blankMedia,
    summary:
      'Placeholder summary for Example Location 2. Each location can carry a before/after photo slider, an audio narration, a caption and further-reading links — all optional and editable in the admin.\n\nGeneric coordinates place this near Covent Garden so the three examples form a short walkable route on the map.',
    wikiUrl: '', relatedIds: ['example-1', 'example-3'], status: 'published',
  },
  {
    id: 'example-3', tourNum: 3, lat: 51.5103, lng: -0.1300, hue: HUE.amber,
    title: 'Example Location 3', period: '1980s', triggerRadius: 80, city: 'Example City',
    significance: 'A third placeholder subtitle to complete the example tour.',
    ...blankMedia,
    summary:
      'Placeholder summary for Example Location 3. When you are ready, delete these three examples and add your own locations — anything from an arts trail to a pub crawl to an architecture guide.\n\nUntil then, this fictional content lets you confirm the map, the story cards and the guided/discovery modes all work in your deployment.',
    wikiUrl: '', relatedIds: ['example-2'], status: 'published',
  },
]

export const SEED_TOURS = [
  {
    id: 'example-tour', title: 'Example Walking Tour', city: 'Example City',
    theme: 'A sample route', description: 'A short example tour linking the three placeholder locations. Replace it with your own in the admin.',
    coverImageUrl: null, coverPosition: '50% 50%', coverCredit: '', coverCreditUrl: '', coverAlt: '',
    status: 'published', stopIds: ['example-1', 'example-2', 'example-3'],
    durationOverrideMins: null, sortOrder: 0,
  },
]

export const SEED_CITIES = [
  { id: 'example-city', name: 'Example City', area: 'City Centre', lat: 51.5100, lng: -0.1270, live: true, locationCount: 3, tourCount: 1 },
]
