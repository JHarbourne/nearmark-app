<!-- A6 Tour editor (BRD §11.6): metadata + drag-to-reorder stops + live route map. -->
<template>
  <div>
    <!-- inline icon sprite, referenced by the compact cover-image buttons below -->
    <svg style="display:none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
      <symbol id="ic-upload" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4" /><path d="m6 10 6-6 6 6" /><path d="M4 20h16" /></symbol>
      <symbol id="ic-image" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.6" /><path d="m21 15-5-5L5 21" /></symbol>
    </svg>

    <div class="pagehead">
      <h1>{{ isNew ? 'New tour' : 'Edit tour' }}</h1>
      <button class="btn btn-ghost" @click="back">← Back to list</button>
    </div>

    <div class="editor-cols" style="display:grid; grid-template-columns: 1fr 1fr; gap:24px; align-items:start;">
      <div class="card" style="padding:22px;">
        <label for="tour-title">Title</label>
        <input id="tour-title" type="text" v-model="form.title" />

        <label for="tour-city">City</label>
        <select id="tour-city" v-model="form.city"><option v-for="c in cities" :key="c" :value="c">{{ c }}</option></select>

        <label for="tour-theme">Theme <span class="hint">short descriptor</span></label>
        <input id="tour-theme" type="text" v-model="form.theme" placeholder="Resistance & resilience 1890–1999" />

        <label for="tour-description">Description</label>
        <textarea id="tour-description" v-model="form.description" rows="3"></textarea>

        <label for="tour-cover-url">Cover image <span class="hint">shown on the tour list</span></label>
        <div class="media-input">
          <input id="tour-cover-url" type="url" v-model="form.coverImageUrl" placeholder="Paste a URL, or use the icons →" />
          <div class="media-actions">
            <label class="icon-btn" :class="{ busy: uploadingCover }" :title="uploadingCover ? 'Uploading…' : 'Upload a cover image from your device'">
              <svg class="ic"><use href="#ic-upload" /></svg>
              <input type="file" accept="image/*" aria-label="Upload a cover image from your device" style="display:none" @change="uploadCover" />
            </label>
            <button type="button" class="icon-btn" title="Choose from the media library" aria-label="Choose a cover image from the media library" @click="openPicker('coverImageUrl')">
              <svg class="ic"><use href="#ic-image" /></svg>
            </button>
          </div>
        </div>
        <button v-if="coverUndo !== undefined" type="button" class="btn btn-ghost btn-sm" style="margin-top:6px;" @click="undoCover">↩ Undo</button>
        <div v-if="form.coverImageUrl" role="button" tabindex="0" :style="focalBox(form.coverImageUrl, form.coverPosition)" aria-label="Cover image focal point. Click, or focus and use arrow keys, to set what stays in view." @click="setFocal($event,'coverPosition')" @keydown="nudgeFocal($event,'coverPosition')">
          <span :style="focalDot(form.coverPosition)"></span>
        </div>
        <p v-if="form.coverImageUrl" class="muted" style="font-size:11.5px; margin:4px 0 0;">Click, or use arrow keys, to set what stays in view when cropped.</p>

        <template v-if="form.coverImageUrl">
          <label for="tour-cover-alt">Alt text <span class="hint">describe the cover image for screen readers</span></label>
          <input id="tour-cover-alt" type="text" v-model="form.coverAlt" placeholder="Describe the cover photo" />
        </template>

        <div class="field-row" v-if="form.coverImageUrl">
          <div>
            <label for="tour-cover-credit">Photo credit <span class="hint">e.g. Jane Doe / Unsplash</span></label>
            <input id="tour-cover-credit" type="text" v-model="form.coverCredit" placeholder="Photographer / source" />
          </div>
          <div>
            <label for="tour-cover-credit-link">Photo credit link <span class="hint">optional</span></label>
            <input id="tour-cover-credit-link" type="url" v-model="form.coverCreditUrl" placeholder="https://…" />
          </div>
        </div>
        <label v-if="form.coverImageUrl" style="display:flex; align-items:center; gap:9px; margin-top:2px; font-weight:500; cursor:pointer;">
          <input type="checkbox" v-model="form.showCoverCredit" />
          <span>Show this credit on the cover <span class="hint">off = kept on record, hidden in the app</span></span>
        </label>

        <label for="tour-duration">Estimated duration <span class="hint">mins · blank = auto</span></label>
        <input id="tour-duration" type="number" v-model.number="form.durationOverrideMins" :placeholder="`auto: ${autoMins} min`" min="0" />

        <!-- event window (migrations 011/012): private stops inherit these dates.
             Collapsed by default – only relevant to tours that include private addresses. -->
        <div style="margin:18px 0; padding:14px 16px; border:1px solid var(--line); border-radius:12px;">
          <div style="display:flex; align-items:center; justify-content:space-between; gap:12px;">
            <span class="field-label" style="margin-top:0;">Event window <span class="hint">optional · only for tours with private addresses</span></span>
            <button type="button" class="btn btn-ghost btn-sm" @click="showEventWindow = !showEventWindow" :aria-expanded="String(showEventWindow)">{{ showEventWindow ? 'Hide' : 'Set dates' }}</button>
          </div>
          <template v-if="showEventWindow">
            <p class="muted" style="font-size:12.5px; margin:10px 0 12px;">Private addresses in this event are shown only during this window, then automatically hidden – you set the dates here, once, and every private stop follows them.</p>
            <div class="field-row">
              <div>
                <label for="tour-event-start">Event start</label>
                <input id="tour-event-start" type="date" :value="dateIn(form.eventStart)" @input="setEventStart($event.target.value)" />
              </div>
              <div>
                <label for="tour-event-end">Event end</label>
                <input id="tour-event-end" type="date" :value="dateIn(form.eventEnd)" @input="setEventEnd($event.target.value)" />
              </div>
            </div>
            <label for="tour-takedown">Auto take-down <span class="hint">private addresses hidden after this · defaults to event end + 7 days</span></label>
            <input id="tour-takedown" type="date" :value="dateIn(form.takedownAt)" @input="setTakedown($event.target.value)" />
          </template>
        </div>

        <hr style="border:none; border-top:1px solid var(--line); margin:22px 0;" />

        <span class="field-label" style="margin-top:0;">Stops <span class="hint">drag, or use the ▲ ▼ buttons, to reorder</span></span>
        <div v-for="(id, i) in form.stopIds" :key="id">
          <!-- eslint-disable-next-line vuejs-accessibility/no-static-element-interactions -- drag is a pointer enhancement; the ▲/▼ buttons provide the keyboard-accessible reorder (WCAG 2.5.7) -->
          <div
            class="drag-item" :class="{ dragging: dragIdx === i }"
            draggable="true"
            @dragstart="dragIdx = i"
            @dragover.prevent
            @drop="drop(i)"
            @dragend="dragIdx = null"
          >
            <span style="font-family:'Bricolage Grotesque'; font-weight:700; width:22px; height:22px; border-radius:6px; display:flex; align-items:center; justify-content:center; font-size:12px;" :style="{ background: byId[id]?.hue || '#ccc', color: readableInk(byId[id]?.hue || '#ccc') }">{{ i + 1 }}</span>
            <span style="flex:1;">{{ byId[id]?.title || id }}<span v-if="ov(id).title || ov(id).blurb" class="hint" style="margin-left:6px;">· custom text</span></span>
            <button type="button" class="btn btn-ghost btn-sm" :disabled="i === 0" @click="moveStop(i, -1)" :aria-label="`Move ${byId[id]?.title || id} up`">▲</button>
            <button type="button" class="btn btn-ghost btn-sm" :disabled="i === form.stopIds.length - 1" @click="moveStop(i, 1)" :aria-label="`Move ${byId[id]?.title || id} down`">▼</button>
            <button type="button" class="btn btn-ghost btn-sm" @click="overrideOpen[id] = !overrideOpen[id]" :aria-expanded="String(!!overrideOpen[id])" :aria-label="`Tour-specific text for ${byId[id]?.title || id}`">Tour text</button>
            <button type="button" class="btn btn-ghost btn-sm" @click="removeStop(i)" :aria-label="`Remove ${byId[id]?.title || id}`">Remove</button>
          </div>
          <div v-if="overrideOpen[id]" style="margin:-2px 0 10px; padding:12px 14px; border:1px solid var(--line); border-radius:10px;">
            <label :for="`ov-title-${id}`">Title for this tour <span class="hint">optional · defaults to the location's title</span></label>
            <input :id="`ov-title-${id}`" type="text" :value="ov(id).title || ''" @input="setOv(id, 'title', $event.target.value)" :placeholder="byId[id]?.title" />
            <label :for="`ov-blurb-${id}`">Blurb for this tour <span class="hint">optional · replaces the location's summary on the story card</span></label>
            <textarea :id="`ov-blurb-${id}`" rows="3" :value="ov(id).blurb || ''" @input="setOv(id, 'blurb', $event.target.value)" :placeholder="(byId[id]?.summary || '').slice(0, 90)"></textarea>
          </div>
        </div>
        <p v-if="!form.stopIds.length" class="muted" style="font-size:13px;">No stops yet – add published locations below.</p>

        <label for="tour-addstop">Add stop</label>
        <select id="tour-addstop" @change="addStop($event)">
          <option value="">Search published locations…</option>
          <option v-for="l in addable" :key="l.id" :value="l.id">{{ l.title }}</option>
        </select>

        <div style="display:flex; gap:12px; margin-top:22px; align-items:center; flex-wrap:wrap;">
          <div class="seg-toggle" role="group" aria-label="Visibility">
            <button type="button" :class="{ on: form.status === 'published' }" @click="form.status = 'published'">Published</button>
            <button type="button" :class="{ on: form.status !== 'published' }" @click="form.status = 'draft'">Draft</button>
          </div>
          <button class="btn btn-primary" @click="save()" :disabled="saving">{{ saving ? 'Saving…' : 'Save' }}</button>
          <span v-if="flash" role="status" style="font-size:13px; font-weight:600; color:var(--green);">{{ flash }}</span>
          <button class="btn btn-ghost btn-sm" style="margin-left:auto;" @click="back">← Back to list</button>
        </div>
      </div>

      <div class="card" style="padding:18px;">
        <span class="field-label" style="margin-top:0;">Route preview</span>
        <PlaceMap route-only :route-points="routePoints" :route-geometry="form.routeGeometry || []" :key="routeKey" />
        <p class="muted" style="font-size:13px; margin-top:10px;">Stops: {{ form.stopIds.length }} · auto duration ≈ {{ autoMins }} min</p>

        <div style="margin-top:12px; padding-top:14px; border-top:1px solid var(--line);">
          <button class="btn btn-ghost btn-sm" :disabled="routing || form.stopIds.length < 2" @click="recalcRoute">
            {{ routing ? 'Calculating…' : (form.routeGeometry ? '↻ Recalculate walking route' : '🗺 Calculate walking route') }}
          </button>
          <p v-if="routeMsg" style="font-size:12.5px; margin:8px 0 0; font-weight:600;" :style="{ color: routeErr ? 'var(--red)' : 'var(--green)' }">{{ routeMsg }}</p>
          <p v-else-if="form.routeGeometry" class="muted" style="font-size:12px; margin:8px 0 0;">Route follows roads &amp; paths ({{ form.routeGeometry.length }} points). Save to keep it.</p>
          <p v-else class="muted" style="font-size:12px; margin:8px 0 0;">Lines currently go straight between stops – calculate to snap them to roads and paths.</p>
        </div>
      </div>
    </div>

    <MediaPicker :open="picker.open" :current="picker.field ? form[picker.field] : ''" @select="onPickMedia" @close="picker.open = false" />
  </div>
