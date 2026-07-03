<!-- Reusable "choose an existing photo from the media library" modal. Lets a
     content editor reuse a photo already in the bucket across many locations
     without re-uploading it. Emits the chosen file's public URL. -->
<template>
  <!-- eslint-disable-next-line vuejs-accessibility/no-static-element-interactions, vuejs-accessibility/click-events-have-key-events -- backdrop click-to-dismiss is a pointer convenience; Esc and the Close button are the keyboard paths -->
  <div v-if="open" class="mp-overlay" role="dialog" aria-modal="true" aria-label="Choose a photo from the library" @click.self="$emit('close')">
    <div class="mp-panel">
      <div class="mp-head">
        <h3 class="mp-title">Choose a photo</h3>
        <input ref="searchEl" type="search" v-model="q" class="mp-search" placeholder="Search by name…" aria-label="Search photos by name" />
        <button type="button" class="btn btn-ghost btn-sm" aria-label="Close" @click="$emit('close')">✕ Close</button>
      </div>

      <div v-if="loading" class="mp-msg">Loading photos…</div>
      <div v-else-if="!images.length && !q" class="mp-msg">No photos in the library yet – upload one first.</div>
      <div v-else-if="!images.length" class="mp-msg">No photos match “{{ q }}”.</div>
      <div v-else class="mp-grid">
        <button v-for="m in images" :key="m.path" type="button" class="mp-item" :class="{ sel: m.url === current }" :title="m.filename" @click="pick(m)">
          <img :src="m.url" :alt="m.filename" loading="lazy" />
          <span class="mp-name">{{ m.filename }}</span>
        </button>
      </div>

      <div class="mp-foot">
        <span class="muted" style="font-size:12.5px;">{{ images.length }} photo{{ images.length === 1 ? '' : 's' }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { store } from '../store.js'

const props = defineProps({
  open: Boolean,
  current: { type: String, default: '' }, // the field's current URL, to highlight it
})
const emit = defineEmits(['select', 'close'])

const q = ref('')
const loading = ref(false)
const searchEl = ref(null)

async function ensureLoaded() {
  // Always refresh so photos uploaded earlier this session appear, but only show
  // the full-panel loading state on the first (empty) open – later opens refresh
  // quietly under the existing grid.
  if (!store.media.length) loading.value = true
  try { await store.loadMedia() } catch { /* leaves the empty-state message */ }
  finally { loading.value = false }
}

// Load + focus the search box whenever the picker is opened.
watch(() => props.open, async (isOpen) => {
  if (!isOpen) return
  q.value = ''
  await ensureLoaded()
  await nextTick()
  searchEl.value?.focus()
})

const images = computed(() => {
  const list = store.media.filter((m) => m.type === 'image')
  const term = q.value.trim().toLowerCase()
  return term ? list.filter((m) => (m.filename || '').toLowerCase().includes(term)) : list
})

function pick(m) { emit('select', m.url); emit('close') }

// Esc closes the modal.
function onKey(e) { if (e.key === 'Escape' && props.open) emit('close') }
onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<style scoped>
.mp-overlay { position: fixed; inset: 0; background: rgba(27, 21, 48, 0.55); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 24px; }
.mp-panel { background: var(--card); color: var(--ink); border: 1px solid var(--line); border-radius: 16px; width: min(880px, 100%); max-height: 86vh; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 24px 70px rgba(27, 21, 48, 0.35); }
.mp-head { display: flex; align-items: center; gap: 12px; padding: 15px 18px; border-bottom: 1px solid var(--line); }
.mp-title { margin: 0; font-size: 16px; white-space: nowrap; }
.mp-search { flex: 1; width: auto; }
.mp-msg { padding: 56px 24px; text-align: center; color: var(--muted); }
.mp-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(132px, 1fr)); gap: 12px; padding: 18px; overflow-y: auto; }
.mp-item { border: 1px solid var(--line); border-radius: 10px; overflow: hidden; background: #fff; cursor: pointer; padding: 0; display: flex; flex-direction: column; text-align: left; transition: border-color .12s ease, transform .12s ease, box-shadow .12s ease; }
.mp-item:hover, .mp-item:focus-visible { border-color: var(--violet); transform: translateY(-2px); box-shadow: 0 6px 18px rgba(107, 70, 229, 0.18); outline: none; }
.mp-item.sel { border-color: var(--violet); box-shadow: 0 0 0 2px var(--violet); }
.mp-item img { width: 100%; height: 104px; object-fit: cover; display: block; background: var(--bg); }
.mp-name { font-size: 11px; padding: 6px 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--ink); }
.mp-foot { padding: 10px 18px; border-top: 1px solid var(--line); }
</style>
