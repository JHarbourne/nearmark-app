<!-- Location editor (BRD §11.4) – the PLACE. Holds identity + map + privacy only;
     all content lives in its Stories (Tour → Location → Story). Address geocoding
     drops the pin from a typed address (OpenStreetMap Nominatim). -->
<template>
  <div>
    <div class="pagehead">
      <h1>{{ isNew ? 'New location' : 'Edit location' }}</h1>
      <button class="btn btn-ghost" @click="back">← Back to list</button>
    </div>

    <div class="editor-cols" style="display:grid; grid-template-columns: 1.1fr 0.9fr; gap:24px; align-items:start;">
      <!-- left: place fields + stories + save -->
      <div style="display:flex; flex-direction:column; gap:20px;">
      <div class="card" style="padding:22px;">
        <label for="loc-title">Title <span class="hint">the place name (shown on the map pin + list)</span></label>
        <input id="loc-title" type="text" v-model="form.title" placeholder="e.g. St Mary’s Church" />

        <label for="loc-city">City</label>
        <select id="loc-city" v-model="form.city"><option v-for="c in cities" :key="c" :value="c">{{ c }}</option></select>

        <!-- privacy / publication (migration 011) -->
        <div style="margin:18px 0; padding:14px 16px; border:1px solid var(--line); border-radius:12px;">
          <div style="display:flex; align-items:center; gap:20px; flex-wrap:wrap;">
            <div role="radiogroup" aria-label="Is this a public place or a private address?" style="display:flex; gap:20px;">
              <label style="display:flex; align-items:center; gap:8px; font-weight:500; margin:0; cursor:pointer;"><input type="radio" value="public" v-model="form.visibility" style="width:18px; height:18px; margin:0; accent-color:var(--violet);" /> Public</label>
              <label style="display:flex; align-items:center; gap:8px; font-weight:500; margin:0; cursor:pointer;"><input type="radio" value="private" v-model="form.visibility" style="width:18px; height:18px; margin:0; accent-color:var(--violet);" /> Private</label>
            </div>
            <button type="button" @click="showVisHelp = !showVisHelp" :aria-expanded="showVisHelp" style="margin-left:auto; background:none; border:none; padding:0; font:inherit; font-size:12px; font-weight:600; color:var(--violet); cursor:pointer;">What’s the difference?</button>
          </div>
          <p v-if="showVisHelp" class="muted" style="font-size:12.5px; margin:10px 0 0;">Public = a permanent place anyone can see year-round (a church, a pub, the marina). Private = someone’s home or private address (an open studio or garden). Private addresses are only shown during the event window and require the resident’s consent.</p>

          <div v-if="form.visibility === 'private'" style="margin-top:14px; padding-top:14px; border-top:1px solid var(--line);">
            <label for="loc-consent-contact">Resident <span class="hint">name/email of who consented · for the record, never shown in the app</span></label>
            <input id="loc-consent-contact" type="text" v-model="form.consentContact" placeholder="Jane Smith · jane@example.com" />
            <label style="display:flex; align-items:flex-start; gap:9px; margin-top:14px; font-weight:500; cursor:pointer;">
              <input type="checkbox" :checked="form.consentGiven" @change="onConsent" style="margin-top:3px;" />
              <span>I confirm the resident has given written consent to publish this address in the app for the event window. <span class="hint">(notice v{{ config.consentNoticeVersion }})</span></span>
            </label>
            <p v-if="form.consentGiven" style="font-size:12px; margin:8px 0 0; color:var(--green);">Consent recorded{{ form.consentRecordedBy ? ' by ' + form.consentRecordedBy : '' }}{{ form.consentRecordedAt ? ' · ' + new Date(form.consentRecordedAt).toLocaleDateString() : '' }}.</p>
            <p v-else style="font-size:12.5px; margin:8px 0 0; color:var(--amber);">A private address can’t be published until consent is recorded.</p>
            <p class="muted" style="font-size:12.5px; margin:14px 0 0;">When it’s shown is set by the <strong>event</strong> – this address appears only while a tour it’s a stop in is live, then hides automatically.</p>
            <p v-if="!inAnyTour" style="font-size:12.5px; margin:6px 0 0; color:var(--amber);">It isn’t a stop in any tour yet, so it won’t appear publicly until you add it to one (or set an override below).</p>
            <button type="button" class="btn btn-ghost btn-sm" style="margin-top:8px;" @click="overrideDates = !overrideDates">{{ overrideDates ? 'Hide override' : 'Override event dates' }}</button>
            <div v-if="overrideDates" class="field-row" style="margin-top:8px;">
              <div>
                <label for="loc-pub-from">Publish from <span class="hint">visible on/after</span></label>
                <input id="loc-pub-from" type="date" :value="dateIn(form.publishFrom)" @input="setPublishFrom($event.target.value)" />
              </div>
              <div>
                <label for="loc-pub-until">Publish until <span class="hint">hidden after</span></label>
                <input id="loc-pub-until" type="date" :value="dateIn(form.publishUntil)" @input="setPublishUntil($event.target.value)" />
              </div>
            </div>
          </div>
        </div>

        <!-- Guided-tour-only -->
        <div style="margin:18px 0; padding:14px 16px; border:1px solid var(--line); border-radius:12px;">
          <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
            <label style="display:flex; align-items:center; gap:9px; font-weight:500; margin:0; cursor:pointer;">
              <input type="checkbox" v-model="form.guidedTourOnly" style="width:18px; height:18px; margin:0; accent-color:var(--violet);" />
              <span>Guided tour only – hide from Discover mode</span>
            </label>
            <button type="button" @click="showTourHelp = !showTourHelp" :aria-expanded="showTourHelp" style="margin-left:auto; background:none; border:none; padding:0; font:inherit; font-size:12px; font-weight:600; color:var(--violet); cursor:pointer;">What does this do?</button>
          </div>
          <p v-if="showTourHelp" class="muted" style="font-weight:400; font-size:12.5px; margin:10px 0 0;">The stop only appears while someone is following a guided tour that includes it – never in proximity-based Discover browsing. Use for stops that only make sense in a narrated sequence.</p>
        </div>

        <label for="loc-radius">Trigger radius <span class="hint">metres · how close before a story unlocks</span></label>
        <input id="loc-radius" type="number" v-model.number="form.triggerRadius" min="20" max="300" />
      </div>

      <!-- Content. Most locations have a single story, edited inline here so the
           whole place is one screen (like it was before Stories). A location with
           2+ stories switches to a list, each edited on its own screen. -->
      <div class="card" style="padding:18px;">
        <!-- 2+ stories: the list -->
        <template v-if="multiStory">
          <div style="display:flex; justify-content:space-between; align-items:center; gap:10px;">
            <h3 style="margin:0; font-size:15px; min-width:0;">Stories <span class="hint" style="font-weight:400;">the content shown when this pin is&nbsp;tapped</span></h3>
            <button class="btn btn-ghost btn-sm" style="flex-shrink:0; white-space:nowrap;" @click="addStory">+ Add story</button>
          </div>
          <ul style="list-style:none; margin:12px 0 0; padding:0; display:flex; flex-direction:column; gap:8px;">
            <!-- eslint-disable-next-line vuejs-accessibility/no-static-element-interactions, vuejs-accessibility/click-events-have-key-events -- whole-row click is a pointer shortcut; the Edit button is the keyboard / assistive-tech path -->
            <li v-for="(s, i) in stories" :key="s.storyId" class="story-row" @click="editStory(s)" style="display:flex; align-items:center; gap:10px; padding:10px 12px; border:1px solid var(--line); border-radius:10px; cursor:pointer;">
              <span :style="{ flexShrink:0, width:'26px', height:'26px', borderRadius:'7px', background: s.hue || '#8a7d97', opacity: s.status === 'draft' ? 0.4 : 1 }"></span>
              <span style="flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-weight:600;">{{ s.heading || '(untitled story)' }}<span v-if="s.status === 'draft'" class="badge draft" style="margin-left:8px; font-weight:600;">Hidden</span></span>
              <button type="button" class="btn btn-ghost btn-sm" :disabled="i === 0" @click.stop="move(i, -1)" aria-label="Move up">▲</button>
              <button type="button" class="btn btn-ghost btn-sm" :disabled="i === stories.length - 1" @click.stop="move(i, 1)" aria-label="Move down">▼</button>
              <button type="button" class="btn btn-ghost btn-sm" @click.stop="editStory(s)">Edit</button>
              <button type="button" class="btn btn-danger btn-sm" @click.stop="removeStory(s)" aria-label="Delete story" title="Delete">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:middle;"><path d="M3 6h18" /><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /></svg>
              </button>
            </li>
          </ul>
        </template>

        <!-- 0–1 story: edit it inline. The heading tracks the place title, and the
             location's own Published/Draft governs visibility, so there's no
             separate story toggle here. -->
        <template v-else>
          <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; margin-bottom:14px;">
            <h3 style="margin:0; font-size:15px; min-width:0;">Story <span class="hint" style="font-weight:400;">the content shown when this pin is&nbsp;tapped</span></h3>
            <button v-if="storyForm.storyId" type="button" class="btn btn-ghost btn-sm" style="flex-shrink:0; white-space:nowrap;" @click="addAnotherStory">+ Add another story</button>
          </div>
          <StoryFields ref="fields" :key="storyKey" :story="storyForm" :show-heading="false" />
        </template>
      </div>

      <!-- save -->
      <div class="card" style="padding:18px; display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
        <div class="seg-toggle" role="group" aria-label="Visibility">
          <button type="button" :class="{ on: form.status === 'published' }" @click="form.status = 'published'">Published</button>
          <button type="button" :class="{ on: form.status !== 'published' }" @click="form.status = 'draft'">Draft</button>
        </div>
        <button class="btn btn-primary" @click="save()" :disabled="saving">{{ saving ? 'Saving…' : 'Save' }}</button>
        <span v-if="flash" role="status" style="font-size:13px; font-weight:600; color:var(--green);">{{ flash }}</span>
        <button class="btn btn-ghost btn-sm" style="margin-left:auto;" @click="back">← Back to list</button>
      </div>
      </div>

      <!-- right: address + map -->
      <div style="display:flex; flex-direction:column; gap:20px;">
        <div class="card" style="padding:18px;">
          <label for="loc-address">Address <span class="hint">type an address, then “Find on map” to drop the pin</span></label>
          <div style="display:flex; gap:8px; align-items:flex-start;">
            <input id="loc-address" type="text" v-model="form.address" placeholder="2 East Street, Tollesbury, CM9 8QD" style="flex:1; min-width:0;" @keydown.enter.prevent="geocode()" />
            <button type="button" class="btn btn-ghost btn-sm" style="flex-shrink:0; white-space:nowrap;" :disabled="geocoding" @click="geocode()">{{ geocoding ? 'Finding…' : 'Find on map' }}</button>
          </div>
          <p v-if="geoError" class="warn" role="alert" style="margin:6px 0 0; font-size:12.5px; color:var(--danger,#c0392b);">{{ geoError }}</p>

          <span class="field-label" style="margin-top:14px;">Location <span class="hint">click the map, or paste coordinates below</span></span>
          <PlaceMap v-model="coords" :hue="hue" :center="mapCenter" />
          <label for="loc-coords" style="margin-top:10px;">Paste coordinates <span class="hint">lat, lng – e.g. copied from Google Maps</span></label>
          <input id="loc-coords" type="text" :value="coordsText" @change="pasteCoords($event.target.value)" placeholder="51.7607, 0.8369" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { store } from '../store.js'
