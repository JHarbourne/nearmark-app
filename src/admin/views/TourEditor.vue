<!-- A6 Tour editor (BRD §11.6): metadata + drag-to-reorder stops + live route map. -->
<template>
  <div>
    <div class="pagehead">
      <h1>{{ isNew ? 'New tour' : 'Edit tour' }}</h1>
      <button class="btn btn-ghost" @click="back">← Back to list</button>
    </div>

    <div class="editor-cols" style="display:grid; grid-template-columns: 1fr 1fr; gap:24px; align-items:start;">
      <div class="card" style="padding:22px;">
        <label for="tour-title">Title</label>
        <input id="tour-title" type="text" v-model="form.title" />

        <div class="field-row">
          <div>
            <label for="tour-city">City</label>
            <select id="tour-city" v-model="form.city"><option v-for="c in cities" :key="c" :value="c">{{ c }}</option></select>
          </div>
          <div>
            <label for="tour-status">Status</label>
            <select id="tour-status" v-model="form.status"><option value="draft">Draft</option><option value="published">Published</option></select>
          </div>
        </div>

        <label for="tour-theme">Theme <span class="hint">short descriptor</span></label>
        <input id="tour-theme" type="text" v-model="form.theme" placeholder="Resistance & resilience 1890–1999" />

        <label for="tour-description">Description</label>
        <textarea id="tour-description" v-model="form.description" rows="3"></textarea>

        <label for="tour-cover-url">Cover image <span class="hint">shown on the tour list</span></label>
        <input id="tour-cover-url" type="url" v-model="form.coverImageUrl" placeholder="https://… or upload ↓" />
        <label class="btn btn-ghost btn-sm" style="margin-top:6px; display:inline-block; cursor:pointer;">
          {{ uploadingCover ? 'Uploading…' : '⬆ Upload cover image' }}
          <input type="file" accept="image/*" style="display:none" @change="uploadCover" />
        </label>
        <button v-if="coverUndo !== undefined" type="button" class="btn btn-ghost btn-sm" style="margin:6px 0 0 6px;" @click="undoCover">↩ Undo</button>
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

        <label for="tour-duration">Estimated duration <span class="hint">mins · blank = auto</span></label>
        <input id="tour-duration" type="number" v-model.number="form.durationOverrideMins" :placeholder="`auto: ${autoMins} min`" min="0" />

        <hr style="border:none; border-top:1px solid var(--line); margin:22px 0;" />

        <span class="field-label" style="margin-top:0;">Stops <span class="hint">drag, or use the ▲ ▼ buttons, to reorder</span></span>
        <!-- eslint-disable-next-line vuejs-accessibility/no-static-element-interactions -- drag is a pointer enhancement; the ▲/▼ buttons below provide the keyboard-accessible reorder (WCAG 2.5.7) -->
        <div
          v-for="(id, i) in form.stopIds" :key="id"
          class="drag-item" :class="{ dragging: dragIdx === i }"
          draggable="true"
          @dragstart="dragIdx = i"
          @dragover.prevent
          @drop="drop(i)"
          @dragend="dragIdx = null"
        >
          <span style="font-family:'Bricolage Grotesque'; font-weight:700; width:22px; height:22px; border-radius:6px; color:#fff; display:flex; align-items:center; justify-content:center; font-size:12px;" :style="{ background: byId[id]?.hue || '#ccc' }">{{ i + 1 }}</span>
          <span style="flex:1;">{{ byId[id]?.title || id }}</span>
          <button type="button" class="btn btn-ghost btn-sm" :disabled="i === 0" @click="moveStop(i, -1)" :aria-label="`Move ${byId[id]?.title || id} up`">▲</button>
          <button type="button" class="btn btn-ghost btn-sm" :disabled="i === form.stopIds.length - 1" @click="moveStop(i, 1)" :aria-label="`Move ${byId[id]?.title || id} down`">▼</button>
          <button type="button" class="btn btn-ghost btn-sm" @click="removeStop(i)" :aria-label="`Remove ${byId[id]?.title || id}`">Remove</button>
        </div>
        <p v-if="!form.stopIds.length" class="muted" style="font-size:13px;">No stops yet – add published locations below.</p>

        <label for="tour-addstop">Add stop</label>
        <select id="tour-addstop" @change="addStop($event)">
          <option value="">Search published locations…</option>
          <option v-for="l in addable" :key="l.id" :value="l.id">{{ l.title }}</option>
        </select>

        <div style="display:flex; gap:12px; margin-top:22px; align-items:center; flex-wrap:wrap;">
          <button class="btn btn-ghost" @click="save('draft')" :disabled="saving">Save draft</button>
          <button class="btn btn-primary" @click="save('published')" :disabled="saving">{{ saving ? 'Saving…' : 'Publish' }}</button>
          <span v-if="flash" role="status" style="font-size:13px; font-weight:600; color:var(--green);">{{ flash }}</span>
          <button class="btn btn-ghost btn-sm" style="margin-left:auto;" @click="back">← Back to list</button>
        </div>
      </div>

      <div class="card" style="padding:18px;">
        <span class="field-label" style="margin-top:0;">Route preview</span>
        <PlaceMap route-only :route-points="routePoints" :key="routeKey" />
        <p class="muted" style="font-size:13px; margin-top:10px;">Stops: {{ form.stopIds.length }} · auto duration ≈ {{ autoMins }} min</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, computed } from 'vue'
