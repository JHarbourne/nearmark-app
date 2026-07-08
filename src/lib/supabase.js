// Supabase data layer – full backend (BRD §12 model, §13 auth).
// Replaces the Airtable client. Public reads use the publishable (anon) key;
// Row Level Security returns only published rows to anonymous visitors and full
// access to authenticated admins. Admin writes, auth and file uploads all go
// through the same client carrying the logged-in session.

import { createClient } from '@supabase/supabase-js'
import { SEED_LOCATIONS, SEED_TOURS } from '../data/seed.js'
import { config } from '../config.js'

const URL = config.supabaseUrl
const ANON = config.supabaseAnonKey

export const supabaseConfigured = Boolean(URL && ANON)
export const supabase = supabaseConfigured ? createClient(URL, ANON) : null

// ── row ⇄ model mapping (snake_case ⇄ camelCase) ──
// Content lives on STORIES now (Tour → Location → Story). A location holds only
// place/identity fields; its content comes from one or more child stories.
function rowToLocation(r) {
  return {
    recordId: r.id,           // uuid (used for updates/deletes + story FK)
    id: r.slug,               // stable slug used across the app
    title: r.title || '',
    city: r.city || 'London',
    address: r.address || '',
    lat: r.lat,
    lng: r.lng,
    triggerRadius: r.trigger_radius || 80,
    tourNum: r.tour_num,
    status: r.status || 'draft',
    // privacy / publication (migration 011) – place-level, stays on the location
    visibility: r.visibility || 'public',
    publishFrom: r.publish_from || null,
    publishUntil: r.publish_until || null,
    consentGiven: !!r.consent_given,
    consentRecordedAt: r.consent_recorded_at || null,
    consentRecordedBy: r.consent_recorded_by || '',
    consentNoticeVersion: r.consent_notice_version || '',
    consentContact: r.consent_contact || '',
    coarsePin: !!r.coarse_pin,
    guidedTourOnly: r.guided_tour_only === true, // hide from Discover mode; only show inside a guided tour
    stories: [],              // filled by attachStories()
    // visual convenience for the map pin / thumbnails – set from the primary story
    hue: '#9B6DFF', heroImageUrl: null, historicImageUrl: null, thumbnailUrl: null,
    heroPosition: '50% 50%', historicPosition: '50% 50%',
  }
}
function locationToRow(l) {
  return {
    slug: l.id,
    title: l.title,
    city: l.city,
    address: l.address || null,
    lat: l.lat,
    lng: l.lng,
    trigger_radius: Number(l.triggerRadius) || 80,
    tour_num: l.tourNum || null,
    status: l.status || 'draft',
    visibility: l.visibility || 'public',
    publish_from: l.publishFrom || null,
    publish_until: l.publishUntil || null,
    consent_given: !!l.consentGiven,
    consent_recorded_at: l.consentRecordedAt || null,
    consent_recorded_by: l.consentRecordedBy || null,
    consent_notice_version: l.consentNoticeVersion || null,
    consent_contact: l.consentContact || null,
    coarse_pin: !!l.coarsePin,
    guided_tour_only: l.guidedTourOnly === true,
  }
}
// A story carries all the content fields (the old location content). Its camelCase
// keys deliberately match what StoryCard already reads, so the card renders a story
// object with no component change. `title` aliases `heading` for the same reason.
function rowToStory(r) {
  return {
    storyId: r.id,
    locationId: r.location_id,
    sortOrder: r.sort_order ?? 1,
    heading: r.heading || '',
    title: r.heading || '',
    period: r.period || '',
    significance: r.significance || '',
    summary: r.summary || '',
    wikiUrl: r.wiki_url || '',
    linkLabel: r.link_label || '',
    heroImageUrl: r.hero_image_url || null,
    historicImageUrl: r.historic_image_url || null,
    sliderAfterUrl: r.slider_after_url || null,
    sliderAfterPosition: r.slider_after_position || '50% 50%',
    heroPosition: r.hero_position || '50% 50%',
    historicPosition: r.historic_position || '50% 50%',
    photoCredit: r.hero_credit || '',
    photoCreditUrl: r.hero_credit_url || '',
    showPhotoCredit: r.show_hero_credit !== false,
    historicCredit: r.historic_credit || '',
    historicCreditUrl: r.historic_credit_url || '',
    imageAlt: r.image_alt || '',
    historicAlt: r.historic_alt || '',
    imageLabel: r.image_label || '',
    historicLabel: r.historic_label || '',
    portraitUrl: r.portrait_url || null,
    portraitAlt: r.portrait_alt || '',
    portraitCaption: r.portrait_caption || '',
    portraitCredit: r.portrait_credit || '',
    portraitCreditUrl: r.portrait_credit_url || '',
    caption: r.caption || '',
    links: r.links || '',
    linkList: parseLinks(r.links),
    videoUrl: r.video_url || null,
    audioUrl: r.audio_url || null,
    audioDuration: r.audio_duration_secs || 0,
    transcript: r.transcript || '',
    thumbnailUrl: r.thumbnail_url || null,
    hue: r.hue || '#9B6DFF',
    relatedIds: r.related_ids || [],
    notesInternal: r.notes_internal || '',
  }
}
function storyToRow(s) {
  return {
    location_id: s.locationId,
    sort_order: Number(s.sortOrder) || 1,
    heading: s.heading || s.title || '',
    period: s.period || null,
    significance: s.significance || null,
    summary: s.summary || null,
    wiki_url: s.wikiUrl || null,
    link_label: s.linkLabel || null,
    hero_image_url: s.heroImageUrl || null,
    hero_position: s.heroPosition || '50% 50%',
    image_alt: s.imageAlt || null,
    image_label: s.imageLabel || null,
    hero_credit: s.photoCredit || null,
    hero_credit_url: s.photoCreditUrl || null,
    show_hero_credit: s.showPhotoCredit !== false,
    historic_image_url: s.historicImageUrl || null,
    historic_position: s.historicPosition || '50% 50%',
    historic_alt: s.historicAlt || null,
    historic_label: s.historicLabel || null,
    historic_credit: s.historicCredit || null,
    historic_credit_url: s.historicCreditUrl || null,
    video_url: s.videoUrl || null,
    audio_url: s.audioUrl || null,
    audio_duration_secs: Number(s.audioDuration) || 0,
    transcript: s.transcript || null,
    thumbnail_url: s.thumbnailUrl || null,
    hue: s.hue || null,
    related_ids: s.relatedIds || [],
    caption: s.caption || null,
    links: s.links || null,
    portrait_url: s.portraitUrl || null,
    portrait_alt: s.portraitAlt || null,
    portrait_caption: s.portraitCaption || null,
    portrait_credit: s.portraitCredit || null,
    portrait_credit_url: s.portraitCreditUrl || null,
    slider_after_url: s.sliderAfterUrl || null,
    slider_after_position: s.sliderAfterPosition || '50% 50%',
    notes_internal: s.notesInternal || null,
  }
}
// Attach each location's ordered stories and flatten the primary story's visuals
// onto the location (so MapView's pins/thumbnails keep working unchanged).
function attachStories(locations, stories) {
  const byLoc = {}
  for (const s of stories) (byLoc[s.locationId] ||= []).push(s)
  for (const loc of locations) {
    const list = (byLoc[loc.recordId] || []).sort((a, b) => (a.sortOrder - b.sortOrder))
    loc.stories = list
    const p = list[0]
    if (p) Object.assign(loc, {
      hue: p.hue, heroImageUrl: p.heroImageUrl, historicImageUrl: p.historicImageUrl,
      thumbnailUrl: p.thumbnailUrl, heroPosition: p.heroPosition, historicPosition: p.historicPosition,
    })
  }
  return locations
}
function rowToTour(r) {
  return {
    recordId: r.id,
    id: r.slug,
    title: r.title || '',
    city: r.city || 'London',
    theme: r.theme || '',
    description: r.description || '',
    coverImageUrl: r.cover_image_url || null,
    coverPosition: r.cover_position || '50% 50%',
    coverCredit: r.cover_credit || '',
    coverCreditUrl: r.cover_credit_url || '',
    showCoverCredit: r.show_cover_credit !== false, // undefined (pre-migration) or true → show

    coverAlt: r.cover_alt || '',
    status: r.status || 'draft',
    stopIds: r.stop_ids || [],
    stopOverrides: r.stop_overrides || {}, // { slug: { title, blurb } } – per-tour title/blurb
    routeGeometry: r.route_geometry || null, // [[lat,lng],…] road-following path, or null → straight lines
    durationOverrideMins: r.duration_override_mins || null,
    sortOrder: r.sort_order ?? 0,
    // event window (migration 011)
    eventStart: r.event_start || null,
    eventEnd: r.event_end || null,
    takedownAt: r.takedown_at || null,
  }
}
function tourToRow(t) {
  return {
    slug: t.id,
    title: t.title,
    city: t.city,
    theme: t.theme,
    description: t.description,
    cover_image_url: t.coverImageUrl || null,
    cover_position: t.coverPosition || '50% 50%',
    cover_credit: t.coverCredit || null,
    cover_credit_url: t.coverCreditUrl || null,
    show_cover_credit: t.showCoverCredit !== false,
    cover_alt: t.coverAlt || null,
    status: t.status || 'draft',
    stop_ids: t.stopIds || [],
    stop_overrides: t.stopOverrides && Object.keys(t.stopOverrides).length ? t.stopOverrides : null,
    route_geometry: t.routeGeometry && t.routeGeometry.length ? t.routeGeometry : null,
    duration_override_mins: t.durationOverrideMins || null,
    sort_order: t.sortOrder ?? 0,
    // event window (migration 011)
    event_start: t.eventStart || null,
    event_end: t.eventEnd || null,
    takedown_at: t.takedownAt || null,
  }
}