</template>

<script setup>
import { reactive, ref, computed, onMounted, onUnmounted } from 'vue'
import { store } from '../store.js'
import { routeLength } from '../../lib/geo.js'
import { config } from '../../config.js'
import PlaceMap from '../components/PlaceMap.vue'
import MediaPicker from '../components/MediaPicker.vue'
import { readableInk } from '../../lib/tokens.js'

const cities = config.cities
const byId = computed(() => Object.fromEntries(store.locations.map((l) => [l.id, l])))
const existing = store.params.id ? store.tours.find((t) => t.id === store.params.id) : null
const isNew = !existing

const form = reactive(existing ? JSON.parse(JSON.stringify(existing)) : {
  id: 'tour-' + Math.random().toString(36).slice(2, 8), recordId: undefined,
  title: '', city: config.cities[0], theme: '', description: '', coverImageUrl: '',
  status: 'draft', stopIds: [], stopOverrides: {}, durationOverrideMins: null,
  coverPosition: '50% 50%', coverCredit: '', coverCreditUrl: '', coverAlt: '', showCoverCredit: true,
  eventStart: null, eventEnd: null, takedownAt: null, routeGeometry: null,
})
if (form.routeGeometry === undefined) form.routeGeometry = null // tours predating the route column

// ── unsaved-changes guard: warn before leaving (in-app nav + tab close/reload) ──
const baseline = ref(JSON.stringify(form))
const isDirty = () => JSON.stringify(form) !== baseline.value
function onBeforeUnload(e) { if (isDirty()) { e.preventDefault(); e.returnValue = '' } }
onMounted(() => { store.registerDirtyCheck(isDirty); window.addEventListener('beforeunload', onBeforeUnload) })
onUnmounted(() => { store.clearDirtyCheck(); window.removeEventListener('beforeunload', onBeforeUnload) })
if (!form.coverPosition) form.coverPosition = '50% 50%'
if (!form.stopOverrides) form.stopOverrides = {} // older tours predate this column
if (form.showCoverCredit === undefined) form.showCoverCredit = true // pre-credit-toggle tours

