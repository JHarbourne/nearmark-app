<!-- Approvals overview: every owner/artist story on a participatory tour with its
     approval state, so an organiser can see at a glance who's approved and who's
     still to chase — instead of opening each story's Owner-contact box one by one.
     Reads store.approvals (the private participants table, admin-only by RLS). -->
<template>
  <div>
    <div class="pagehead">
      <h1>Approvals</h1>
      <button class="btn btn-ghost" @click="refresh" :disabled="refreshing">{{ refreshing ? 'Refreshing…' : 'Refresh' }}</button>
    </div>

    <p class="muted" style="margin:-6px 0 16px; font-size:13.5px; max-width:60ch;">
      Owners and artists who approve their own listing (participatory tours) appear here.
      Approving is their green light to publish – you still publish each story and the tour yourself.
    </p>

    <!-- summary -->
    <div v-if="rows.length" class="card" style="padding:16px 18px; margin-bottom:16px;">
      <div style="display:flex; align-items:baseline; gap:14px; flex-wrap:wrap;">
        <strong style="font-size:22px;">{{ approvedCount }}/{{ rows.length }}</strong>
        <span class="muted" style="font-size:13.5px;">approved · {{ pendingCount }} still pending</span>
      </div>
      <div style="height:8px; border-radius:4px; background:var(--bg2, rgba(0,0,0,0.06)); margin-top:10px; overflow:hidden;">
        <div :style="{ width: pct + '%', height:'100%', background:'var(--green,#1f9d57)', transition:'width .3s' }"></div>
      </div>
    </div>

    <div class="toolbar" v-if="rows.length">
      <select v-model="filter" aria-label="Filter by approval status" style="max-width:180px;">
        <option value="">All ({{ rows.length }})</option>
        <option value="pending">Pending ({{ pendingCount }})</option>
        <option value="approved">Approved ({{ approvedCount }})</option>
      </select>
    </div>

    <div class="card">
      <table>
        <thead>
          <tr style="white-space:nowrap;"><th>Status</th><th>Artist / story</th><th>Venue</th><th>Approved by</th><th>When</th><th class="right">Actions</th></tr>
        </thead>
        <tbody>
          <tr v-for="r in shown" :key="r.storyId">
            <td data-label="Status">
              <span class="badge" :style="r.approved
                ? { background:'var(--green,#1f9d57)', color:'#fff' }
                : { background:'var(--amber-soft,#fff6df)', color:'var(--amber-ink,#8a6d00)', border:'1px solid var(--amber,#E0A800)' }">
                {{ r.approved ? '✅ Approved' : '⏳ Pending' }}
              </span>
              <span v-if="r.addressChanged" class="badge" style="margin-left:6px; background:var(--amber,#E0A800); color:#fff;" title="The artist changed their address — re-check the map pin">⚠ re-pin</span>
            </td>
            <td style="font-weight:600;" data-label="Artist / story">
              {{ r.heading }}
              <span v-if="r.note" class="muted" style="display:block; font-weight:400; font-size:12px; margin-top:2px;" :title="r.note">📝 left a note</span>
            </td>
            <td data-label="Venue">{{ r.locationTitle }}</td>
            <td data-label="Approved by">{{ r.approvedBy || '—' }}</td>
            <td class="muted" data-label="When">{{ r.approvedAt ? new Date(r.approvedAt).toLocaleDateString() : '—' }}</td>
            <td class="right" style="white-space:nowrap;" data-label="Actions">
              <button v-if="locById[r.locationRecordId]" class="btn btn-ghost btn-sm" @click="open(r)">Open</button>
              <span v-else class="muted" style="font-size:12px;">—</span>
            </td>
          </tr>
        </tbody>
        <tbody v-if="!shown.length">
          <tr><td colspan="6" class="muted" style="text-align:center; padding:30px;">
            {{ rows.length ? 'None match this filter.' : 'No approvals yet. Add an owner email/mobile to a story and send them their approval link.' }}
          </td></tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { store } from '../store.js'

const filter = ref('')
const refreshing = ref(false)

// Pending first, then by name; approvals come from the private participants table.
const rows = computed(() =>
  [...store.approvals].sort((a, b) => (a.approved === b.approved ? a.heading.localeCompare(b.heading) : a.approved ? 1 : -1)),
)
const approvedCount = computed(() => rows.value.filter((r) => r.approved).length)
const pendingCount = computed(() => rows.value.length - approvedCount.value)
const pct = computed(() => (rows.value.length ? Math.round((approvedCount.value / rows.value.length) * 100) : 0))
const shown = computed(() => rows.value.filter((r) => (filter.value === 'approved' ? r.approved : filter.value === 'pending' ? !r.approved : true)))

// Map a participant's location (locations.id / recordId) to the loaded location so
// "Open" can navigate by its business id, exactly as the Locations list does.
const locById = computed(() => Object.fromEntries(store.locations.filter((l) => l.recordId).map((l) => [l.recordId, l])))
function open(r) {
  const loc = locById.value[r.locationRecordId]
  if (loc) store.go('locationEditor', { id: loc.id })
}

async function refresh() {
  refreshing.value = true
  try { await store.loadApprovals() } finally { refreshing.value = false }
}
onMounted(refresh)
</script>
