<!-- Christmas Craft Fair stall bookings: who has booked and who has paid, so the
     committee (coordinator / treasurer) can see it at a glance and tick payments off.
     Reads store.craftFairSignups (craft_fair_signups; admin-only by RLS, Tollesbury only). -->
<template>
  <div>
    <div class="pagehead">
      <h1>Craft Fair bookings</h1>
      <div style="display:flex; gap:8px;">
        <button class="btn btn-ghost" @click="exportCsv" :disabled="!rows.length">Export CSV</button>
        <button class="btn btn-ghost" @click="refresh" :disabled="refreshing">{{ refreshing ? 'Refreshing…' : 'Refresh' }}</button>
      </div>
    </div>

    <p class="muted" style="margin:-6px 0 16px; font-size:13.5px; max-width:66ch;">
      Tollesbury Christmas Craft Fair · Saturday 12 December 2026. Bookings come in from
      tollesbury.art/XmasFair26 (£10 a stall). Match the reference on the bank statement, then mark it paid.
    </p>

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

    <div class="toolbar" v-if="rows.length">
      <select v-model="filter" aria-label="Filter by payment status" style="max-width:210px;">
        <option value="">All ({{ rows.length }})</option>
        <option value="awaiting">Awaiting payment ({{ awaitingCount }})</option>
        <option value="paid">Paid ({{ paidCount }})</option>
      </select>
    </div>

    <div class="card">
      <table>
        <thead>
          <tr style="white-space:nowrap;">
            <th>Status</th><th>Stallholder</th><th>What they create</th><th>Contact</th><th>Reference</th><th>Page</th><th>Booked</th><th class="right">Action</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in shown" :key="r.id">
            <td data-label="Status">
              <span class="badge" :style="r.payment_status === 'paid'
                ? { background:'var(--green,#1f9d57)', color:'#fff' }
                : { background:'var(--amber-soft,#fff6df)', color:'var(--amber-ink,#8a6d00)', border:'1px solid var(--amber,#E0A800)' }">
                {{ r.payment_status === 'paid' ? '✅ Paid' : '⏳ Awaiting' }}
              </span>
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
            <td class="right" data-label="Action" style="white-space:nowrap;">
              <button class="btn btn-sm" :class="r.payment_status === 'paid' ? 'btn-ghost' : 'btn-primary'"
                      :disabled="savingId === r.id" @click="togglePaid(r)">
                {{ savingId === r.id ? '…' : (r.payment_status === 'paid' ? 'Mark awaiting' : 'Mark paid') }}
              </button>
            </td>
          </tr>
        </tbody>
        <tbody v-if="!shown.length">
          <tr><td colspan="8" class="muted" style="text-align:center; padding:30px;">
            {{ rows.length ? 'None match this filter.' : 'No bookings yet. They come in from tollesbury.art/XmasFair26.' }}
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
const savingId = ref(null)

// newest first
const rows = computed(() =>
  [...store.craftFairSignups].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
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

async function togglePaid(r) {
  savingId.value = r.id
  try { await store.setCraftFairPaid(r.id, r.payment_status !== 'paid') }
  catch (e) { alert('Could not update payment status: ' + e.message) }
  finally { savingId.value = null }
}

// Client-side CSV for the treasurer (all bookings, current filter ignored).
function exportCsv() {
  const cols = ['created_at', 'name', 'org', 'email', 'phone', 'craft', 'description', 'website', 'wants_free_page', 'photo1_path', 'photo2_path', 'payment_ref', 'payment_status']
  const esc = (v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'
  const lines = [cols.join(',')].concat(rows.value.map((r) => cols.map((c) => esc(r[c])).join(',')))
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'craft-fair-bookings.csv'
  a.click()
  URL.revokeObjectURL(a.href)
}

async function refresh() {
  refreshing.value = true
  try { await store.loadCraftFairSignups() } finally { refreshing.value = false }
}
onMounted(refresh)
</script>