// per-stop title/blurb overrides (keyed by location slug); empties aren't stored
// ── event window (private stops inherit these dates) ──
const dateIn = (iso) => (iso ? new Date(iso).toLocaleDateString('en-CA') : '') // YYYY-MM-DD (local)
function setEventStart(v) { form.eventStart = v ? new Date(v + 'T00:00:00').toISOString() : null }
function setEventEnd(v) {
  form.eventEnd = v ? new Date(v + 'T23:59:59').toISOString() : null
  if (form.eventEnd && !form.takedownAt) { // default take-down to event end + 7 days
    const d = new Date(v + 'T23:59:59'); d.setDate(d.getDate() + 7); form.takedownAt = d.toISOString()
  }
}
function setTakedown(v) { form.takedownAt = v ? new Date(v + 'T23:59:59').toISOString() : null }
// keep the event window collapsed unless this tour already uses one
const showEventWindow = ref(!!(form.eventStart || form.eventEnd || form.takedownAt))

const overrideOpen = reactive({})
function ov(id) { return form.stopOverrides[id] || {} }
function setOv(id, field, value) {
  const o = { ...(form.stopOverrides[id] || {}), [field]: value }
  if (!o.title && !o.blurb) delete form.stopOverrides[id]
  else form.stopOverrides[id] = o
}

