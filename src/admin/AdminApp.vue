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
        <div class="muted" style="font-size:12px;">Admin</div>
        <a href="/" target="_blank" class="navlink" style="display:block; margin-top:10px; padding-left:0;">View live app<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:-2px; margin-left:5px;"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg></a>
        <a v-if="feedbackUrl" :href="feedbackUrl + '?area=admin'" target="_blank" rel="noopener" class="navlink" style="display:block; padding-left:0;">Suggest an improvement<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:-2px; margin-left:5px;"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg></a>
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
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { store } from './store.js'
import { config } from '../config.js'
const feedbackUrl = config.feedbackUrl
import Login from './views/Login.vue'
import SetPassword from './views/SetPassword.vue'
import Dashboard from './views/Dashboard.vue'
import LocationsList from './views/LocationsList.vue'
import LocationEditor from './views/LocationEditor.vue'
import StoryEditor from './views/StoryEditor.vue'
import ToursList from './views/ToursList.vue'
import TourEditor from './views/TourEditor.vue'
import MediaLibrary from './views/MediaLibrary.vue'
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
  { route: 'users', label: 'User management' },
]
const views = { dashboard: Dashboard, locations: LocationsList, locationEditor: LocationEditor, story: StoryEditor, tours: ToursList, tourEditor: TourEditor, media: MediaLibrary, users: UserManagement }
const view = computed(() => views[store.route] || Dashboard)

// mobile drawer
const menuOpen = ref(false)
function navigate(route) { store.go(route); menuOpen.value = false }
function onKey(e) { if (e.key === 'Escape') menuOpen.value = false }

onMounted(() => {
  store.init()
  document.addEventListener('keydown', onKey)
})
onUnmounted(() => document.removeEventListener('keydown', onKey))
</script>