// Ask the compute-route Edge Function for a road-following walking path through
// the given ordered stops. `coordinates` is [[lng,lat],…] (ORS order); returns
// [[lat,lng],…] (Leaflet order) to store on the tour. Requires a signed-in admin.
export async function computeWalkingRoute(coordinates) {
  const { data, error } = await supabase.functions.invoke('compute-route', { body: { coordinates } })
  if (error) {
    // invoke only gives a generic "non-2xx" message; dig out the function's own
    // error text (e.g. missing key, or an OpenRouteService routing failure).
    let detail = error.message || 'Route service unavailable.'
    try { const body = await error.context?.json?.(); if (body?.error) detail = body.error } catch { /* non-JSON body */ }
    throw new Error(detail)
  }
  if (data?.error) throw new Error(data.error)
  if (!Array.isArray(data?.geometry) || data.geometry.length < 2) throw new Error('No route returned.')
  return data.geometry
}

// parse the "Label | https://url" per-line links field into [{ label, url }]
function parseLinks(raw) {
  if (!raw) return []
  return raw.split('\n').map((line) => {
    const i = line.indexOf('|')
    if (i === -1) {
      const url = line.trim()
      return url ? { label: url, url } : null
    }
    const label = line.slice(0, i).trim()
    const url = line.slice(i + 1).trim()
    return url ? { label: label || url, url } : null
  }).filter(Boolean)
}

