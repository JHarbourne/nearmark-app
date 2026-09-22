<!-- Archive (Phase 3 RBAC / migration 040): soft-deleted tours & locations, plus any
     pending deletion requests the signed-in user may decide. "Delete" everywhere else
     archives here (recoverable); the Super Admin can Purge permanently. Nothing here is
     ever served to the public app. -->
<template>
  <div>
    <div class="pagehead">
      <h1>Archive</h1>
      <span class="muted" style="font-size:13px;">Removed tours and locations, kept recoverable. Restore anything, or – as Super Admin – purge it for good.</span>
    </div>

    <!-- pending requests to decide -->
    <div v-if="store.deletionRequests.length" class="card" style="padding:18px; margin-bottom:20px;">
      <h2 style="margin:0 0 12px; font-size:16px;">Deletion requests</h2>
      <div v-for="r in store.deletionRequests" :key="r.id"
        style="display:flex; align-items:flex-start; gap:12px; padding:12px 0; border-top:1px solid var(--line);">
        <span style="flex:1; min-width:0;">
          <span style="display:block; font-size:14px;">
            <strong>{{ r.requestedByName }}</strong> asked to delete the {{ r.entityType }}
            <strong>“{{ r.entityTitle }}”</strong>
          </span>
          <span v-if="r.reason" class="muted" style="display:block; font-size:12.5px; margin-top:2px;">{{ r.reason }}</span>
          <span class="muted" style="display:block; font-size:11.5px; margin-top:2px;">{{ relTime(r.createdAt) }}</span>
        </span>
        <span style="display:flex; gap:6px; white-space:nowrap;">
          <button class="btn btn-primary btn-sm" @click="decide(r, true)">Approve</button>
          <button class="btn btn-ghost btn-sm" @click="decide(r, false)">Decline</button>
        </span>
      </div>
    </div>

    <!-- archived tours -->
    <div class="card" style="padding:18px; margin-bottom:20px;">
      <h2 style="margin:0 0 8px; font-size:16px;">Archived tours &amp; events</h2>
      <p v-if="!store.archivedTours.length" class="muted" style="font-size:13px; margin:0;">None archived.</p>
      <div v-for="t in store.archivedTours" :key="t.recordId"
        style="display:flex; align-items:center; gap:12px; padding:11px 0; border-top:1px solid var(--line);">
        <span style="flex:1; min-width:0;">
          <span style="display:block; font-weight:600; font-size:14px;">{{ t.title }}</span>
          <span class="muted" style="font-size:11.5px;">Archived {{ relTime(t.archivedAt) }}<template v-if="purgeable(t)"> · ready to purge</template></span>
        </span>
        <span style="display:flex; gap:6px; white-space:nowrap;">
          <button class="btn btn-ghost btn-sm" @click="restore('tour', t)">Restore</button>
          <button v-if="store.isSuperAdmin" class="btn btn-danger btn-sm" @click="purge('tour', t)">Purge</button>
        </span>
      </div>
    </div>

    <!-- archived locations -->
    <div class="card" style="padding:18px;">
      <h2 style="margin:0 0 8px; font-size:16px;">Archived locations</h2>
      <p v-if="!store.archivedLocations.length" class="muted" style="font-size:13px; margin:0;">None archived.</p>
      <div v-for="l in store.archivedLocations" :key="l.recordId"
        style="display:flex; align-items:center; gap:12px; padding:11px 0; border-top:1px solid var(--line);">
        <span style="flex:1; min-width:0;">
          <span style="display:block; font-weight:600; font-size:14px;">{{ l.title }}</span>
          <span class="muted" style="font-size:11.5px;">Archived {{ relTime(l.archivedAt) }}<template v-if="purgeable(l)"> · ready to purge</template></span>
        </span>
        <span style="display:flex; gap:6px; white-space:nowrap;">
          <button class="btn btn-ghost btn-sm" @click="restore('location', l)">Restore</button>
          <button v-if="store.isSuperAdmin" class="btn btn-danger btn-sm" @click="purge('location', l)">Purge</button>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { store } from '../store.js'

// A row archived more than the recovery window ago is flagged as safe to clear.
const RECOVERY_DAYS = 30
function purgeable(row) {
  if (!row.archivedAt) return false
  return (Date.now() - new Date(row.archivedAt).getTime()) > RECOVERY_DAYS * 864e5
}

async function decide(r, approve) {
  try { await store.resolveDeletion(r.id, approve) }
  catch (e) { alert('Could not update the request: ' + (e?.message || e)) }
}
async function restore(type, row) {
  try { await (type === 'tour' ? store.restoreTour(row) : store.restoreLocation(row)) }
  catch (e) { alert('Restore failed: ' + (e?.message || e)) }
}
async function purge(type, row) {
  if (!confirm(`Permanently delete “${row.title}”? This cannot be undone.`)) return
  try { await (type === 'tour' ? store.purgeTour(row) : store.purgeLocation(row)) }
  catch (e) { alert('Purge failed: ' + (e?.message || e)) }
}

function relTime(d) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`
  const days = Math.floor(h / 24); if (days < 7) return `${days}d ago`
  return new Date(d).toLocaleDateString()
}
</script>
