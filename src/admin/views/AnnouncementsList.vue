<!-- Announcements ("What's on") list — lightweight event cards shown at the top of
     the app's Tours list. See docs/announcements-spec.md. -->
<template>
  <div>
    <div class="pagehead">
      <h1>Announcements</h1>
      <button class="btn btn-primary" @click="store.go('announcementEditor', { id: null })">+ Add announcement</button>
    </div>
    <p class="muted" style="font-size:13px; margin:-6px 0 16px; max-width:640px;">
      Event cards for village happenings that aren't walks (a fair, a festival). They show as a
      "What's on" strip at the top of the app's Tours list and open a simple event page — the walks
      stay the focus. Past events drop off automatically.
    </p>

    <div class="card">
      <table>
        <thead>
          <tr><th>Title</th><th>When</th><th>Status</th><th class="right">Actions</th></tr>
        </thead>
        <tbody>
          <!-- eslint-disable-next-line vuejs-accessibility/no-static-element-interactions, vuejs-accessibility/click-events-have-key-events -- whole-row click is a pointer shortcut; the Edit button is the keyboard path -->
          <tr v-for="a in store.announcements" :key="a.recordId" class="row-clickable" @click="store.go('announcementEditor', { id: a.id })">
            <td style="font-weight:600;" data-label="Title">{{ a.title }}</td>
            <td class="muted" data-label="When">{{ whenLabel(a) }}</td>
            <td data-label="Status"><span class="badge" :class="a.status" style="white-space:nowrap;">{{ a.status }}</span></td>
            <td class="right" style="white-space:nowrap;" data-label="Actions">
              <button class="btn btn-ghost btn-sm" @click.stop="store.go('announcementEditor', { id: a.id })">Edit</button>
              <button v-if="a.status === 'published'" class="btn btn-ghost btn-sm" @click.stop="preview(a)" title="Open the event page in the app in a new tab">Preview</button>
              <button class="btn btn-danger btn-sm" @click.stop="remove(a)" aria-label="Delete announcement" title="Delete">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:middle;"><path d="M3 6h18" /><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /></svg>
              </button>
            </td>
          </tr>
          <tr v-if="!store.announcements.length"><td colspan="4" class="muted" style="text-align:center; padding:30px;">No announcements yet.</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { store } from '../store.js'
import { config } from '../../config.js'

const fmt = (d) => d ? new Date(d).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''
function whenLabel(a) {
  if (!a.eventStart) return 'Evergreen'
  return a.eventEnd && a.eventEnd !== a.eventStart ? `${fmt(a.eventStart)} – ${fmt(a.eventEnd)}` : fmt(a.eventStart)
}
function preview(a) {
  const base = config.publicUrl || window.location.origin
  window.open(`${base}/?event=${encodeURIComponent(a.id)}`, '_blank', 'noopener')
}
async function remove(a) {
  if (confirm(`Delete announcement “${a.title}”?`)) await store.deleteAnnouncement(a)
}
</script>
