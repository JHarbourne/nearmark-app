<!-- A3 Locations list (BRD §11.3): table, filters, search, row actions. -->
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
    </div>

    <div class="card">
      <table>
        <thead>
          <tr><th>Title</th><th>City</th><th>Period</th><th>Status</th><th>Tour stop</th><th class="right">Actions</th></tr>
        </thead>
        <tbody>
          <!-- eslint-disable-next-line vuejs-accessibility/no-static-element-interactions, vuejs-accessibility/click-events-have-key-events -- whole-row click is a pointer shortcut; the Edit button is the keyboard / assistive-tech path -->
          <tr v-for="l in filtered" :key="l.id" class="row-clickable" @click="store.go('locationEditor', { id: l.id })">
            <td style="font-weight:600;">
              <span class="swatch" :style="{ background: l.hue, display:'inline-block', width:'14px', height:'14px', verticalAlign:'middle', marginRight:'8px' }"></span>
              {{ l.title }}
            </td>
            <td>{{ l.city }}</td>
            <td class="muted">{{ l.period }}</td>
            <td><span class="badge" :class="l.status">{{ l.status }}</span></td>
            <td>{{ l.tourNum ? '#' + l.tourNum : '—' }}</td>
            <td class="right">
              <button class="btn btn-ghost btn-sm" @click.stop="store.go('locationEditor', { id: l.id })">Edit</button>
              <button class="btn btn-ghost btn-sm" @click.stop="duplicate(l)">Duplicate</button>
              <button class="btn btn-danger btn-sm" @click.stop="remove(l)">Delete</button>
            </td>
          </tr>
          <tr v-if="!filtered.length"><td colspan="6" class="muted" style="text-align:center; padding:30px;">No locations match.</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { store } from '../store.js'

const q = ref('')
const cityFilter = ref('')
const statusFilter = ref('')
const cities = computed(() => [...new Set(store.locations.map((l) => l.city))])

const filtered = computed(() =>
  store.locations.filter((l) => {
    if (q.value && !l.title.toLowerCase().includes(q.value.toLowerCase())) return false
    if (cityFilter.value && l.city !== cityFilter.value) return false
    if (statusFilter.value && l.status !== statusFilter.value) return false
    return true
  })
)

async function duplicate(l) {
  const copy = { ...l, recordId: undefined, id: l.id + '-copy-' + Math.random().toString(36).slice(2, 6), title: l.title + ' (copy)', tourNum: null, status: 'draft' }
  await store.saveLocation(copy)
}
async function remove(l) {
  if (confirm(`Delete “${l.title}”? This cannot be undone.`)) await store.deleteLocation(l)
}
</script>
