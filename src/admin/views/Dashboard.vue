<!-- A2 Dashboard (BRD §11.2): stats row, recent activity, quick links. -->
<template>
  <div>
    <div class="pagehead"><h1>Dashboard</h1></div>

    <!-- stat cards double as shortcuts to the matching list -->
    <div class="statgrid" style="margin-bottom:26px;">
      <button type="button" class="card stat statlink" @click="store.go('locations')" aria-label="View all locations"><div class="n">{{ store.locations.length }}</div><div class="l">Total locations</div></button>
      <button type="button" class="card stat statlink" @click="store.go('tours')" aria-label="View all tours"><div class="n">{{ store.tours.length }}</div><div class="l">Total tours</div></button>
      <button type="button" class="card stat statlink" @click="store.go('locations')" aria-label="View locations (published)"><div class="n">{{ published }}</div><div class="l">Published locations</div></button>
      <button type="button" class="card stat statlink" @click="store.go('locations')" aria-label="View locations (drafts)"><div class="n">{{ drafts }}</div><div class="l">Draft locations</div></button>
    </div>

    <div style="display:grid; grid-template-columns: 1.4fr 1fr; gap:20px;">
      <div class="card" style="padding:20px;">
        <h3 style="margin:0 0 14px; font-size:16px;">Recent activity</h3>
        <p v-if="!store.activity.length" class="muted" style="font-size:14px;">No activity yet this session.</p>
        <div v-for="(a, i) in store.activity" :key="i" style="display:flex; justify-content:space-between; padding:9px 0; border-bottom:1px solid var(--line); font-size:14px;">
          <span><strong>{{ a.action }}</strong> · {{ a.title }}</span>
          <span class="muted" style="white-space:nowrap; padding-left:12px;">{{ a.who }} · {{ when(a.at) }}</span>
        </div>
      </div>

      <div class="card" style="padding:20px;">
        <h3 style="margin:0 0 14px; font-size:16px;">Quick links</h3>
        <button class="btn btn-primary" style="width:100%; margin-bottom:10px;" @click="store.go('locationEditor', { id: null })">+ Add location</button>
        <button class="btn btn-ghost" style="width:100%; margin-bottom:10px;" @click="store.go('tourEditor', { id: null })">+ Add tour</button>
        <a class="btn btn-ghost" style="width:100%; display:block; text-align:center; text-decoration:none;" href="/" target="_blank">View live app<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:-2px; margin-left:6px;"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg></a>
        <a v-if="analyticsUrl" class="btn btn-ghost" style="width:100%; display:block; text-align:center; text-decoration:none; margin-top:10px;" :href="analyticsUrl" target="_blank" rel="noopener">View analytics<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:-2px; margin-left:6px;"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg></a>
        <p class="muted" style="font-size:12.5px; text-align:center; margin:14px 0 0;">Version {{ version }} · <a :href="releasesUrl" target="_blank" rel="noopener" style="color:inherit;">What’s new<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:-2px; margin-left:4px;"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg></a></p>
      </div>
    </div>

    <!-- edits-per-editor summary (from the persistent activity log) -->
    <div class="card" style="padding:20px; margin-top:20px;">
      <h3 style="margin:0 0 14px; font-size:16px;">Edits by editor</h3>
      <p v-if="!store.editors.length" class="muted" style="font-size:14px;">No edits recorded yet.</p>
      <div v-for="e in store.editors" :key="e.who" style="margin-bottom:12px;">
        <div style="display:flex; justify-content:space-between; align-items:baseline; gap:12px; font-size:13.5px; margin-bottom:4px;">
          <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; min-width:0;">{{ e.who }}</span>
          <span class="muted" style="white-space:nowrap;">{{ e.count }} edit{{ e.count === 1 ? '' : 's' }}</span>
        </div>
        <div style="height:8px; background:var(--line); border-radius:4px; overflow:hidden;">
          <div :style="{ width: barPct(e.count) + '%', height:'100%', background:'var(--violet)' }"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { store } from '../store.js'
import { config } from '../../config.js'
const version = __APP_VERSION__
const releasesUrl = config.releasesUrl
const analyticsUrl = config.analyticsUrl
const published = computed(() => store.locations.filter((l) => l.status === 'published').length)
const drafts = computed(() => store.locations.filter((l) => l.status !== 'published').length)
// bar chart: scale each editor's bar against the busiest editor
const maxEdits = computed(() => Math.max(1, ...store.editors.map((e) => e.count)))
function barPct(count) { return Math.round((count / maxEdits.value) * 100) }
// pull the durable activity feed + edit-count summary (all admins) when the dashboard opens
onMounted(() => { store.loadActivity(); store.loadEditorStats() })
// today → time, otherwise → date
function when(d) {
  if (!d) return ''
  const dt = d instanceof Date ? d : new Date(d)
  return dt.toDateString() === new Date().toDateString()
    ? dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : dt.toLocaleDateString()
}
</script>
