<!-- A7 Media library (BRD §11.7): every file in the 'media' bucket, with editable
     name, photographer/credit, licence and caption, plus where each is used. -->
<template>
  <div>
    <div class="pagehead">
      <h1>Media library</h1>
      <label class="btn btn-primary" style="cursor:pointer;">
        {{ uploadingFile ? 'Uploading…' : '+ Upload asset' }}
        <input type="file" accept="image/*,audio/*,video/*" style="display:none;" @change="upload" />
      </label>
    </div>

    <p class="muted" style="font-size:12.5px; margin:-6px 0 14px;">Images are optimised automatically on upload (resized &amp; compressed). For a quick upload, use a web-sized landscape JPG (around 1400&nbsp;px wide, or smaller), not a full-resolution phone photo.</p>

    <div class="toolbar">
      <input type="text" v-model="q" placeholder="Search name / credit…" aria-label="Search media by name or credit" style="max-width:240px;" />
      <select v-model="typeFilter" aria-label="Filter by media type" style="max-width:150px;">
        <option value="">All types</option><option value="image">Images</option><option value="audio">Audio</option><option value="video">Video</option>
      </select>
      <span class="muted" style="font-size:13px;">{{ filtered.length }} of {{ store.media.length }}</span>
    </div>

    <p v-if="loading" class="muted">Loading media…</p>
    <p v-else-if="!store.media.length" class="muted">No files uploaded yet. Use “Upload asset”, or add images in a Location/Tour editor.</p>

    <div v-for="(m, i) in filtered" :key="m.url" class="card" style="display:flex; gap:16px; padding:14px; margin-bottom:12px;">
      <div :style="thumb(m)"><span v-if="m.type !== 'image'" style="text-transform:uppercase;">{{ m.type }}</span></div>
      <div style="flex:1; min-width:0;">
        <div class="field-row" style="margin-top:0;">
          <div>
            <label :for="`media-name-${i}`" style="margin-top:0;">Name</label>
            <input :id="`media-name-${i}`" type="text" v-model="m.filename" />
          </div>
          <div>
            <label :for="`media-credit-${i}`" style="margin-top:0;">Photographer / credit</label>
            <input :id="`media-credit-${i}`" type="text" v-model="m.photographer" placeholder="e.g. Marcel Heil" />
          </div>
        </div>
        <div class="field-row">
          <div>
            <label :for="`media-licence-${i}`">Licence</label>
            <input :id="`media-licence-${i}`" type="text" v-model="m.license" placeholder="e.g. Unsplash · CC BY 4.0 · © own" />
          </div>
          <div>
            <label :for="`media-caption-${i}`">Caption</label>
            <input :id="`media-caption-${i}`" type="text" v-model="m.caption" placeholder="Short description" />
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:12px; margin-top:12px; flex-wrap:wrap;">
          <button class="btn btn-primary btn-sm" @click="save(m)">Save</button>
          <label class="btn btn-ghost btn-sm" style="cursor:pointer;">
            {{ replacing === m.url ? 'Replacing…' : 'Replace' }}
            <input type="file" :accept="acceptFor(m)" style="display:none;" @change="doReplace(m, $event)" />
          </label>
          <button class="btn btn-ghost btn-sm" @click="copy(m)">{{ copied === m.url ? 'Copied ✓' : 'Copy URL' }}</button>
          <button class="btn btn-danger btn-sm" @click="remove(m)">Delete</button>
          <span class="muted" style="font-size:12px;">{{ m.type }} · {{ sizeLabel(m) }} · Used by: {{ usedBy(m) }}</span>
          <a :href="m.url" target="_blank" rel="noopener" class="muted" style="font-size:12px; margin-left:auto;">Open<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:-1px; margin-left:4px;"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg></a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { store } from '../store.js'

