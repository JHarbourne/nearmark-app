<!-- Announcement editor — a deliberately simple event form (see docs/announcements-spec.md).
     Much lighter than the story editor: title, date(s), place, description, one image, an
     optional link, and an optional linked walk. -->
<template>
  <div>
    <div class="pagehead">
      <h1>{{ isNew ? 'New announcement' : 'Edit announcement' }}</h1>
      <button class="btn btn-ghost" @click="back">← Back to list</button>
    </div>

    <div class="card" style="padding:22px; max-width:640px;">
      <label for="ann-title">Title</label>
      <input id="ann-title" type="text" v-model="form.title" placeholder="Christmas Faire" />

      <div class="field-row">
        <div>
          <label for="ann-start">Starts <span class="hint">date &amp; time</span></label>
          <input id="ann-start" type="datetime-local" v-model="startLocal" />
        </div>
        <div>
          <label for="ann-end">Ends <span class="hint">date &amp; time · it disappears then</span></label>
          <input id="ann-end" type="datetime-local" v-model="endLocal" />
        </div>
      </div>

      <label for="ann-place">Place <span class="hint">e.g. Parish Rooms, Sailing Club</span></label>
      <input id="ann-place" type="text" v-model="form.place" placeholder="Parish Rooms" />

      <label for="ann-desc">Description <span class="hint">Markdown: <code>**bold**</code>, <code>*italic*</code>, <code>-</code> bullets</span></label>
      <textarea id="ann-desc" v-model="form.description" rows="5"></textarea>

      <label for="ann-img">Image <span class="hint">optional</span></label>
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
        <img :src="form.imageUrl" alt="" style="margin-top:8px; width:100%; max-height:180px; object-fit:cover; border-radius:10px; border:1px solid var(--line);" />
        <label for="ann-alt">Alt text <span class="hint">describe the image for screen readers</span></label>
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
      <p class="hint" style="margin-top:10px;">It disappears from the app's list the moment it ends. Leave the dates blank for an evergreen notice that stays until you unpublish it.</p>
    </div>

    <MediaPicker :open="picker.open" :current="form.imageUrl" @select="onPickImage" @close="picker.open = false" />
  </div>
</template>

<script setup>
import { reactive, ref, computed, onMounted, onUnmounted } from 'vue'
import { store } from '../store.js'
import MediaPicker from '../components/MediaPicker.vue'

const existing = store.params.id ? store.announcements.find((a) => a.id === store.params.id) : null
const isNew = !existing
const canManage = computed(() => store.role !== 'editor') // SA, or no RBAC on this project

const blank = {
  id: 'ann-' + Math.random().toString(36).slice(2, 8), recordId: undefined,
  title: '', eventStart: '', eventEnd: '', place: '', description: '',
  imageUrl: '', imageAlt: '', linkUrl: '', linkLabel: '', tourSlug: '',
  status: 'draft', sortOrder: 0,
}
const form = reactive(existing ? JSON.parse(JSON.stringify(existing)) : { ...blank })
// normalise nulls to '' so the date/text inputs bind cleanly
for (const k of ['eventStart', 'eventEnd', 'place', 'description', 'imageUrl', 'imageAlt', 'linkUrl', 'linkLabel', 'tourSlug']) {
  if (form[k] == null) form[k] = ''
}

// event_start/end are stored as ISO timestamps; the <input type="datetime-local">
// works in local time, so convert between the two.
function toLocalInput(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
const fromLocalInput = (v) => (v ? new Date(v).toISOString() : '')
const startLocal = computed({ get: () => toLocalInput(form.eventStart), set: (v) => { form.eventStart = fromLocalInput(v) } })
const endLocal = computed({ get: () => toLocalInput(form.eventEnd), set: (v) => { form.eventEnd = fromLocalInput(v) } })

// ── unsaved-changes guard (mirrors the other editors) ──
const baseline = ref(JSON.stringify(form))
const isDirty = () => JSON.stringify(form) !== baseline.value
function onBeforeUnload(e) { if (isDirty()) { e.preventDefault(); e.returnValue = '' } }
onMounted(() => { store.registerDirtyCheck(isDirty, save); window.addEventListener('beforeunload', onBeforeUnload) })
onUnmounted(() => { store.clearDirtyCheck(); window.removeEventListener('beforeunload', onBeforeUnload) })

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
function back() { store.go('announcements') }
</script>