// a stored route is only valid for the current stop order; changing stops clears
// it so the "straight lines" fallback shows until it's recalculated.
function invalidateRoute() { if (form.routeGeometry) { form.routeGeometry = null; routeMsg.value = 'Stops changed – recalculate the walking route.'; routeErr.value = false } }

const dragIdx = ref(null)
function drop(i) {
  if (dragIdx.value == null || dragIdx.value === i) return
  const arr = form.stopIds
  const [moved] = arr.splice(dragIdx.value, 1)
  arr.splice(i, 0, moved)
  dragIdx.value = null
  invalidateRoute()
}
function removeStop(i) { const id = form.stopIds[i]; form.stopIds.splice(i, 1); delete form.stopOverrides[id]; invalidateRoute() }
// keyboard-accessible reorder (alternative to drag): move a stop up/down one place
function moveStop(i, dir) {
  const j = i + dir
  if (j < 0 || j >= form.stopIds.length) return
  const arr = form.stopIds
  ;[arr[i], arr[j]] = [arr[j], arr[i]]
  invalidateRoute()
}
function addStop(e) {
  const id = e.target.value
  if (id && !form.stopIds.includes(id)) { form.stopIds.push(id); invalidateRoute() }
  e.target.value = ''
}

// ── road-following route via the compute-route Edge Function (OpenRouteService) ──
const routing = ref(false)
const routeMsg = ref('')
const routeErr = ref(false)
async function recalcRoute() {
  const coords = form.stopIds
    .map((id) => byId.value[id])
    .filter((l) => l && l.lat != null && l.lng != null)
    .map((l) => [l.lng, l.lat]) // OpenRouteService order
  if (coords.length < 2) { routeErr.value = true; routeMsg.value = 'Add at least two stops that have a map pin.'; return }
  routing.value = true; routeMsg.value = ''; routeErr.value = false
  try {
    form.routeGeometry = await store.computeRoute(coords)
    routeMsg.value = `Walking route calculated (${form.routeGeometry.length} points) – Save to apply.`
  } catch (e) {
    routeErr.value = true
    routeMsg.value = 'Route failed: ' + e.message
  } finally { routing.value = false }
}

const addable = computed(() =>
  store.locations.filter((l) => l.status === 'published' && l.city === form.city && !form.stopIds.includes(l.id))
)
const routePoints = computed(() =>
  form.stopIds.map((id, i) => { const l = byId.value[id]; return l ? { lat: l.lat, lng: l.lng, hue: l.hue, num: i + 1 } : null }).filter(Boolean)
)
const routeKey = computed(() => form.stopIds.join('|'))
const autoMins = computed(() => {
  const stops = form.stopIds.map((id) => byId.value[id]).filter(Boolean)
  return stops.length * 12 + Math.round(routeLength(stops) / 80)
})

