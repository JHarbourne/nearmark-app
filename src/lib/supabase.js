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
function rowToLocation(r) {
  return {
    recordId: r.id,           // uuid (used for updates/deletes)
    id: r.slug,               // stable slug used across the app
    title: r.title || '',
    city: r.city || 'London',
    period: r.period || '',
    significance: r.significance || '',
    summary: r.summary || '',
    wikiUrl: r.wiki_url || '',
    lat: r.lat,
    lng: r.lng,
    triggerRadius: r.trigger_radius || 80,
    heroImageUrl: r.hero_image_url || null,
    historicImageUrl: r.historic_image_url || null,
    heroPosition: r.hero_position || '50% 50%',
    historicPosition: r.historic_position || '50% 50%',
    photoCredit: r.photo_credit || '',
    photoCreditUrl: r.photo_credit_url || '',
    historicCredit: r.historic_credit || '',
    historicCreditUrl: r.historic_credit_url || '',
    imageAlt: r.image_alt || '',
    historicAlt: r.historic_alt || '',
    imageLabel: r.image_label || '',
    historicLabel: r.historic_label || '',
    portraitUrl: r.portrait_url || null,   // in-body portrait (e.g. the artist)
    portraitAlt: r.portrait_alt || '',
    portraitCaption: r.portrait_caption || '',
    caption: r.caption || '',
    links: r.links || '',              // raw "Label | URL" lines (edited as-is)
    linkList: parseLinks(r.links),     // parsed [{ label, url }] for display
    videoUrl: r.video_url || null,
    audioUrl: r.audio_url || null,
    audioDuration: r.audio_duration || 0,
    thumbnailUrl: r.thumbnail_url || null,
    hue: r.hue || '#9B6DFF',
    relatedIds: r.related_ids || [],
    tourNum: r.tour_num,
    status: r.status || 'draft',
    notesInternal: r.notes_internal || '',
  }
}
function locationToRow(l) {
  return {
    slug: l.id,
    title: l.title,
    city: l.city,
    period: l.period,
    significance: l.significance,
    summary: l.summary,
    wiki_url: l.wikiUrl,
    lat: l.lat,
    lng: l.lng,
    trigger_radius: Number(l.triggerRadius) || 80,
    hero_image_url: l.heroImageUrl || null,
    historic_image_url: l.historicImageUrl || null,
    hero_position: l.heroPosition || '50% 50%',
    historic_position: l.historicPosition || '50% 50%',
    photo_credit: l.photoCredit || null,
    photo_credit_url: l.photoCreditUrl || null,
    historic_credit: l.historicCredit || null,
    historic_credit_url: l.historicCreditUrl || null,
    image_alt: l.imageAlt || null,
    historic_alt: l.historicAlt || null,
    image_label: l.imageLabel || null,
    historic_label: l.historicLabel || null,
    portrait_url: l.portraitUrl || null,
    portrait_alt: l.portraitAlt || null,
    portrait_caption: l.portraitCaption || null,
    caption: l.caption || null,
    links: l.links || null,
    video_url: l.videoUrl || null,
    audio_url: l.audioUrl || null,
    audio_duration: Number(l.audioDuration) || 0,
    thumbnail_url: l.thumbnailUrl || null,
    hue: l.hue,
    related_ids: l.relatedIds || [],
    tour_num: l.tourNum || null,
    status: l.status || 'draft',
    notes_internal: l.notesInternal || null,
  }
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
    coverAlt: r.cover_alt || '',
    status: r.status || 'draft',
    stopIds: r.stop_ids || [],
    durationOverrideMins: r.duration_override_mins || null,
    sortOrder: r.sort_order ?? 0,
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
    cover_alt: t.coverAlt || null,
    status: t.status || 'draft',
    stop_ids: t.stopIds || [],
    duration_override_mins: t.durationOverrideMins || null,
    sort_order: t.sortOrder ?? 0,
  }
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
export async function listStorageMedia() {
  const out = []
  for (const folder of ['image', 'audio', 'video']) {
    const { data, error } = await supabase.storage.from('media').list(folder, {
      limit: 1000, sortBy: { column: 'created_at', order: 'desc' },
    })
    if (error || !data) continue
    for (const f of data) {
      if (!f.name) continue
      const path = `${folder}/${f.name}`
      out.push({
        path,
        url: supabase.storage.from('media').getPublicUrl(path).data.publicUrl,
        type: folder,
        defaultName: f.name.replace(/^\d+-/, ''), // strip the timestamp prefix
        sizeBytes: f.metadata?.size || null,
        createdAt: f.created_at || null,
      })
    }
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
export async function fetchLocations() {
  if (!supabaseConfigured) return SEED_LOCATIONS.filter((l) => l.status === 'published')
  const { data, error } = await supabase
    .from('locations')
    .select('*')
    .order('tour_num', { ascending: true, nullsFirst: false })
    .order('title')
  if (error) throw error
  return data.map(rowToLocation)
}
export async function fetchTours() {
  if (!supabaseConfigured) return SEED_TOURS.filter((t) => t.status === 'published')
  const { data, error } = await supabase.from('tours').select('*')
  if (error) throw error
  // sort client-side so a pre-migration DB (no sort_order column) still works
  return data.map(rowToTour).sort((a, b) => (a.sortOrder - b.sortOrder) || a.title.localeCompare(b.title))
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
  createTour: (t) => run(supabase.from('tours').insert(tourToRow(t)).select()),
  updateTour: (recordId, t) => run(supabase.from('tours').update(tourToRow(t)).eq('id', recordId).select()),
  deleteTour: (recordId) => run(supabase.from('tours').delete().eq('id', recordId)),
  setTourOrder: (recordId, order) => run(supabase.from('tours').update({ sort_order: order }).eq('id', recordId)),
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
