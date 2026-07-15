<!-- Admin backoffice shell: login gate + sidebar nav + state-driven view router. -->
<template>
  <SetPassword v-if="store.recoveryMode" />
  <Login v-else-if="!store.authed" />
  <div v-else class="admin-shell">
    <!-- mobile top bar with burger (hidden on desktop via CSS) -->
    <header class="admin-topbar">
      <button class="burger" @click="menuOpen = true" :aria-expanded="String(menuOpen)" aria-controls="admin-sidebar" aria-label="Open menu">☰</button>
      <span class="brand" style="margin:0;">
        <span class="rainbow"><i v-for="c in bars" :key="c" :style="{ background: c }"></i></span>
        Admin
      </span>
    </header>

    <button v-if="menuOpen" class="sidebar-scrim" @click="menuOpen = false" aria-label="Close menu" tabindex="-1"></button>

    <aside id="admin-sidebar" class="sidebar" :class="{ open: menuOpen }">
      <div class="brand">
        <span class="rainbow">
          <i v-for="c in bars" :key="c" :style="{ background: c }"></i>
        </span>
        Admin
      </div>
      <nav style="display:flex; flex-direction:column; gap:2px;">
        <button v-for="item in nav" :key="item.route"
          class="navlink" :class="{ active: store.route === item.route }"
          @click="navigate(item.route)">
          {{ item.label }}
        </button>
      </nav>
      <div style="margin-top:auto; padding:12px 8px; font-size:13px;">
        <div style="font-weight:600; word-break:break-all;">{{ store.user?.email }}</div>
        <div class="muted" style="font-size:12px;">{{ store.isSuperAdmin ? 'Super Admin' : store.isEditor ? 'Editor' : 'Admin' }}</div>
        <button class="navlink" style="padding-left:0; margin-top:8px; display:flex; align-items:center; gap:7px;" @click="openBell" :aria-label="`Notifications${store.unreadCount ? ', ' + store.unreadCount + ' unread' : ''}`">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:-2px;"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          Notifications
          <span v-if="store.unreadCount" style="min-width:18px; height:18px; padding:0 5px; border-radius:9px; background:var(--red,#e5484d); color:#fff; font-size:11px; font-weight:700; display:inline-flex; align-items:center; justify-content:center;">{{ store.unreadCount }}</span>
        </button>
        <a href="/" target="_blank" class="navlink" style="display:block; margin-top:10px; padding-left:0;">View live<span style="white-space:nowrap;">app<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:-2px; margin-left:5px;"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg></span></a>
        <a v-if="feedbackUrl" :href="feedbackUrl + '?area=admin'" target="_blank" rel="noopener" class="navlink" style="display:block; padding-left:0;">Suggest an <span style="white-space:nowrap;">improvement<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:-2px; margin-left:5px;"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg></span></a>
        <button class="navlink" style="padding-left:0;" @click="store.signOut()">Sign out</button>
        <p class="muted" style="font-size:11.5px; margin:16px 0 0; color:var(--ink-faint);">Powered by <a v-if="platformUrl" :href="platformUrl" target="_blank" rel="noopener" style="color:inherit;">{{ platformName }}</a><span v-else>{{ platformName }}</span> · v{{ version }}</p>
      </div>
    </aside>

    <main class="main">
      <div v-if="!store.liveBackend" class="demo-banner">
        Supabase is not configured – set <code>VITE_SUPABASE_URL</code> / <code>VITE_SUPABASE_ANON_KEY</code> to enable login and editing.
      </div>
      <component :is="view" />
    </main>

    <!-- unsaved-changes guard: a clear Save / Don't save / Cancel choice (replaces the
         ambiguous native "Cancel / OK" confirm). Save actually saves, then continues. -->
    <!-- eslint-disable-next-line vuejs-accessibility/no-static-element-interactions -- modal backdrop: Esc + click-outside are keyboard/pointer shortcuts; the Cancel button is the accessible path -->
    <div v-if="store.pendingNav" role="dialog" aria-modal="true" aria-labelledby="unsaved-title"
      style="position:fixed; inset:0; z-index:200; display:flex; align-items:center; justify-content:center; padding:20px; background:rgba(20,16,28,0.45);"
      @keydown.esc="store.navCancel()" @click.self="store.navCancel()">
      <div style="background:var(--card,#fff); color:var(--ink); border:1px solid var(--line); border-radius:16px; padding:22px 22px 18px; max-width:430px; width:100%; box-shadow:0 20px 60px rgba(0,0,0,0.35);">
        <h2 id="unsaved-title" style="margin:0 0 6px; font-size:18px;">Unsaved changes</h2>
        <p class="muted" style="margin:0 0 20px; font-size:14px; line-height:1.5;">You've made changes on this page. Save them before leaving?</p>
        <div style="display:flex; justify-content:flex-end; gap:10px; flex-wrap:wrap;">
          <button class="btn btn-ghost" @click="store.navCancel()">Cancel</button>
          <button class="btn btn-danger" @click="store.navDiscard()">Don't save</button>
          <button ref="saveBtn" class="btn btn-primary" @click="store.navSave()">Save</button>
        </div>
      </div>
    </div>

    <!-- notifications panel (Phase 2 RBAC): anchored bottom-left, over the sidebar -->
    <!-- eslint-disable-next-line vuejs-accessibility/no-static-element-interactions -- backdrop: click-outside closes; the list items + close button are the accessible paths -->
    <div v-if="bellOpen" style="position:fixed; inset:0; z-index:180;" @click.self="bellOpen = false" @keydown.esc="bellOpen = false">
      <div style="position:absolute; left:16px; bottom:16px; width:340px; max-width:calc(100vw - 32px); max-height:70vh; display:flex; flex-direction:column; background:var(--card,#fff); color:var(--ink); border:1px solid var(--line); border-radius:14px; box-shadow:0 20px 60px rgba(0,0,0,0.3); overflow:hidden;">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; padding:12px 14px; border-bottom:1px solid var(--line);">
          <strong style="font-size:14px;">Notifications</strong>
          <span style="display:flex; gap:6px;">
            <button v-if="store.unreadCount" class="btn btn-ghost btn-sm" @click="store.markNotificationsRead()">Mark all read</button>
            <button class="btn btn-ghost btn-sm" @click="bellOpen = false" aria-label="Close">✕</button>
          </span>
        </div>
        <div style="overflow-y:auto;">
          <p v-if="!store.notifications.length" class="muted" style="padding:18px 14px; font-size:13px; margin:0;">Nothing yet. You'll be told here when someone edits one of your locations.</p>
          <button v-for="n in store.notifications" :key="n.id" class="notif-item" @click="openNotif(n)"
            style="display:block; width:100%; text-align:left; padding:11px 14px; border:none; border-bottom:1px solid var(--line); background:none; color:inherit; cursor:pointer;">
            <span style="display:flex; gap:8px; align-items:flex-start;">
              <span :style="{ flexShrink:0, width:'8px', height:'8px', borderRadius:'50%', marginTop:'5px', background: n.readAt ? 'transparent' : 'var(--violet,#6b46e5)' }"></span>
              <span style="flex:1; min-width:0;">
                <span style="display:block; font-size:13px; line-height:1.45;">{{ n.message }}</span>
                <span class="muted" style="display:block; font-size:11.5px; margin-top:2px;">{{ relTime(n.createdAt) }}</span>
              </span>
            </span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch, nextTick } from 'vue'