import { HUE_OPTIONS } from '../../lib/tokens.js'
import { config } from '../../config.js'
import PlaceMap from '../components/PlaceMap.vue'
import StoryFields from '../components/StoryFields.vue'

const cities = config.cities
const mapCenter = config.mapCenter

const existing = store.params.id ? store.locations.find((l) => l.id === store.params.id) : null
const isNew = !existing

const blank = {
  id: 'loc-' + Math.random().toString(36).slice(2, 8),
  recordId: undefined, title: '', city: config.cities[0], address: '',
  lat: null, lng: null, triggerRadius: 80, tourNum: null, status: 'draft',
  visibility: 'public', publishFrom: null, publishUntil: null, guidedTourOnly: false,
  consentGiven: false, consentContact: '', consentRecordedAt: null, consentRecordedBy: '', consentNoticeVersion: '',
}
const form = reactive(existing ? JSON.parse(JSON.stringify(existing)) : { ...blank })
if (!form.visibility) form.visibility = 'public'
if (form.guidedTourOnly === undefined) form.guidedTourOnly = false

// live location record from the store (so the Stories list reflects saves/reorders)
const liveLoc = computed(() => store.locations.find((l) => l.recordId === form.recordId) || null)
const stories = computed(() => liveLoc.value?.stories || [])
// 2+ stories → show the list (each edited on its own screen); 0–1 → edit inline.
const multiStory = computed(() => stories.value.length >= 2)