// ── Media library: list everything in the 'media' bucket + editable metadata ──
const AUDIO_EXT = ['mp3', 'wav', 'm4a', 'aac', 'ogg', 'oga']
const VIDEO_EXT = ['mp4', 'webm', 'mov', 'm4v']
const typeFromName = (name) => {
  const ext = (name.split('.').pop() || '').toLowerCase()
  return AUDIO_EXT.includes(ext) ? 'audio' : VIDEO_EXT.includes(ext) ? 'video' : 'image'
}
export async function listStorageMedia() {
  const out = []
  const seen = new Set()
  const add = (path, type, f) => {
    if (seen.has(path)) return
    seen.add(path)
    out.push({
      path,
      url: supabase.storage.from('media').getPublicUrl(path).data.publicUrl,
      type,
      defaultName: f.name.replace(/^\d+-/, ''), // strip the timestamp prefix
      sizeBytes: f.metadata?.size || null,
      createdAt: f.created_at || null,
    })
  }
  // The app's own uploader files things under type subfolders.
  for (const folder of ['image', 'audio', 'video']) {
    const { data, error } = await supabase.storage.from('media').list(folder, {
      limit: 1000, sortBy: { column: 'created_at', order: 'desc' },
    })
    if (error || !data) continue
    for (const f of data) {
      if (f.name) add(`${folder}/${f.name}`, folder, f)
    }
  }
  // Also surface files uploaded straight to the bucket root (e.g. via the
  // Supabase dashboard), classified by extension. Folder entries (image/…)
  // come back with no metadata, and placeholders start with a dot — skip both.
  const { data: root } = await supabase.storage.from('media').list('', {
    limit: 1000, sortBy: { column: 'created_at', order: 'desc' },
  })
  for (const f of root || []) {
    if (!f.name || !f.metadata || f.name.startsWith('.')) continue
    add(f.name, typeFromName(f.name), f)
  }
  return out
}
export async function listMediaMeta() {
  const { data, error } = await supabase.from('media').select('*')
  if (error) throw new Error(error.message)
  return data || []
}
export async function saveMediaMeta(meta) {
  const { error } = await supabase.from('media').upsert(
    {
      storage_url: meta.url, type: meta.type, filename: meta.filename || null,
      photographer: meta.photographer || null, license: meta.license || null, caption: meta.caption || null,
    },
    { onConflict: 'storage_url' },
  )
  if (error) throw new Error(error.message)
}
export async function deleteMediaAsset(path, url) {
  await supabase.storage.from('media').remove([path])
  await supabase.from('media').delete().eq('storage_url', url)
}

