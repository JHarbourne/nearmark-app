<!-- A3 Locations list (BRD §11.3): grouped by tour (collapsible), with search,
     filters and row actions. A location shared across tours shows under each. -->
<template>
  <div>
    <div class="pagehead">
      <h1>Locations</h1>
      <button class="btn btn-primary" @click="store.go('locationEditor', { id: null })">+ Add new location</button>
    </div>

    <div class="toolbar">
      <input type="text" v-model="q" placeholder="Search by title…" aria-label="Search locations by title" style="max-width:260px;" />
      <select v-model="cityFilter" aria-label="Filter by city" style="max-width:160px;">
        <option value="">All cities</option>
        <option v-for="c in cities" :key="c" :value="c">{{ c }}</option>
      </select>
      <select v-model="statusFilter" aria-label="Filter by status" style="max-width:160px;">
        <option value="">All statuses</option>
        <option value="published">Published</option>
        <option value="draft">Draft</option>
      </select>
      <select v-model="groupBy" aria-label="Group locations" style="max-width:160px;">
        <option value="tour">Group by tour</option>
        <option value="none">Flat list</option>
      </select>
    </div>

    <div class="card">
      <table>
        <thead>
          <tr style="white-space:nowrap;"><th>Photo</th><th>Title</th><th>City</th><th>Period</th><th>Status</th><th class="right">Actions</th></tr>
        </thead>
        <tbody v-for="g in groups" :key="g.key">
          <tr v-if="g.title" class="group-head">
            <th colspan="6" style="text-align:left; background:var(--bg2, rgba(0,0,0,0.03)); padding:0;">
              <button type="button" @click="toggle(g.key)" :aria-expanded="String(!collapsed[g.key])"
                style="width:100%; text-align:left; background:none; border:none; cursor:pointer; padding:10px 14px; font-size:14px; font-weight:700; color:inherit; display:flex; align-items:center; gap:8px;">
                <span style="width:12px;">{{ collapsed[g.key] ? '▸' : '▾' }}</span>
                {{ g.title }}
                <span class="muted" style="font-weight:400;">· {{ g.locations.length }}</span>
              </button>
            </th>
          </tr>
          <template v-if="!collapsed[g.key]">
            <!-- eslint-disable-next-line vuejs-accessibility/no-static-element-interactions, vuejs-accessibility/click-events-have-key-events -- whole-row click is a pointer shortcut; the Edit button is the keyboard / assistive-tech path -->
            <tr v-for="l in g.locations" :key="g.key + '|' + l.id" class="row-clickable" @click="store.go('locationEditor', { id: l.id })">
              <td style="width:56px;" data-label="Photo">
                <img v-if="l.heroImageUrl" :src="l.heroImageUrl" alt="" loading="lazy" style="width:48px; height:34px; object-fit:cover; border-radius:5px; display:block; background:var(--bg);" />
                <span v-else title="No photo yet" style="display:block; width:48px; height:34px; border-radius:5px; background:var(--bg); border:1px dashed var(--line);"></span>
              </td>
              <td style="font-weight:600;" data-label="Title">
                <span class="swatch" :style="{ background: l.hue, display:'inline-block', width:'14px', height:'14px', verticalAlign:'middle', marginRight:'8px' }"></span>
                {{ l.title }}
                <span v-if="l.guidedTourOnly" class="badge" style="margin-left:8px; font-weight:600; font-size:10px; letter-spacing:.3px; background:#efe9fb; color:#5b3ea8;" title="Guided tour only – hidden from Discover mode, shown only inside a guided tour">🔒 Tour only</span>
              </td>
              <td data-label="City">{{ l.city }}</td>
              <td class="muted" data-label="Period">{{ l.period }}</td>
              <td data-label="Status"><span class="badge" :class="l.status">{{ l.status }}</span></td>
              <td class="right" style="white-space:nowrap;" data-label="Actions">
                <button class="btn btn-ghost btn-sm" @click.stop="store.go('locationEditor', { id: l.id })">Edit</button>
                <button class="btn btn-ghost btn-sm" @click.stop="preview(l)" title="Open this story in the app in a new tab">Preview</button>
                <button class="btn btn-ghost btn-sm" @click.stop="duplicate(l)">Duplicate</button>
                <button class="btn btn-danger btn-sm" @click.stop="remove(l)" aria-label="Delete location" title="Delete">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:middle;"><path d="M3 6h18" /><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /></svg>
                </button>
              </td>
            </tr>
          </template>
        </tbody>
        <tbody v-if="!totalShown">
          <tr><td colspan="6" class="muted" style="text-align:center; padding:30px;">No locations match.</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { store } from '../store.js'
import { config } from '../../config.js'

// Open the story in the public app (new tab). Same origin as the admin, so it
// works even if VITE_PUBLIC_URL isn't set; drafts show when you're signed in.
function preview(l) {
  const base = config.publicUrl || window.location.origin
  window.open(`${base}/?story=${encodeURIComponent(l.id)}`, '_blank', 'noopener')
}

const q = ref('')
const cityFilter = ref('')
const statusFilter = ref('')
const groupBy = ref('tour') // 'tour' | 'none'
const collapsed = reactive({})
function toggle(k) { collapsed[k] = !collapsed[k] }

const cities = computed(() => [...new Set(store.locations.map((l) => l.city))])
const byId = computed(() => Object.fromEntries(store.locations.map((l) => [l.id, l])))

function passes(l) {
  if (q.value && !l.title.toLowerCase().includes(q.value.toLowerCase())) return false
  if (cityFilter.value && l.city !== cityFilter.value) return false
  if (statusFilter.value && l.status !== statusFilter.value) return false
  return true
}
const filtered = computed(() => store.locations.filter(passes))

// One group per tour (stops in tour order, filtered), then a "Not in a tour"
// group; or a single un-headed group when grouping is off.
const groups = computed(() => {
  if (groupBy.value !== 'tour') return [{ key: 'all', title: null, locations: filtered.value }]
  const inAnyTour = new Set(store.tours.flatMap((t) => t.stopIds))
  const result = store.tours
    .map((t) => ({ key: t.id, title: t.title, locations: t.stopIds.map((id) => byId.value[id]).filter(Boolean).filter(passes) }))
    .filter((g) => g.locations.length)
  const ungrouped = filtered.value.filter((l) => !inAnyTour.has(l.id))
  if (ungrouped.length) result.push({ key: '__none', title: 'Not in a tour', locations: ungrouped })
  return result
})
const totalShown = computed(() => groups.value.reduce((n, g) => n + g.locations.length, 0))

async function duplicate(l) {
  const newId = l.id + '-copy-' + Math.random().toString(36).slice(2, 6)
  const copy = { ...l, recordId: undefined, id: newId, title: l.title + ' (copy)', tourNum: null, status: 'draft' }
  try {
    await store.saveLocation(copy)
    const saved = store.locations.find((x) => x.id === newId)
    // copy the stories too (content lives on stories now) so the duplicate is a
    // real starting point, not an empty shell — each becomes a new story.
    for (const s of l.stories || []) {
      await store.saveStory({ ...JSON.parse(JSON.stringify(s)), storyId: undefined, locationId: saved?.recordId })
    }
    store.go('locationEditor', { id: newId }) // open the copy so it's obvious it worked
  } catch (e) {
    alert('Duplicate failed: ' + (e?.message || e))
  }
}
async function remove(l) {
  if (confirm(`Delete “${l.title}”? This cannot be undone.`)) await store.deleteLocation(l)
}
</script>