// ── inline single story (Tour → Location → Story) ──
// A blank story mirrors the standalone editor's defaults.
function blankStory() {
  return {
    storyId: undefined, locationId: form.recordId, sortOrder: 1,
    heading: '', period: '', significance: '', summary: '', wikiUrl: config.wikiBaseUrl, linkLabel: '',
    heroImageUrl: '', historicImageUrl: '', sliderAfterUrl: '', heroPosition: '50% 50%', historicPosition: '50% 50%', sliderAfterPosition: '50% 50%',
    imageAlt: '', historicAlt: '', imageLabel: '', historicLabel: '', photoCredit: '', photoCreditUrl: '', showPhotoCredit: true,
    historicCredit: '', historicCreditUrl: '', portraitUrl: '', portraitAlt: '', portraitCaption: '', portraitCredit: '', portraitCreditUrl: '',
    audioUrl: '', audioDuration: 0, transcript: '', videoUrl: '', videoCaption: '', thumbnailUrl: '', caption: '', links: '',
    hue: HUE_OPTIONS[0].value, relatedIds: [], notesInternal: '', status: 'published',
  }
}
// the single story shown inline, seeded from the existing first story (a copy so
// edits are only committed on Save) or a fresh blank.
const firstStory = existing?.stories?.[0] || null
const storyForm = reactive(firstStory ? JSON.parse(JSON.stringify(firstStory)) : blankStory())
if (storyForm.showPhotoCredit === undefined) storyForm.showPhotoCredit = true
const fields = ref(null)               // <StoryFields> instance (inline mode only)
const storyKey = ref(0)                // bump to remount StoryFields on a fresh seed
const storyBaseline = ref(JSON.stringify(storyForm))
// re-seed the inline story from the store's current first story (used when a
// delete drops a multi-story location back to one).
function seedStoryForm() {
  const src = stories.value[0]
  const fresh = src ? JSON.parse(JSON.stringify(src)) : blankStory()
  fresh.locationId = form.recordId
  Object.keys(storyForm).forEach((k) => { delete storyForm[k] })
  Object.assign(storyForm, fresh)
  if (storyForm.showPhotoCredit === undefined) storyForm.showPhotoCredit = true
  storyBaseline.value = JSON.stringify(storyForm)
  storyKey.value++
}