import { store } from '../store.js'
import { routeLength } from '../../lib/geo.js'
import { config } from '../../config.js'
import PlaceMap from '../components/PlaceMap.vue'

const cities = config.cities
const byId = computed(() => Object.fromEntries(store.locations.map((l) => [l.id, l])))
const existing = store.params.id ? store.tours.find((t) => t.id === store.params.id) : null
const isNew = !existing

const form = reactive(existing ? JSON.parse(JSON.stringify(existing)) : {
  id: 'tour-' + Math.random().toString(36).slice(2, 8), recordId: undefined,
  title: '', city: config.cities[0], theme: '', description: '', coverImageUrl: '',
  status: 'draft', stopIds: [], durationOverrideMins: null,
  coverPosition: '50% 50%', coverCredit: '', coverCreditUrl: '', coverAlt: '',
})
if (!form.coverPosition) form.coverPosition = '50% 50%'

const dragIdx = ref(null)
function drop(i) {
  if (dragIdx.value == null || dragIdx.value === i) return
  const arr = form.stopIds
  const [moved] = arr.splice(dragIdx.value, 1)
  arr.splice(i, 0, moved)
  dragIdx.value = null
}
function removeStop(i) { form.stopIds.splice(i, 1) }
// keyboard-accessible reorder (alternative to drag): move a stop up/down one place
function moveStop(i, dir) {
  const j = i + dir
  if (j < 0 || j >= form.stopIds.length) return
  const arr = form.stopIds
  ;[arr[i], arr[j]] = [arr[j], arr[i]]
}
function addStop(e) {
  const id = e.target.value
  if (id && !form.stopIds.includes(id)) form.stopIds.push(id)
  e.target.value = ''
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
const originalCover = form.coverImageUrl || ''
const coverUploads = []
const coverUndo = ref(undefined)   // previous value before the last replace
function undoCover() { if (coverUndo.value !== undefined) { form.coverImageUrl = coverUndo.value; coverUndo.value = undefined } }
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
async function save(status) {
  if (!form.title) { alert('Title is required.'); return }
  form.status = status
  saving.value = true
  try {
    await store.saveTour({ ...form })
    // a newly created tour now exists – adopt its id so the next save updates it
    if (!form.recordId) {
      const saved = store.tours.find((t) => t.id === form.id)
      if (saved) form.recordId = saved.recordId
    }
    // delete orphaned cover uploads no longer used
    const keep = form.coverImageUrl
    for (const url of new Set([...coverUploads, originalCover].filter(Boolean))) {
      if (url !== keep) await store.removeMedia(url).catch(() => {})
    }
    flash.value = status === 'published' ? 'Published ✓' : 'Saved as draft ✓'
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
