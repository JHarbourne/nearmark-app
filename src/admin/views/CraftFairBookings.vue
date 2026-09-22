<!-- Event bookings: who has booked a stall and who has paid, per event, so the
     committee can see it at a glance and tick payments off as the money lands.
     Reads store.craftFairSignups (craft_fair_signups; admin-only by RLS). -->
<template>
  <div>
    <div class="pagehead">
      <h1>Event Bookings</h1>
      <div style="display:flex; gap:8px;">
        <button class="btn btn-ghost" @click="exportCsv" :disabled="!rows.length">Export CSV</button>
        <button class="btn btn-ghost" @click="refresh" :disabled="refreshing">{{ refreshing ? 'Refreshing…' : 'Refresh' }}</button>
      </div>
    </div>

    <p class="muted" style="margin:-6px 0 16px; font-size:13.5px; max-width:66ch;">
      Stall bookings for each event. Tick <strong>Paid</strong> when the money lands in the bank (match the reference on the statement).
    </p>

    <div class="toolbar">
      <label for="event-select" style="margin:0; font-weight:600; font-size:13px;">Event</label>
      <select id="event-select" v-model="selectedEvent" style="max-width:240px;">
        <option v-for="e in events" :key="e.value" :value="e.value">{{ e.label }}</option>
      </select>
      <div class="seg-toggle" role="group" aria-label="Filter by payment status" v-if="rows.length">
        <button type="button" :class="{ on: filter === '' }" @click="filter = ''">All <span class="seg-n">{{ rows.length }}</span></button>
        <button type="button" :class="{ on: filter === 'awaiting' }" @click="filter = 'awaiting'">Awaiting <span class="seg-n">{{ awaitingCount }}</span></button>
        <button type="button" :class="{ on: filter === 'paid' }" @click="filter = 'paid'">Paid <span class="seg-n">{{ paidCount }}</span></button>
      </div>
    </div>

    <!-- summary -->
    <div v-if="rows.length" class="card" style="padding:16px 18px; margin-bottom:16px;">
      <div style="display:flex; align-items:baseline; gap:20px; flex-wrap:wrap;">
        <span><strong style="font-size:22px;">{{ rows.length }}</strong> <span class="muted" style="font-size:13.5px;">booked</span></span>
        <span><strong style="font-size:22px; color:var(--green,#1f9d57);">{{ paidCount }}</strong> <span class="muted" style="font-size:13.5px;">paid</span></span>
        <span><strong style="font-size:22px;">{{ awaitingCount }}</strong> <span class="muted" style="font-size:13.5px;">awaiting</span></span>
        <span><strong style="font-size:22px;">£{{ collected }}</strong> <span class="muted" style="font-size:13.5px;">collected of £{{ rows.length * 10 }}</span></span>
      </div>
      <div style="height:8px; border-radius:4px; background:var(--bg2, rgba(0,0,0,0.06)); margin-top:10px; overflow:hidden;">
        <div :style="{ width: pct + '%', height:'100%', background:'var(--green,#1f9d57)', transition:'width .3s' }"></div>
      </div>
    </div>

    <div class="card">
      <table>
        <thead>
          <tr style="white-space:nowrap;">
            <th>Paid</th><th>Stallholder</th><th>What they create</th><th>Contact</th><th>Reference</th><th>Page</th><th>Booked</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in shown" :key="r.id">
            <td data-label="Paid">
              <label style="display:inline-flex; align-items:center; gap:8px; cursor:pointer; white-space:nowrap;">
                <input type="checkbox" :checked="r.payment_status === 'paid'" :disabled="savingId === r.id"
                       @change="setPaid(r, $event.target.checked)" :aria-label="`Payment received in the bank for ${r.name}`" />
                <span class="badge" :style="r.payment_status === 'paid'
                  ? { background:'var(--green,#1f9d57)', color:'#fff' }
                  : { background:'var(--amber-soft,#fff6df)', color:'var(--amber-ink,#8a6d00)', border:'1px solid var(--amber,#E0A800)' }">
                  {{ savingId === r.id ? '…' : (r.payment_status === 'paid' ? 'Paid' : 'Awaiting') }}
                </span>
              </label>
            </td>
            <td style="font-weight:600;" data-label="Stallholder">
              {{ r.name }}
              <span v-if="r.org" class="muted" style="display:block; font-weight:400; font-size:12px;">{{ r.org }}</span>
            </td>
            <td data-label="What they create">
              {{ r.craft || '—' }}
              <span v-if="r.description" class="muted" style="display:block; font-weight:400; font-size:12px; margin-top:2px;" :title="r.description">{{ truncate(r.description, 60) }}</span>
            </td>
            <td data-label="Contact" style="font-size:13px;">
              <a v-if="r.email" :href="'mailto:' + r.email">{{ r.email }}</a>
              <span v-if="r.phone" class="muted" style="display:block;">{{ r.phone }}</span>
            </td>
            <td data-label="Reference" style="white-space:nowrap; font-variant-numeric:tabular-nums;">{{ r.payment_ref || '—' }}</td>
            <td data-label="Page" style="font-size:12px;">
              <span>{{ r.wants_free_page ? 'Free page' : (r.website ? 'Own site' : '—') }}</span>
              <span v-if="photoCount(r)" class="muted" style="display:block;">📷 {{ photoCount(r) }}</span>
            </td>
            <td class="muted" data-label="Booked" style="white-space:nowrap; font-size:12px;">{{ new Date(r.created_at).toLocaleDateString() }}</td>
          </tr>
        </tbody>
        <tbody v-if="!shown.length">
          <tr><td colspan="7" class="muted" style="text-align:center; padding:30px;">
            {{ rows.length ? 'None match this filter.' : 'No bookings yet for this event.' }}
          </td></tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { store } from '../store.js'