// map pin colour: the inline story's hue while editing it, else the primary
// story's hue, else a neutral default.
const hue = computed(() => (multiStory.value ? stories.value[0]?.hue : storyForm.hue) || HUE_OPTIONS[0].value)

const showVisHelp = ref(false)
const showTourHelp = ref(false)

// ── unsaved-changes guard ──
const baseline = ref(JSON.stringify(form))
const isDirty = () => JSON.stringify(form) !== baseline.value || (!multiStory.value && JSON.stringify(storyForm) !== storyBaseline.value)
function onBeforeUnload(e) { if (isDirty()) { e.preventDefault(); e.returnValue = '' } }
onMounted(() => { store.registerDirtyCheck(isDirty, save); window.addEventListener('beforeunload', onBeforeUnload) })
onUnmounted(() => { store.clearDirtyCheck(); window.removeEventListener('beforeunload', onBeforeUnload) })

// ── privacy / publication helpers ──
const overrideDates = ref(!!(form.publishFrom || form.publishUntil))
const inAnyTour = computed(() => store.tours.some((t) => t.stopIds.includes(form.id)))
const dateIn = (iso) => (iso ? new Date(iso).toLocaleDateString('en-CA') : '')
function setPublishFrom(v) { form.publishFrom = v ? new Date(v + 'T00:00:00').toISOString() : null }
function setPublishUntil(v) { form.publishUntil = v ? new Date(v + 'T23:59:59').toISOString() : null }
function onConsent(e) {
  if (e.target.checked) {
    form.consentGiven = true
    form.consentRecordedAt = new Date().toISOString()
    form.consentRecordedBy = store.user?.email || ''
    form.consentNoticeVersion = config.consentNoticeVersion
  } else { form.consentGiven = false }
}

// ── coordinates ──
const coords = ref(form.lat != null ? { lat: form.lat, lng: form.lng } : null)
watch(coords, (c) => { if (c) { form.lat = c.lat; form.lng = c.lng } })
const coordsText = computed(() => (coords.value ? `${coords.value.lat.toFixed(6)}, ${coords.value.lng.toFixed(6)}` : ''))
function pasteCoords(v) {
  const m = (v || '').trim().match(/^(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)$/)
  if (!m) { if ((v || '').trim()) alert('Paste coordinates as “lat, lng”, e.g. 51.7607, 0.8369'); return }
  coords.value = { lat: parseFloat(m[1]), lng: parseFloat(m[2]) }
}