// delete an uploaded file from the 'media' bucket (no-op for external URLs)
const MEDIA_MARKER = '/storage/v1/object/public/media/'
export async function removeMedia(url) {
  if (!supabaseConfigured || !url) return
  const i = url.indexOf(MEDIA_MARKER)
  if (i === -1) return // external URL – not ours to delete
  const path = decodeURIComponent(url.slice(i + MEDIA_MARKER.length))
  await supabase.storage.from('media').remove([path])
}

// ── public reads (RLS: anon → published only, authed admin → all) ──
// a privacy/window column doesn't exist yet (migration 011 not run) → fall back
const isUndefinedColumn = (e) => e && (e.code === '42703' || /does not exist/i.test(e.message || ''))

// Seed mode: turn a content-rich seed location into the place+stories shape the
// app now expects. A seed entry may declare its own `stories: [...]` array (for a
// multi-story example); otherwise its inline content becomes a single story.
function seedToLocation(l) {
  const storyFrom = (s, i) => ({
    ...s, storyId: `${l.id}-s${i + 1}`, locationId: l.id,
    sortOrder: s.sortOrder ?? i + 1, heading: s.heading || s.title || l.title, title: s.heading || s.title || l.title,
    hue: s.hue || l.hue || '#9B6DFF', relatedIds: s.relatedIds || l.relatedIds || [],
  })
  const stories = (l.stories && l.stories.length)
    ? l.stories.map(storyFrom)
    : [storyFrom({ ...l }, 0)]
  const loc = {
    recordId: l.id, id: l.id, title: l.title, city: l.city || 'London', address: l.address || '',
    lat: l.lat, lng: l.lng, triggerRadius: l.triggerRadius || 80, tourNum: l.tourNum,
    status: l.status || 'draft', visibility: l.visibility || 'public', guidedTourOnly: l.guidedTourOnly === true,
    publishFrom: null, publishUntil: null, consentGiven: false, coarsePin: false, stories,
  }
  const p = stories[0]
  Object.assign(loc, {
    hue: p.hue || '#9B6DFF', heroImageUrl: p.heroImageUrl || null, historicImageUrl: p.historicImageUrl || null,
    thumbnailUrl: p.thumbnailUrl || null, heroPosition: p.heroPosition || '50% 50%', historicPosition: p.historicPosition || '50% 50%',
  })
  return loc
}

