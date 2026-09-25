<!-- A5 Tours & events — the app's home cards. Tours and announcements ("events")
     share one drag/arrow-ordered list; the order drives the public Tours screen.
     "+ New" chooses which type to create; each type keeps its own editor. -->
<template>
  <div>
    <div class="pagehead">
      <h1>Tours &amp; events</h1>
      <div style="position:relative;">
        <button class="btn btn-primary" @click="newOpen = !newOpen" :aria-expanded="String(newOpen)">+ New ▾</button>
        <!-- eslint-disable-next-line vuejs-accessibility/no-static-element-interactions -- backdrop: click-outside closes; the menu buttons are the accessible path -->
        <div v-if="newOpen" @click.self="newOpen = false" @keydown.esc="newOpen = false" style="position:absolute; inset:0 auto auto 0; z-index:1;">
          <div style="position:absolute; top:6px; right:0; min-width:210px; background:var(--card); border:1px solid var(--line); border-radius:12px; box-shadow:0 12px 40px rgba(0,0,0,0.18); overflow:hidden;">
            <button class="menu-item" @click="newTour">🚶 Walking tour</button>
            <button class="menu-item" @click="newEvent">📣 Announcement (event)</button>
          </div>
        </div>
      </div>
    </div>

    <p class="muted" style="font-size:13px; margin:-6px 0 14px;">Drag the ⠿ handle (or use ▲▼) to set the order these appear in the app. Events drop off automatically once they've passed.</p>
    <div class="card">
      <table class="compact-list home">
        <thead>
          <tr><th></th><th>Title</th><th>Details</th><th>Status</th><th class="right">Actions</th></tr>
        </thead>
        <tbody>
          <!-- eslint-disable-next-line vuejs-accessibility/no-static-element-interactions, vuejs-accessibility/click-events-have-key-events -- whole-row click is a pointer shortcut; the Edit button is the keyboard path -->
          <tr v-for="(row, i) in rows" :key="row.type + ':' + row.item.recordId" class="row-clickable"
            draggable="true"
            @click="edit(row)"
            @dragstart="dragIdx = i" @dragover.prevent @drop="drop(i)" @dragend="dragIdx = null"
            :style="{ opacity: dragIdx === i ? 0.4 : 1 }">
            <td style="color:var(--muted); cursor:grab; width:24px; text-align:center;" title="Drag to reorder" data-label="Order">⠿</td>
            <td style="font-weight:600;" data-label="Title">
              <span class="badge" :class="row.type === 'tour' ? 'kind-tour' : 'kind-event'" style="margin-right:8px; font-size:10px; letter-spacing:.3px;">{{ row.type === 'tour' ? 'Tour' : 'Event' }}</span>
              {{ row.item.title }}
            </td>
            <td class="muted" data-label="Details">{{ details(row) }}</td>
            <td data-label="Status"><span class="badge" :class="row.item.status" style="white-space:nowrap;">{{ row.item.status }}</span></td>
            <td class="right" style="white-space:nowrap;" data-label="Actions">
              <button type="button" class="btn btn-ghost btn-sm" :disabled="i === 0" @click.stop="move(i, -1)" :aria-label="`Move ${row.item.title} up`">▲</button>
              <button type="button" class="btn btn-ghost btn-sm" :disabled="i === rows.length - 1" @click.stop="move(i, 1)" :aria-label="`Move ${row.item.title} down`">▼</button>
              <button class="btn btn-ghost btn-sm" @click.stop="edit(row)">{{ canEdit(row) ? 'Edit' : 'View' }}</button>
              <button class="btn btn-ghost btn-sm" @click.stop="preview(row)" title="Open in the app in a new tab">Preview</button>
              <button v-if="row.type === 'tour' || store.role !== 'editor'" class="btn btn-ghost btn-sm" @click.stop="duplicate(row)">Duplicate</button>
              <button v-if="canRemove(row)" class="btn btn-danger btn-sm" @click.stop="remove(row)" :aria-label="`${removeLabel(row)} ${row.item.title}`" :title="removeLabel(row)">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:middle;"><path d="M3 6h18" /><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /></svg>
              </button>
            </td>
          </tr>
          <tr v-if="!rows.length"><td colspan="5" class="muted" style="text-align:center; padding:30px;">Nothing yet. Use “+ New”.</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { store } from '../store.js'
