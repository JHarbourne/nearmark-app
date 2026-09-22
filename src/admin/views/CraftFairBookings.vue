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

    <p v-if="!events.length" class="card muted" style="padding:16px 18px; font-size:13.5px;">
      No bookable events yet. In <strong>Tours &amp; events</strong>, open (or create) an event and set its
      <strong>Stall bookings</strong> reference to match the website form – it will then appear here, even as a draft.
    </p>

    <div class="toolbar" v-if="events.length">
      <label for="event-select" style="margin:0; font-weight:600; font-size:13px;">Event</label>
      <select id="event-select" v-model="selectedEvent" style="max-width:280px;">
        <option v-for="e in events" :key="e.value" :value="e.value">{{ e.label }}{{ e.draft ? ' · draft' : '' }}{{ e.orphan ? ' · (no event page)' : '' }}</option>
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
            <th>Paid</th><th>Stallholder</th><th>What they create</th><th>Contact</th><th>Reference</th><th>Page</th><th>Booked</th><th class="right">Remove</th>
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
            <td class="right" data-label="Remove" style="white-space:nowrap;">
              <button class="btn btn-danger btn-sm" @click="removeBooking(r)" :disabled="deletingId === r.id"
                      :aria-label="`Delete booking for ${r.name}`" :title="`Delete booking for ${r.name}`">
                <svg v-if="deletingId !== r.id" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:middle;"><path d="M3 6h18" /><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /></svg>
                <span v-else>…</span>
              </button>
            </td>
          </tr>
        </tbody>
        <tbody v-if="!shown.length">
          <tr><td colspan="8" class="muted" style="text-align:center; padding:30px;">
            {{ rows.length ? 'None match this filter.' : 'No bookings yet for this event.' }}
          </td></tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { store } from '../store.js'

const filter = ref('')
const selectedEvent = ref('')
const refreshing = ref(false)
const savingId = ref(null)
const deletingId = ref(null)

// Events are the real "Tours & events" announcements that carry a Stall-bookings
// reference (bookingKey). That reference matches craft_fair_signups.notice_version,
// so a draft event still appears here the moment its reference is set. Any booking
// whose reference has no matching event still shows, keyed by its raw reference, so
// data is never hidden. Titles come from the event; unmatched keys fall back to raw.
const eventsByKey = computed(() =>
  Object.fromEntries(store.announcements.filter((a) => a.bookingKey).map((a) => [a.bookingKey, a])))
function eventLabel(nv) { return eventsByKey.value[nv]?.title || nv || 'Other' }

const events = computed(() => {
  const seen = new Set()
  const list = []
  // events with a bookings reference (any status, incl. past) — newest first by start
  for (const a of [...store.announcements].filter((a) => a.bookingKey)
    .sort((x, y) => (y.eventStart || '').localeCompare(x.eventStart || '') || (x.title || '').localeCompare(y.title || ''))) {
    if (seen.has(a.bookingKey)) continue
    seen.add(a.bookingKey)
    list.push({ value: a.bookingKey, label: a.title || a.bookingKey, draft: a.status !== 'published' })
  }
  // any booking whose reference has no matching event — don't lose the data
  for (const r of store.craftFairSignups) {
    if (r.notice_version && !seen.has(r.notice_version)) { seen.add(r.notice_version); list.push({ value: r.notice_version, label: r.notice_version, draft: false, orphan: true }) }
  }
  return list
})
// default the pulldown to the first event once the list is known
watch(events, (list) => { if (list.length && !list.some((e) => e.value === selectedEvent.value)) selectedEvent.value = list[0].value }, { immediate: true })

// rows for the selected event, newest first
const rows = computed(() =>
  store.craftFairSignups
    .filter((r) => r.notice_version === selectedEvent.value)
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

// Remove a booking (duplicate, test, or withdrawn). Destructive → confirm first.
async function removeBooking(r) {
  const ref = r.payment_ref ? ` (${r.payment_ref})` : ''
  if (!confirm(`Delete ${r.name}'s booking${ref}?\n\nThis removes it from the list for good and cannot be undone.`)) return
  deletingId.value = r.id
  try { await store.deleteCraftFairSignup(r.id) }
  catch (e) { alert('Could not delete the booking: ' + e.message) }
  finally { deletingId.value = null }
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