// focal point picker (click the cover preview to set what stays in view when cropped)
function focalBox(url, pos) {
  return {
    marginTop: '8px', height: '120px', borderRadius: '10px', border: '1px solid var(--line)',
    backgroundImage: `url(${url})`, backgroundSize: 'cover', backgroundPosition: pos || '50% 50%',
    backgroundRepeat: 'no-repeat', position: 'relative', cursor: 'crosshair',
  }
}
function focalDot(pos) {
  const [x, y] = (pos || '50% 50%').split(' ')
  return {
    position: 'absolute', left: x, top: y, transform: 'translate(-50%,-50%)',
    width: '16px', height: '16px', borderRadius: '50%', background: 'rgba(107,70,229,0.9)',
    border: '2px solid #fff', boxShadow: '0 0 0 2px rgba(0,0,0,0.35)', pointerEvents: 'none',
  }
}
function setFocal(e, field) {
  const r = e.currentTarget.getBoundingClientRect()
  const x = Math.round(Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100)))
  const y = Math.round(Math.max(0, Math.min(100, ((e.clientY - r.top) / r.height) * 100)))
  form[field] = `${x}% ${y}%`
}
// keyboard alternative to the click picker: arrow keys nudge the focal point 5%
function nudgeFocal(e, field) {
  const step = { ArrowLeft: [-5, 0], ArrowRight: [5, 0], ArrowUp: [0, -5], ArrowDown: [0, 5] }[e.key]
  if (!step) return
  e.preventDefault()
  const [cx, cy] = (form[field] || '50% 50%').split(' ').map((v) => parseInt(v, 10) || 0)
  const x = Math.max(0, Math.min(100, cx + step[0]))
  const y = Math.max(0, Math.min(100, cy + step[1]))
  form[field] = `${x}% ${y}%`
}

const uploadingCover = ref(false)
const coverUploads = []
const coverUndo = ref(undefined)   // previous value before the last replace
function undoCover() { if (coverUndo.value !== undefined) { form.coverImageUrl = coverUndo.value; coverUndo.value = undefined } }

// choose an existing cover photo from the media library (reuse across tours)
const picker = reactive({ open: false, field: null })
function openPicker(field) { picker.field = field; picker.open = true }
function onPickMedia(url) { if (picker.field) form[picker.field] = url }
async function uploadCover(e) {
  const file = e.target.files[0]
  if (!file) return
  uploadingCover.value = true
  const prev = form.coverImageUrl
  try {
    const url = await store.upload(file, 'image')
    coverUndo.value = prev
    coverUploads.push(url)
    form.coverImageUrl = url
  } catch (err) { alert('Upload failed: ' + err.message) }
  finally { uploadingCover.value = false; e.target.value = '' }
}

const saving = ref(false)
const flash = ref('')
let flashTimer
async function save() {
  if (!form.title) { alert('Title is required.'); return }
  saving.value = true
  try {
    await store.saveTour({ ...form })
    // a newly created tour now exists – adopt its id so the next save updates it
    if (!form.recordId) {
      const saved = store.tours.find((t) => t.id === form.id)
      if (saved) form.recordId = saved.recordId
    }
    // delete orphaned cover uploads from THIS edit only – never a pre-existing
    // library image, which may be reused by other tours.
    const keep = form.coverImageUrl
    for (const url of coverUploads) {
      if (url !== keep) await store.removeMedia(url).catch(() => {})
    }
    baseline.value = JSON.stringify(form) // saved → no longer "dirty"
    flash.value = form.status === 'published' ? 'Saved · Published ✓' : 'Saved · Draft ✓'
    clearTimeout(flashTimer)
    flashTimer = setTimeout(() => { flash.value = '' }, 4000)
  } catch (e) {
    alert('Save failed: ' + e.message)
  } finally {
    saving.value = false
  }
}
function back() { store.go('tours') }
</script>

<style scoped>
/* compact cover field: upload / library actions sit as icons inside the field */
.media-input { position: relative; }
.media-input > input { padding-right: 78px; }
.media-actions { position: absolute; right: 5px; top: 50%; transform: translateY(-50%); display: flex; gap: 2px; }
.icon-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 32px; height: 32px; padding: 0; margin: 0; border: none; border-radius: 8px;
  background: none; color: var(--muted); cursor: pointer;
}
.icon-btn:hover { background: var(--bg); color: var(--ink); }
.icon-btn:focus-visible { outline: 2px solid var(--violet); outline-offset: 1px; }
.icon-btn.busy { opacity: 0.5; cursor: default; }
.icon-btn .ic { width: 18px; height: 18px; display: block; }
</style>