// Fetch every story (RLS returns only stories of publicly-visible locations to the
// anon role; the admin session sees all). Ordered by sort_order for stable lists.
export async function fetchStories() {
  if (!supabaseConfigured) return []
  const { data, error } = await supabase.from('stories').select('*').order('sort_order')
  if (error) throw error
  return data.map(rowToStory)
}

// publicView=true applies the privacy/publication window filter (used by the
// public app); the admin calls it without the flag and sees every record. RLS
// is the real boundary for the anon role — this is defence in depth. Stories are
// fetched alongside and attached to each location.
export async function fetchLocations(publicView = false) {
  if (!supabaseConfigured) return SEED_LOCATIONS.filter((l) => l.status === 'published').map(seedToLocation)
  const ordered = (q) => q.order('title')
  let locs = null
  if (publicView) {
    const now = new Date().toISOString()
    const r = await ordered(
      supabase.from('locations').select('*').eq('status', 'published')
        .or(`publish_from.is.null,publish_from.lte.${now}`)
        .or(`publish_until.is.null,publish_until.gte.${now}`)
        .or('visibility.eq.public,consent_given.eq.true')
    )
    if (!r.error) locs = r.data.map(rowToLocation)
    else if (!isUndefinedColumn(r.error)) throw r.error // pre-migration → published-only below
  }
  if (!locs) {
    const { data, error } = await ordered(supabase.from('locations').select('*'))
    if (error) throw error
    locs = data.map(rowToLocation)
  }
  return attachStories(locs, await fetchStories())
}
export async function fetchTours(publicView = false) {
  if (!supabaseConfigured) return SEED_TOURS.filter((t) => t.status === 'published')
  const sorted = (rows) => rows.map(rowToTour).sort((a, b) => (a.sortOrder - b.sortOrder) || a.title.localeCompare(b.title))
  if (publicView) {
    const now = new Date().toISOString()
    const r = await supabase.from('tours').select('*').eq('status', 'published').or(`takedown_at.is.null,takedown_at.gte.${now}`)
    if (!r.error) return sorted(r.data)
    if (!isUndefinedColumn(r.error)) throw r.error
  }
  const { data, error } = await supabase.from('tours').select('*')
  if (error) throw error
  return sorted(data)
}

// ── admin CRUD (requires an authenticated session; RLS enforces it) ──
async function run(promise) {
  const { data, error } = await promise
  if (error) throw new Error(error.message)
  return data
}
export const db = {
  listLocations: () => fetchLocations(),
  listTours: () => fetchTours(),
  createLocation: (l) => run(supabase.from('locations').insert(locationToRow(l)).select()),
  updateLocation: (recordId, l) => run(supabase.from('locations').update(locationToRow(l)).eq('id', recordId).select()),
  deleteLocation: (recordId) => run(supabase.from('locations').delete().eq('id', recordId)),
  // ── stories (content) ──
  listStories: (locationRecordId) =>
    run(supabase.from('stories').select('*').eq('location_id', locationRecordId).order('sort_order')).then((rows) => rows.map(rowToStory)),
  createStory: (s) => run(supabase.from('stories').insert(storyToRow(s)).select()),
  updateStory: (storyId, s) => run(supabase.from('stories').update(storyToRow(s)).eq('id', storyId).select()),
  deleteStory: (storyId) => run(supabase.from('stories').delete().eq('id', storyId)),
  setStoryOrder: (storyId, order) => run(supabase.from('stories').update({ sort_order: order }).eq('id', storyId)),
  createTour: (t) => run(supabase.from('tours').insert(tourToRow(t)).select()),
  updateTour: (recordId, t) => run(supabase.from('tours').update(tourToRow(t)).eq('id', recordId).select()),
  deleteTour: (recordId) => run(supabase.from('tours').delete().eq('id', recordId)),
  setTourOrder: (recordId, order) => run(supabase.from('tours').update({ sort_order: order }).eq('id', recordId)),
  // persistent activity log (migration 018) – best-effort; never blocks a save
  logActivity: (action, target, actor) =>
    supabase.from('activity_log').insert({ action, target: target || null, actor: actor || null }),
  recentActivity: async (limit = 20) => {
    const { data, error } = await supabase.from('activity_log').select('*').order('created_at', { ascending: false }).limit(limit)
    if (error) throw new Error(error.message)
    return (data || []).map((r) => ({ action: r.action, title: r.target || '', who: r.actor || 'admin', at: new Date(r.created_at) }))
  },
  // Edits per editor: count activity-log rows grouped by actor (client-side; the
  // log is small during a testing phase). Returns [{ who, count }], busiest first.
  editorStats: async (limit = 2000) => {
    const { data, error } = await supabase.from('activity_log').select('actor').order('created_at', { ascending: false }).limit(limit)
    if (error) throw new Error(error.message)
    const counts = {}
    for (const r of (data || [])) { const who = r.actor || 'admin'; counts[who] = (counts[who] || 0) + 1 }
    return Object.entries(counts).map(([who, count]) => ({ who, count })).sort((a, b) => b.count - a.count)
  },
}

