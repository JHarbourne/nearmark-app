<!-- Announcement editor — an event form that mirrors the location/story treatment:
     a hero image with focal point + caption + credit, an address with a map pin (for
     directions), plus the event's date/time, link and optional linked walk.
     See docs/announcements-spec.md. -->
<template>
  <div>
    <div class="pagehead">
      <h1>{{ isNew ? 'New announcement' : 'Edit announcement' }}</h1>
      <div style="display:flex; gap:8px; align-items:center;">
        <button v-if="!isNew" class="btn btn-ghost btn-sm" @click="preview" title="Open the event page in the app in a new tab">Preview</button>
        <button class="btn btn-ghost" @click="back">← Back to list</button>
      </div>
    </div>

    <div class="editor-cols" style="display:grid; grid-template-columns: 1fr 1fr; gap:24px; align-items:start;">
      <!-- left: content -->
      <div class="card" style="padding:22px;">
        <label for="ann-title">Title</label>
        <input id="ann-title" type="text" v-model="form.title" placeholder="Christmas Faire" />

        <div class="field-row">
          <div>
            <label for="ann-start">Starts <span class="hint">optional · blank = a standing notice</span></label>
            <input id="ann-start" type="datetime-local" v-model="startLocal" />
          </div>
          <div>
            <label for="ann-end">Ends / expires <span class="hint">date &amp; time · when it disappears</span></label>
            <input id="ann-end" type="datetime-local" v-model="endLocal" />
          </div>
        </div>

        <label for="ann-place">Place <span class="hint">venue name, e.g. Parish Rooms</span></label>
        <input id="ann-place" type="text" v-model="form.place" placeholder="Parish Rooms" />

        <label for="ann-desc">Description <span class="hint">Markdown: <code>**bold**</code>, <code>*italic*</code>, <code>-</code> bullets</span></label>
        <textarea id="ann-desc" v-model="form.description" rows="5"></textarea>

        <!-- Image — same treatment as a story/location hero -->
        <label for="ann-img">Image <span class="hint">optional · shown at the top of the event page</span></label>
        <div class="media-row">
          <div class="media-input">
            <input id="ann-img" type="url" v-model="form.imageUrl" placeholder="Paste a URL, or use the icons →" />
            <div class="media-actions">
              <label class="icon-btn" :class="{ busy: uploading }" :title="uploading ? 'Uploading…' : 'Upload an image from your device'">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 16V4" /><path d="m6 10 6-6 6 6" /><path d="M4 20h16" /></svg>
                <input type="file" accept="image/*" aria-label="Upload an image from your device" style="display:none" @change="up" />
              </label>
              <button type="button" class="icon-btn" title="Choose from the media library" aria-label="Choose from the media library" @click="picker.open = true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.6" /><path d="m21 15-5-5L5 21" /></svg>
              </button>
            </div>
          </div>
        </div>
        <template v-if="form.imageUrl">
          <div role="button" tabindex="0" :style="focalBox(form.imageUrl, form.imagePosition)" aria-label="Image focal point. Click, or focus and use arrow keys, to set what stays in view." @click="setFocal($event)" @keydown="nudgeFocal($event)">
            <span :style="focalDot(form.imagePosition)"></span>
          </div>
          <p class="muted" style="font-size:11.5px; margin:4px 0 0;">Click, or use arrow keys, to set the focal point.</p>
          <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; margin:16px 0 6px;">
            <label for="ann-credit" style="margin:0;">Photo credit <span class="hint">photographer / source</span></label>
            <label style="display:flex; align-items:center; gap:7px; margin:0; font-size:13px; font-weight:600; cursor:pointer; white-space:nowrap;" title="Off = kept on record, hidden in the app">
              <input type="checkbox" v-model="form.showImageCredit" style="margin:0;" /> Show
            </label>
          </div>
          <input id="ann-credit" type="text" v-model="form.imageCredit" placeholder="Photographer / source" />
          <label for="ann-credit-link">Credit link <span class="hint">optional</span></label>
          <input id="ann-credit-link" type="url" v-model="form.imageCreditUrl" placeholder="https://…" />
          <label for="ann-caption">Image caption <span class="hint">under the photo</span></label>
          <input id="ann-caption" type="text" v-model="form.imageCaption" placeholder="e.g. Last year's fair in the Parish Rooms" />
          <label for="ann-alt">Alt text <span class="hint">screen readers · skipped if a caption is set</span></label>
          <input id="ann-alt" type="text" v-model="form.imageAlt" placeholder="e.g. Stalls in the Parish Rooms" />
        </template>

        <div class="field-row">
          <div>
            <label for="ann-link">Link <span class="hint">optional · tickets / Facebook event</span></label>
            <input id="ann-link" type="url" v-model="form.linkUrl" placeholder="https://…" />
          </div>
          <div>
            <label for="ann-linklabel">Link button text <span class="hint">optional</span></label>
            <input id="ann-linklabel" type="text" v-model="form.linkLabel" placeholder="e.g. Book tickets" maxlength="40" />
          </div>
        </div>

        <label for="ann-tour">Linked walk <span class="hint">optional · if this event is also a tour</span></label>
        <select id="ann-tour" v-model="form.tourSlug">
          <option value="">None</option>
          <option v-for="t in store.tours" :key="t.id" :value="t.id">{{ t.title }}</option>
        </select>

        <label for="ann-booking">Stall bookings <span class="hint">optional · web reference for this event's stall bookings, e.g. faire-2026-12</span></label>
        <input id="ann-booking" type="text" v-model.trim="form.bookingKey" placeholder="e.g. faire-2026-12" />
        <p class="hint" style="margin-top:4px;">Set this to match the reference the website booking form sends, and this event appears in <strong>Event Bookings</strong> – even while it is still a draft. Leave blank if it takes no stall bookings.</p>

        <div style="display:flex; gap:12px; margin-top:22px; align-items:center; flex-wrap:wrap;">
          <div class="seg-toggle" role="group" aria-label="Visibility">
            <button type="button" :class="{ on: form.status === 'published' }" @click="form.status = 'published'">Published</button>
            <button type="button" :class="{ on: form.status !== 'published' }" @click="form.status = 'draft'">Draft</button>
          </div>
          <button class="btn btn-primary" @click="save()" :disabled="saving || !canManage">{{ saving ? 'Saving…' : 'Save' }}</button>
          <span v-if="!canManage" class="muted" role="status" style="font-size:13px;">Only a Super Admin can manage announcements.</span>
          <span v-if="flash" role="status" style="font-size:13px; font-weight:600; color:var(--green);">{{ flash }}</span>
          <button v-if="!isNew && canManage" class="btn btn-danger btn-sm" style="margin-left:auto;" @click="remove">Delete</button>
        </div>
        <p class="hint" style="margin-top:10px;">A dated <strong>event</strong> uses both times. For a <strong>standing notice or advert</strong> (a business, a service), leave <strong>Starts</strong> blank — it shows with no date and comes down at the <strong>expiry</strong> you set under Ends (or stays until you unpublish, if you leave both blank).</p>
      </div>

      <!-- right: address + map (for directions, like a location) -->
      <div class="card" style="padding:18px;">
        <label for="ann-address">Address <span class="hint">type an address, then “Find on map” to drop the pin</span></label>
        <div style="display:flex; gap:8px; align-items:flex-start;">
          <input id="ann-address" type="text" v-model="form.address" placeholder="High Street, Tollesbury, CM9 8QB" style="flex:1; min-width:0;" @keydown.enter.prevent="geocode()" />
          <button type="button" class="btn btn-ghost btn-sm" style="flex-shrink:0; white-space:nowrap;" :disabled="geocoding" @click="geocode()">{{ geocoding ? 'Finding…' : 'Find on map' }}</button>
        </div>
        <p v-if="geoError" class="warn" role="alert" style="margin:6px 0 0; font-size:12.5px; color:var(--danger,#c0392b);">{{ geoError }}</p>

        <span class="field-label" style="margin-top:14px;">Location <span class="hint">click the map, or paste coordinates below · powers the “Directions” link</span></span>
        <PlaceMap v-model="coords" :hue="hue" :center="mapCenter" />
        <label for="ann-coords" style="margin-top:10px;">Paste coordinates <span class="hint">lat, lng</span></label>
        <input id="ann-coords" type="text" :value="coordsText" @change="pasteCoords($event.target.value)" placeholder="51.7607, 0.8369" />
      </div>
    </div>

    <MediaPicker :open="picker.open" :current="form.imageUrl" @select="onPickImage" @close="picker.open = false" />
  </div>