// ── address geocoding (OpenStreetMap Nominatim) ──
// Browsers can't set a User-Agent header (it's forbidden), so the request is
// identified by the app's Referer — fine for one-at-a-time admin use. Debounced
// and single-flight so we never exceed Nominatim's 1 req/sec fair-use limit.
const geocoding = ref(false)
const geoError = ref('')
let geoTimer
function geocode() {
  clearTimeout(geoTimer)
  geoTimer = setTimeout(runGeocode, 500)
}
async function runGeocode() {
  const q = (form.address || '').trim()
  if (!q) { geoError.value = ''; return }
  geocoding.value = true
  geoError.value = ''
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`
    const res = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!res.ok) throw new Error('lookup failed')
    const results = await res.json()
    if (!results.length) { geoError.value = 'Address not found — try a postcode or a more specific address.'; return }
    coords.value = { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) }
  } catch {
    geoError.value = 'Address lookup failed — check your connection and try again.'
  } finally {
    geocoding.value = false
  }
}

// ── save ──
const saving = ref(false)
const flash = ref('')
let flashTimer
async function save() {
  if (!form.title) { alert('Title is required.'); return }
  if (form.lat == null) { alert('Drop a pin on the map (or use “Find on map”) to set the location.'); return }
  if (form.status === 'published' && form.visibility === 'private' && !form.consentGiven) {
    alert('This is a private address. Record the resident’s consent (tick the box) before publishing.')
    return
  }
  saving.value = true
  try {
    await store.saveLocation({ ...form })
    if (!form.recordId) {
      const saved = store.locations.find((l) => l.id === form.id)
      if (saved) form.recordId = saved.recordId
    }
    // Inline single-story mode: save its story alongside the place. We only
    // create a story if there's actually content (so saving a bare place doesn't
    // leave an empty story); an existing story is always re-saved.
    if (!multiStory.value && form.recordId) await saveInlineStory()
    baseline.value = JSON.stringify(form)
    flash.value = form.status === 'published' ? 'Saved · Published ✓' : 'Saved · Draft ✓'
    clearTimeout(flashTimer)
    flashTimer = setTimeout(() => { flash.value = '' }, 4000)
  } catch (e) { alert('Save failed: ' + e.message) } finally { saving.value = false }
}

// Persist the inline story. Heading tracks the place title, and visibility is
// governed by the location's own Published/Draft (no separate story toggle here).
async function saveInlineStory() {
  const s = storyForm
  const hasContent = !!(String(s.summary || '').trim() || s.heroImageUrl || s.audioUrl || s.videoUrl || s.historicImageUrl || s.portraitUrl)
  if (!s.storyId && !hasContent) { storyBaseline.value = JSON.stringify(s); return } // nothing worth saving yet
  fields.value?.normalize()
  s.locationId = form.recordId
  s.heading = form.title
  if (!s.status) s.status = 'published'
  if (!s.sortOrder) s.sortOrder = 1
  const saved = await store.saveStory({ ...s })
  if (!s.storyId && saved?.id) s.storyId = saved.id
  const inUse = new Set(fields.value?.inUseUrls() || [])
  for (const url of fields.value?.sessionUploads || []) if (!inUse.has(url)) await store.removeMedia(url).catch(() => {})
  storyBaseline.value = JSON.stringify(s)
}
function back() { store.go('locations') }

// ── stories ──
function addStory() { store.go('story', { locationId: form.recordId }) }
function editStory(s) { store.go('story', { locationId: form.recordId, storyId: s.storyId }) }
// From the inline single-story view: save the place + this story, then open a
// fresh second story (which flips this location into multi-story list mode).
async function addAnotherStory() {
  await save()
  if (form.recordId && storyForm.storyId) store.go('story', { locationId: form.recordId })
}
async function removeStory(s) {
  if (!window.confirm(`Delete the story “${s.heading || 'untitled'}”? This can’t be undone.`)) return
  try {
    await store.deleteStory(s)
    // if we've dropped back to a single story, re-seed the inline editor from it
    if (stories.value.length <= 1) seedStoryForm()
  } catch (e) { alert('Delete failed: ' + e.message) }
}
async function move(i, dir) {
  const list = [...stories.value]
  const j = i + dir
  if (j < 0 || j >= list.length) return
  ;[list[i], list[j]] = [list[j], list[i]]
  try { await store.reorderStories(list) } catch (e) { alert('Reorder failed: ' + e.message) }
}
</script>

<style scoped>
/* the whole story row is clickable to edit; give it a hover cue */
.story-row:hover { background: var(--bg); border-color: var(--violet); }
</style>
