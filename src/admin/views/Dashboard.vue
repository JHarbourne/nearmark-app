<!-- A2 Dashboard (BRD §11.2): stats row, recent activity, quick links.
     Fills the viewport; the activity log scrolls within its own panel rather
     than growing the whole page. -->
<template>
  <div class="dashboard">
    <div class="pagehead" style="flex-shrink:0;"><h1>Dashboard</h1></div>

    <!-- stat cards double as shortcuts to the matching list -->
    <div class="statgrid" style="flex-shrink:0;">
      <button type="button" class="card stat statlink" @click="store.go('locations')" aria-label="View all locations"><div class="n">{{ store.locations.length }}</div><div class="l">Total locations</div></button>
      <button type="button" class="card stat statlink" @click="store.go('tours')" aria-label="View all tours"><div class="n">{{ store.tours.length }}</div><div class="l">Total tours</div></button>
      <button type="button" class="card stat statlink" @click="store.go('locations')" aria-label="View locations (published)"><div class="n">{{ published }}</div><div class="l">Published locations</div></button>
      <button type="button" class="card stat statlink" @click="store.go('locations')" aria-label="View locations (drafts)"><div class="n">{{ drafts }}</div><div class="l">Draft locations</div></button>
    </div>

    <div class="dash-mid">
      <!-- Recent activity: the one growing list — scrolls inside its card -->
      <div class="card activity-card">
        <h3 style="margin:0 0 14px; font-size:16px; flex-shrink:0;">Recent activity</h3>
        <div class="activity-scroll">
          <p v-if="!store.activity.length" class="muted" style="font-size:14px;">No activity yet this session.</p>
          <div v-for="(a, i) in store.activity" :key="i" style="display:flex; justify-content:space-between; padding:9px 0; border-bottom:1px solid var(--line); font-size:14px;">
            <span><strong>{{ a.action }}</strong> · {{ a.title }}</span>
            <span class="muted" style="white-space:nowrap; padding-left:12px;">{{ a.who }} · {{ when(a.at) }}</span>
          </div>
        </div>
      </div>

      <!-- right rail: quick links + edits-by-editor -->
      <div class="dash-side">
        <div class="card" style="padding:20px;">
          <h3 style="margin:0 0 14px; font-size:16px;">Quick links</h3>
          <button class="btn btn-primary" style="width:100%; margin-bottom:10px;" @click="store.go('locationEditor', { id: null })">+ Add location</button>
          <button class="btn btn-ghost" style="width:100%; margin-bottom:10px;" @click="store.go('tourEditor', { id: null })">+ Add tour</button>
          <a class="btn btn-ghost" style="width:100%; display:block; text-align:center; text-decoration:none;" href="/" target="_blank">View live <span style="white-space:nowrap;">app<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:-2px; margin-left:6px;"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg></span></a>
          <button class="btn btn-ghost" style="width:100%; margin-top:10px;" @click="store.go('analytics')">View analytics</button>
          <p class="muted" style="font-size:12.5px; text-align:center; margin:14px 0 0;">Version {{ version }} · <a :href="releasesUrl" target="_blank" rel="noopener" style="color:inherit; white-space:nowrap;">What’s new<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:-2px; margin-left:4px;"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg></a></p>
        </div>

        <!-- edits-per-editor summary (from the persistent activity log) -->
        <div class="card" style="padding:20px;">
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
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { store } from '../store.js'
import { config } from '../../config.js'
const version = __APP_VERSION__
const releasesUrl = config.releasesUrl
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

<style scoped>
/* Fill the main content area; only the activity log scrolls. `.main` has 28px top
   + 64px bottom padding on desktop (= 92px). */
.dashboard { display: flex; flex-direction: column; gap: 20px; height: calc(100dvh - 92px); }
.dashboard .statgrid { margin-bottom: 0; }
.dash-mid { flex: 1; min-height: 0; display: grid; grid-template-columns: 1.4fr 1fr; gap: 20px; align-items: stretch; }
.activity-card { padding: 20px; display: flex; flex-direction: column; min-height: 0; }
.activity-scroll { flex: 1; overflow-y: auto; min-height: 0; }
.dash-side { display: flex; flex-direction: column; gap: 20px; min-height: 0; overflow-y: auto; }

/* On mobile the shell stacks and the top bar appears — let the page flow/scroll
   normally rather than forcing a fixed height. */
@media (max-width: 860px) {
  .dashboard { height: auto; }
  .dash-mid { grid-template-columns: 1fr; }
  .activity-scroll { max-height: 60vh; }
}
</style>
