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
            <td style="color:var(--muted); cursor:grab; width:24px; text-align:center;" title="Drag to reorder">⠿</td>
            <td style="font-weight:600;">{{ t.title }}</td>
            <td>{{ t.city }}</td>
            <td>{{ t.stopIds.length }}</td>
            <td class="muted">{{ t.distanceLabel }}</td>
            <td class="muted">{{ t.durationLabel }}</td>
            <td><span class="badge" :class="t.status">{{ t.status }}</span></td>
            <td class="right">
              <button class="btn btn-ghost btn-sm" @click.stop="store.go('tourEditor', { id: t.id })">Edit</button>
              <button class="btn btn-ghost btn-sm" @click.stop="duplicate(t)">Duplicate</button>
              <button class="btn btn-danger btn-sm" @click.stop="remove(t)">Delete</button>
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
import { routeLength, formatDistance } from '../../lib/geo.js'

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