// ── auth ──
export const auth = {
  signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),
  signOut: () => supabase.auth.signOut(),
  // send the reset link back to the admin (not the public homepage) so the user
  // can set a new password; the target must be in the project's Redirect URLs.
  resetPassword: (email) => supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/admin' }),
  updateUser: (attrs) => supabase.auth.updateUser(attrs),
  getUser: async () => (await supabase.auth.getUser()).data.user,
  onChange: (cb) => supabase.auth.onAuthStateChange((event, session) => cb(session?.user || null, event)),
  // ── MFA: TOTP authenticator app (Google Authenticator, 1Password, Authy…) ──
  mfaAAL: () => supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
  mfaList: () => supabase.auth.mfa.listFactors(),
  mfaEnroll: (friendlyName) => supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName }),
  mfaVerify: (factorId, code) => supabase.auth.mfa.challengeAndVerify({ factorId, code }),
  mfaUnenroll: (factorId) => supabase.auth.mfa.unenroll({ factorId }),
}

// ── admin user management (via the admin-users Edge Function; service-role key
//    stays server-side). functions.invoke sends the caller's session token. ──
async function invokeAdminFn(action, payload = {}) {
  const { data, error } = await supabase.functions.invoke('admin-users', { body: { action, ...payload } })
  if (error) {
    let msg = error.message
    try { msg = (await error.context.json()).error || msg } catch { /* keep the generic message */ }
    throw new Error(msg)
  }
  return data
}
export const adminUsers = {
  list: () => invokeAdminFn('list'),
  invite: (email, redirectTo) => invokeAdminFn('invite', { email, redirectTo }),
  remove: (id) => invokeAdminFn('remove', { id }),
}

// ── storage: upload a photo/audio file, return its public URL ──
export async function uploadMedia(file, kind = 'image') {
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `${kind}/${Date.now()}-${safe}`
  const { error } = await supabase.storage.from('media').upload(path, file, {
    contentType: file.type,
    upsert: false,
  })
  if (error) throw new Error(error.message)
  return supabase.storage.from('media').getPublicUrl(path).data.publicUrl
}

// Overwrite the bytes at an EXISTING storage path (upsert). The public URL is
// unchanged, so every location/tour that references it shows the new image with
// no database changes. Short cacheControl so the swap propagates within a minute.
export async function replaceMediaFile(path, file) {
  const { error } = await supabase.storage.from('media').upload(path, file, {
    contentType: file.type,
    upsert: true,
    cacheControl: '60',
  })
  if (error) throw new Error(error.message)
  return supabase.storage.from('media').getPublicUrl(path).data.publicUrl
}