// Friendly names for each event's notice_version key. New events map here;
// anything unmapped falls back to its raw key so it still appears in the pulldown.
const EVENT_LABELS = { 'faire-2026-12': 'Xmas Craft Fair 2026' }
const CURRENT_EVENT = 'faire-2026-12'
function eventLabel(nv) { return EVENT_LABELS[nv] || nv || 'Other' }

const filter = ref('')
const selectedEvent = ref(CURRENT_EVENT)
const refreshing = ref(false)
const savingId = ref(null)

// events pulldown: the current event always present, plus any others seen in the data
const events = computed(() => {
  const keys = new Set([CURRENT_EVENT])
  for (const r of store.craftFairSignups) if (r.notice_version) keys.add(r.notice_version)
  return [...keys].sort().reverse().map((nv) => ({ value: nv, label: eventLabel(nv) }))
})

// rows for the selected event, newest first
const rows = computed(() =>
  store.craftFairSignups
    .filter((r) => (r.notice_version || CURRENT_EVENT) === selectedEvent.value)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
)
const paidCount = computed(() => rows.value.filter((r) => r.payment_status === 'paid').length)
const awaitingCount = computed(() => rows.value.length - paidCount.value)
const collected = computed(() => paidCount.value * 10) // £10 flat per stall
const pct = computed(() => (rows.value.length ? Math.round((paidCount.value / rows.value.length) * 100) : 0))
const shown = computed(() => rows.value.filter((r) =>
  filter.value === 'paid' ? r.payment_status === 'paid'
    : filter.value === 'awaiting' ? r.payment_status !== 'paid'
      : true))

function photoCount(r) { return (r.photo1_path ? 1 : 0) + (r.photo2_path ? 1 : 0) }
function truncate(s, n) { return s && s.length > n ? s.slice(0, n) + '…' : s }

// Carol ticks this when the bank alert shows the money in; writes payment_status.
async function setPaid(r, paid) {
  savingId.value = r.id
  try { await store.setCraftFairPaid(r.id, paid) }
  catch (e) { alert('Could not update payment status: ' + e.message) }
  finally { savingId.value = null }
}

function exportCsv() {
  const cols = ['created_at', 'name', 'org', 'email', 'phone', 'craft', 'description', 'website', 'wants_free_page', 'photo1_path', 'photo2_path', 'payment_ref', 'payment_status']
  const esc = (v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'
  const lines = [cols.join(',')].concat(rows.value.map((r) => cols.map((c) => esc(r[c])).join(',')))
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${eventLabel(selectedEvent.value).replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-bookings.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}

async function refresh() {
  refreshing.value = true
  try { await store.loadCraftFairSignups() } finally { refreshing.value = false }
}
onMounted(refresh)
</script>

<style scoped>
.seg-n { opacity: 0.55; font-weight: 400; font-size: 0.85em; margin-left: 3px; }
</style>