import { config } from '../../config.js'
import { eventWhen, expiresLabel } from '../../lib/eventtime.js'

const rows = computed(() => store.homeItems)

// ── create ──
const newOpen = ref(false)
function newTour() { newOpen.value = false; store.go('tourEditor', { id: null }) }
function newEvent() { newOpen.value = false; store.go('announcementEditor', { id: null }) }

// ── per-type helpers ──
function edit(row) { store.go(row.type === 'tour' ? 'tourEditor' : 'announcementEditor', { id: row.item.id }) }
function canEdit(row) { return row.type === 'tour' ? store.canEditTour(row.item) : store.role !== 'editor' }
// A tour can be removed by anyone who can edit it: the owner/SA archive it (recoverable),
// an assigned non-owner raises a request to the owner. Events stay SA/admin-only (they
// aren't in the deletion workflow — a plain delete).
function canRemove(row) { return row.type === 'tour' ? store.canEditTour(row.item) : store.role !== 'editor' }
// Label the destructive button: "Request deletion" when it will raise a request
// rather than archive directly (a non-owner editor on someone else's tour).
function removeLabel(row) { return row.type === 'tour' && !store.canDeleteTour(row.item) ? 'Request deletion' : 'Delete' }
function details(row) {
  if (row.type === 'tour') return `${row.item.stopIds.length} stop${row.item.stopIds.length === 1 ? '' : 's'}`
  const a = row.item
  const when = a.eventStart ? eventWhen(a.eventStart, a.eventEnd) : (a.eventEnd ? expiresLabel(a.eventEnd) : 'Evergreen')
  return a.place ? `${when} · ${a.place}` : when
}
function preview(row) {
  const base = config.publicUrl || window.location.origin
  const q = row.type === 'tour' ? `tour=${encodeURIComponent(row.item.id)}` : `event=${encodeURIComponent(row.item.id)}`
  // preview=1 → the app loads unfiltered so a DRAFT resolves (RLS still gates it to a signed-in admin)
  window.open(`${base}/?${q}&preview=1`, '_blank', 'noopener')
}
async function duplicate(row) {
  const it = row.item
  if (row.type === 'tour') {
    await store.saveTour({ ...it, recordId: undefined, id: it.id + '-copy', title: it.title + ' (copy)', status: 'draft' })
  } else {
    // fresh slug so it can't collide; drops to draft for the new occurrence to be dated
    await store.saveAnnouncement({ ...it, recordId: undefined, id: 'ann-' + Math.random().toString(36).slice(2, 8), title: it.title + ' (copy)', status: 'draft' })
  }
}
async function remove(row) {
  if (row.type !== 'tour') {
    // Events aren't archived — a plain delete (they're transient by nature).
    if (!confirm(`Delete announcement “${row.item.title}”? This cannot be undone.`)) return
    await store.deleteAnnouncement(row.item)
    return
  }
  const willRequest = !store.canDeleteTour(row.item) // a non-owner assigned editor
  const msg = willRequest
    ? `Request deletion of tour “${row.item.title}”? The owner will be asked to approve.`
    : `Archive tour “${row.item.title}”? It moves to the Archive and can be restored.`
  if (!confirm(msg)) return
  const result = await store.deleteTour(row.item)
  if (result === 'requested') alert('Request sent to the owner for approval.')
}

// ── reorder (drag + keyboard), writing the shared order across both tables ──
const dragIdx = ref(null)
function reorder(from, to) {
  const arr = [...rows.value]
  if (to < 0 || to >= arr.length) return
  const [m] = arr.splice(from, 1)
  arr.splice(to, 0, m)
  store.reorderHome(arr)
}
function move(i, dir) { reorder(i, i + dir) }
function drop(i) { if (dragIdx.value != null && dragIdx.value !== i) reorder(dragIdx.value, i); dragIdx.value = null }
</script>

<style scoped>
.menu-item { display:block; width:100%; text-align:left; padding:10px 14px; background:none; border:none; border-bottom:1px solid var(--line); font:inherit; font-size:14px; font-weight:600; color:var(--ink); cursor:pointer; }
.menu-item:last-child { border-bottom:none; }
.menu-item:hover { background:var(--bg); }
.badge.kind-tour { background:#e7ecff; color:#3346b8; }
.badge.kind-event { background:#efe9fb; color:#5b3ea8; }
</style>
