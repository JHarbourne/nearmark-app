<!-- A5 Tours list (BRD §11.5). -->
<template>
  <div>
    <div class="pagehead">
      <h1>Tours</h1>
      <button class="btn btn-primary" @click="store.go('tourEditor', { id: null })">+ Add new tour</button>
    </div>

    <p class="muted" style="font-size:13px; margin:-6px 0 14px;">Drag the ⠿ handle to reorder – this sets the order tours appear in the app.</p>
    <div class="card">
      <table>
        <thead>
          <tr><th></th><th>Tour title</th><th>City</th><th>Stops</th><th>Distance</th><th>Duration</th><th>Status</th><th class="right">Actions</th></tr>
        </thead>
        <tbody>
          <!-- eslint-disable-next-line vuejs-accessibility/no-static-element-interactions, vuejs-accessibility/click-events-have-key-events -- whole-row click is a pointer shortcut; the Edit button is the keyboard / assistive-tech path -->
          <tr v-for="(t, i) in rows" :key="t.id" class="row-clickable"
            draggable="true"
            @click="store.go('tourEditor', { id: t.id })"
            @dragstart="dragIdx = i" @dragover.prevent @drop="drop(i)" @dragend="dragIdx = null"
            :style="{ opacity: dragIdx === i ? 0.4 : 1 }">
            <td style="color:var(--muted); cursor:grab; width:24px; text-align:center;" title="Drag to reorder" data-label="Order">⠿</td>
            <td style="font-weight:600;" data-label="Tour">{{ t.title }}</td>
            <td data-label="City">{{ t.city }}</td>
            <td data-label="Stops">{{ t.stopIds.length }}</td>
            <td class="muted" data-label="Distance">{{ t.distanceLabel }}</td>
            <td class="muted" data-label="Duration">{{ t.durationLabel }}</td>
            <td data-label="Status"><span class="badge" :class="t.status">{{ t.status }}</span></td>
            <td class="right" style="white-space:nowrap;" data-label="Actions">
              <button class="btn btn-ghost btn-sm" @click.stop="store.go('tourEditor', { id: t.id })">{{ store.canEditTour(t) ? 'Edit' : 'View' }}</button>
              <button class="btn btn-ghost btn-sm" @click.stop="preview(t)" title="Open this tour in the app in a new tab">Preview</button>
              <button class="btn btn-ghost btn-sm" @click.stop="duplicate(t)">Duplicate</button>
              <button v-if="store.canDeleteTour(t)" class="btn btn-danger btn-sm" @click.stop="remove(t)" aria-label="Delete tour" title="Delete">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:middle;"><path d="M3 6h18" /><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /></svg>
              </button>
            </td>
          </tr>
          <tr v-if="!rows.length"><td colspan="8" class="muted" style="text-align:center; padding:30px;">No tours yet.</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { store } from '../store.js'
import { config } from '../../config.js'
import { routeLength, formatDistance } from '../../lib/geo.js'

// Open the tour's detail screen in the public app (new tab). Same origin as the
// admin, so it works even if VITE_PUBLIC_URL isn't set; drafts show when signed in.
function preview(t) {
  const base = config.publicUrl || window.location.origin
  window.open(`${base}/?tour=${encodeURIComponent(t.id)}`, '_blank', 'noopener')
}

const dragIdx = ref(null)
function drop(i) {
  if (dragIdx.value == null || dragIdx.value === i) return
  const arr = store.tours
  const [moved] = arr.splice(dragIdx.value, 1)
  arr.splice(i, 0, moved)
  dragIdx.value = null
  store.reorderTours()
}

const byId = computed(() => Object.fromEntries(store.locations.map((l) => [l.id, l])))
const rows = computed(() =>
  store.tours.map((t) => {
    const stops = t.stopIds.map((id) => byId.value[id]).filter(Boolean)
    const mins = t.durationOverrideMins || stops.length * 12 + Math.round(routeLength(stops) / 80)
    const h = Math.floor(mins / 60), m = mins % 60
    return { ...t, distanceLabel: formatDistance(routeLength(stops), 'mi'), durationLabel: h ? `~${h}h ${m}m` : `~${m}m` }
  })
)
async function duplicate(t) {
  await store.saveTour({ ...t, recordId: undefined, id: t.id + '-copy', title: t.title + ' (copy)', status: 'draft' })
}
async function remove(t) {
  if (confirm(`Delete tour “${t.title}”?`)) await store.deleteTour(t)
}
</script>