import { store } from './store.js'
import { config } from '../config.js'
const feedbackUrl = config.feedbackUrl

// focus the Save button when the unsaved-changes dialog opens (Enter = Save, Esc = Cancel)
const saveBtn = ref(null)
watch(() => store.pendingNav, (v) => { if (v) nextTick(() => saveBtn.value?.focus()) })
import Login from './views/Login.vue'
import SetPassword from './views/SetPassword.vue'
import Dashboard from './views/Dashboard.vue'
import LocationsList from './views/LocationsList.vue'
import LocationEditor from './views/LocationEditor.vue'
import StoryEditor from './views/StoryEditor.vue'
import ToursList from './views/ToursList.vue'
import TourEditor from './views/TourEditor.vue'
import MediaLibrary from './views/MediaLibrary.vue'
import Analytics from './views/Analytics.vue'
import UserManagement from './views/UserManagement.vue'

const bars = config.brandBars // themed per deployment (matches the login + public app)
const platformName = config.platformName
const platformUrl = config.platformUrl
const version = __APP_VERSION__
const nav = [
  { route: 'dashboard', label: 'Dashboard' },
  { route: 'locations', label: 'Locations' },
  { route: 'tours', label: 'Tours' },
  { route: 'media', label: 'Media library' },
  { route: 'analytics', label: 'Analytics' },
  { route: 'users', label: 'User management' },
]
const views = { dashboard: Dashboard, locations: LocationsList, locationEditor: LocationEditor, story: StoryEditor, tours: ToursList, tourEditor: TourEditor, media: MediaLibrary, analytics: Analytics, users: UserManagement }
const view = computed(() => views[store.route] || Dashboard)

// mobile drawer
const menuOpen = ref(false)
function navigate(route) { store.go(route); menuOpen.value = false }

// notifications bell (Phase 2 RBAC)
const bellOpen = ref(false)
function openBell() { bellOpen.value = true; store.refreshNotifications() }
function openNotif(n) {
  bellOpen.value = false
  if (n.entityType === 'location') {
    const loc = store.locations.find((l) => l.recordId === n.entityId)
    store.go(loc ? 'locationEditor' : 'locations', loc ? { id: loc.id } : {})
  }
}
function relTime(d) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`
  const days = Math.floor(h / 24); if (days < 7) return `${days}d ago`
  return new Date(d).toLocaleDateString()
}
function onKey(e) { if (e.key === 'Escape') menuOpen.value = false }

onMounted(() => {
  store.init()
  document.addEventListener('keydown', onKey)
})
onUnmounted(() => document.removeEventListener('keydown', onKey))
</script>