</template>

<script setup>
import { reactive, ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { store } from '../store.js'
import { config } from '../../config.js'
import PlaceMap from '../components/PlaceMap.vue'
import MediaPicker from '../components/MediaPicker.vue'

const existing = store.params.id ? store.announcements.find((a) => a.id === store.params.id) : null
const isNew = !existing
const canManage = computed(() => store.role !== 'editor') // SA, or no RBAC on this project
const hue = '#9B6DFF'
const mapCenter = computed(() => store.defaultMapCenter)

const blank = {
  id: 'ann-' + Math.random().toString(36).slice(2, 8), recordId: undefined,
  title: '', eventStart: '', eventEnd: '', place: '', address: '', lat: null, lng: null,
  description: '', imageUrl: '', imageAlt: '', imageCaption: '', imageCredit: '', imageCreditUrl: '',
  showImageCredit: true, imagePosition: '50% 50%', linkUrl: '', linkLabel: '', tourSlug: '',
  bookingKey: '', status: 'draft', sortOrder: 0,
}
const form = reactive(existing ? JSON.parse(JSON.stringify(existing)) : { ...blank })
for (const k of ['eventStart', 'eventEnd', 'place', 'address', 'description', 'imageUrl', 'imageAlt', 'imageCaption', 'imageCredit', 'imageCreditUrl', 'linkUrl', 'linkLabel', 'tourSlug', 'bookingKey']) {
  if (form[k] == null) form[k] = ''
}
if (!form.imagePosition) form.imagePosition = '50% 50%'
if (form.showImageCredit === undefined) form.showImageCredit = true

// event_start/end are ISO timestamps; <input type="datetime-local"> is local time.
function toLocalInput(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
const fromLocalInput = (v) => (v ? new Date(v).toISOString() : '')
const startLocal = computed({ get: () => toLocalInput(form.eventStart), set: (v) => { form.eventStart = fromLocalInput(v) } })
const endLocal = computed({ get: () => toLocalInput(form.eventEnd), set: (v) => { form.eventEnd = fromLocalInput(v) } })

// ── map pin / coordinates ──
const coords = ref(form.lat != null && form.lng != null ? { lat: form.lat, lng: form.lng } : null)
watch(coords, (c) => { form.lat = c?.lat ?? null; form.lng = c?.lng ?? null }, { deep: true })
const coordsText = computed(() => coords.value ? `${coords.value.lat.toFixed(5)}, ${coords.value.lng.toFixed(5)}` : '')
function pasteCoords(v) {
  const m = String(v).match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/)
  if (m) coords.value = { lat: parseFloat(m[1]), lng: parseFloat(m[2]) }
}
const geocoding = ref(false)
const geoError = ref('')
let geoTimer
function geocode() { clearTimeout(geoTimer); geoTimer = setTimeout(runGeocode, 400) }
async function runGeocode() {
  const q = (form.address || '').trim()
  if (!q) { geoError.value = ''; return }
  geocoding.value = true; geoError.value = ''
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`
    const res = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!res.ok) throw new Error('lookup failed')
    const results = await res.json()
    if (!results.length) { geoError.value = 'Address not found — try a postcode or a more specific address.'; return }
    coords.value = { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) }
  } catch { geoError.value = 'Address lookup failed — check your connection and try again.' }
  finally { geocoding.value = false }
}

// ── image focal point (same picker as locations/stories) ──
function focalBox(url, pos) {
  return { marginTop: '8px', width: '100%', aspectRatio: '16 / 9', borderRadius: '10px', border: '1px solid var(--line)', backgroundImage: `url(${url})`, backgroundSize: 'cover', backgroundPosition: pos || '50% 50%', backgroundRepeat: 'no-repeat', position: 'relative', cursor: 'crosshair' }
}
function focalDot(pos) {
  const [x, y] = (pos || '50% 50%').split(' ')
  return { position: 'absolute', left: x, top: y, transform: 'translate(-50%,-50%)', width: '16px', height: '16px', borderRadius: '50%', background: 'rgba(107,70,229,0.9)', border: '2px solid #fff', boxShadow: '0 0 0 2px rgba(0,0,0,0.35)', pointerEvents: 'none' }
}
function setFocal(e) {
  const r = e.currentTarget.getBoundingClientRect()
  const x = Math.round(Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100)))
  const y = Math.round(Math.max(0, Math.min(100, ((e.clientY - r.top) / r.height) * 100)))
  form.imagePosition = `${x}% ${y}%`
}
function nudgeFocal(e) {
  const step = { ArrowLeft: [-5, 0], ArrowRight: [5, 0], ArrowUp: [0, -5], ArrowDown: [0, 5] }[e.key]
  if (!step) return
  e.preventDefault()
  const [cx, cy] = (form.imagePosition || '50% 50%').split(' ').map((v) => parseInt(v, 10) || 0)
  form.imagePosition = `${Math.max(0, Math.min(100, cx + step[0]))}% ${Math.max(0, Math.min(100, cy + step[1]))}%`
}

// ── image upload / library ──
const uploading = ref(false)
const picker = reactive({ open: false })
function onPickImage(url) { form.imageUrl = url }
async function up(e) {
  const file = e.target.files[0]
  if (!file) return
  uploading.value = true
  try { form.imageUrl = await store.upload(file, 'image') }
  catch (err) { alert('Upload failed: ' + err.message) }
  finally { uploading.value = false; e.target.value = '' }
}

// ── unsaved-changes guard ──
const baseline = ref(JSON.stringify(form))
const isDirty = () => JSON.stringify(form) !== baseline.value
function onBeforeUnload(e) { if (isDirty()) { e.preventDefault(); e.returnValue = '' } }
onMounted(() => { store.registerDirtyCheck(isDirty, save); window.addEventListener('beforeunload', onBeforeUnload) })
onUnmounted(() => { store.clearDirtyCheck(); window.removeEventListener('beforeunload', onBeforeUnload) })

const saving = ref(false)
const flash = ref('')
let flashTimer
async function save() {
  if (!canManage.value) return
  if (!form.title.trim()) { alert('Give the announcement a title first.'); return }
  saving.value = true
  try {
    await store.saveAnnouncement({ ...form })
    baseline.value = JSON.stringify(form)
    const saved = store.announcements.find((a) => a.id === form.id)
    if (saved) form.recordId = saved.recordId
    flash.value = form.status === 'published' ? 'Saved · Published ✓' : 'Saved · Draft ✓'
    clearTimeout(flashTimer); flashTimer = setTimeout(() => (flash.value = ''), 2500)
  } catch (e) { alert('Save failed: ' + e.message) } finally { saving.value = false }
}
async function remove() {
  if (!confirm(`Delete announcement “${form.title}”?`)) return
  try { await store.deleteAnnouncement({ ...form }); back() }
  catch (e) { alert('Delete failed: ' + e.message) }
}
function preview() {
  const base = config.publicUrl || window.location.origin
  window.open(`${base}/?event=${encodeURIComponent(form.id)}`, '_blank', 'noopener')
}
function back() { store.go('announcements') }
</script>

<style scoped>
/* image URL field + its upload/library icons (same as the story editor's hero row) */
.media-input { position: relative; }
.media-input > input { padding-right: 78px; }
.media-row { display: flex; align-items: center; gap: 8px; }
.media-row > .media-input { flex: 1; min-width: 0; }
.media-actions { position: absolute; right: 5px; top: 50%; transform: translateY(-50%); display: flex; gap: 2px; }
.icon-btn { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; padding: 0; margin: 0; border: none; border-radius: 8px; background: none; color: var(--muted); cursor: pointer; }
.icon-btn:hover { background: var(--bg); color: var(--ink); }
.icon-btn:focus-visible { outline: 2px solid var(--violet); outline-offset: 1px; }
.icon-btn.busy { opacity: 0.5; cursor: default; }
</style>