const typeFilter = ref('')
const q = ref('')
const loading = ref(true)
const uploadingFile = ref(false)
const replacing = ref('')
const busted = ref({})   // path -> timestamp, to refresh the preview after a replace
const copied = ref('')

async function copy(m) {
  try {
    await navigator.clipboard.writeText(m.url)
    copied.value = m.url
    setTimeout(() => { if (copied.value === m.url) copied.value = '' }, 1500)
  } catch {
    window.prompt('Copy this URL:', m.url)
  }
}

onMounted(async () => {
  try { await store.loadMedia() } catch (e) { alert('Could not load media: ' + e.message) } finally { loading.value = false }
})

const filtered = computed(() => store.media.filter((m) => {
  if (typeFilter.value && m.type !== typeFilter.value) return false
  if (q.value) {
    const hay = `${m.filename} ${m.photographer} ${m.license} ${m.caption}`.toLowerCase()
    if (!hay.includes(q.value.toLowerCase())) return false
  }
  return true
}))

async function upload(e) {
  const f = e.target.files[0]
  if (!f) return
  const type = f.type.startsWith('image') ? 'image' : f.type.startsWith('audio') ? 'audio' : 'video'
  uploadingFile.value = true
  try {
    await store.upload(f, type)
    store.logActivity('Uploaded media', f.name)
    await store.loadMedia()
  } catch (err) {
    alert('Upload failed: ' + err.message)
  } finally {
    uploadingFile.value = false
    e.target.value = ''
  }
}

function acceptFor(m) {
  return m.type === 'audio' ? 'audio/*' : m.type === 'video' ? 'video/*' : 'image/*'
}
async function doReplace(m, e) {
  const f = e.target.files[0]
  if (!f) return
  const used = usedBy(m)
  const where = used !== '–' ? `\n\nIt will update everywhere it's used: ${used}.` : ''
  if (!confirm(`Replace “${m.filename}” with this new file?${where}`)) { e.target.value = ''; return }
  replacing.value = m.url
  try {
    await store.replaceMedia(m, f)
    busted.value = { ...busted.value, [m.path]: Date.now() } // force the preview to refetch
    await store.loadMedia()
  } catch (err) {
    alert('Replace failed: ' + err.message)
  } finally {
    replacing.value = ''
    e.target.value = ''
  }
}

async function save(m) {
  try { await store.saveMediaMeta(m) } catch (e) { alert('Save failed: ' + e.message) }
}
async function remove(m) {
  const used = usedBy(m)
  const warn = used !== '–' ? `\n\n⚠️ This file is currently used by: ${used}. Deleting it will break those images.` : ''
  if (!confirm(`Delete “${m.filename}”? This removes the file permanently.${warn}`)) return
  try { await store.deleteMediaAsset(m) } catch (e) { alert('Delete failed: ' + e.message) }
}

function usedBy(m) {
  const locs = store.locations.filter((l) => [l.heroImageUrl, l.historicImageUrl, l.audioUrl, l.videoUrl].includes(m.url)).map((l) => l.title)
  const tours = store.tours.filter((t) => t.coverImageUrl === m.url).map((t) => t.title)
  const all = [...locs, ...tours]
  return all.length ? all.join(', ') : '–'
}
function sizeLabel(m) {
  if (!m.sizeBytes) return '–'
  return m.sizeBytes < 1024 * 1024 ? `${Math.round(m.sizeBytes / 1024)} KB` : `${(m.sizeBytes / 1024 / 1024).toFixed(1)} MB`
}
function thumb(m) {
  const bust = busted.value[m.path] ? `?t=${busted.value[m.path]}` : ''
  return {
    width: '90px', height: '90px', flexShrink: 0, borderRadius: '10px', border: '1px solid var(--line)',
    background: m.type === 'image' ? `center/cover no-repeat url(${m.url}${bust})` : 'linear-gradient(135deg,#efeafd,#e7e3ef)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b46e5', fontWeight: 700, fontSize: '11px',
  }
}
</script>
