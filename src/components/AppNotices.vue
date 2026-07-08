<!-- Slim status banners at the top of the app:
     • Offline notice – shown while the device is offline, so a visitor knows why
       photos that weren't pre-cached may not appear.
     • Update notice – shown when a newer release has been deployed. It compares the
       running build's baked version against a freshly-fetched /version.json, so it
       only fires when package.json is bumped (i.e. at a release), NOT on every
       edit-time deploy. Dismissible per-version so it never nags. -->
<template>
  <div v-if="offline || updateReady" class="app-notices">
    <div v-if="offline" class="app-notice app-notice--offline" role="status">
      You’re offline – photos may not load until you reconnect.
    </div>
    <div v-if="updateReady" class="app-notice app-notice--update">
      <button type="button" class="update-main" @click="applyUpdate">A new version is available – tap to update</button>
      <button type="button" class="update-x" aria-label="Dismiss update notice" @click="dismissUpdate">✕</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

const offline = ref(typeof navigator !== 'undefined' && navigator.onLine === false)
const updateReady = ref(false)
let newVersion = null

function goOnline() { offline.value = false }
function goOffline() { offline.value = true }

// numeric semver compare: is a strictly newer than b? (missing parts → 0)
function isNewer(a, b) {
  const pa = String(a).split('.').map((n) => parseInt(n, 10) || 0)
  const pb = String(b).split('.').map((n) => parseInt(n, 10) || 0)
  for (let i = 0; i < 3; i++) { if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) > (pb[i] || 0) }
  return false
}

async function checkVersion() {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return
  const running = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : null
  if (!running) return
  try {
    const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' })
    if (!res.ok) return
    const { version } = await res.json()
    let seen = null
    try { seen = localStorage.getItem('nm-update-seen') } catch { /* private mode */ }
    if (version && isNewer(version, running) && seen !== version) {
      newVersion = version
      updateReady.value = true
    }
  } catch { /* best-effort – ignore */ }
}

function applyUpdate() { window.location.reload() }
function dismissUpdate() {
  try { if (newVersion) localStorage.setItem('nm-update-seen', newVersion) } catch { /* ignore */ }
  updateReady.value = false
}

function onVisible() { if (!document.hidden) checkVersion() }

onMounted(() => {
  window.addEventListener('online', goOnline)
  window.addEventListener('offline', goOffline)
  document.addEventListener('visibilitychange', onVisible)
  checkVersion()
})
onBeforeUnmount(() => {
  window.removeEventListener('online', goOnline)
  window.removeEventListener('offline', goOffline)
  document.removeEventListener('visibilitychange', onVisible)
})
</script>

<style scoped>
.app-notices { position: absolute; top: 0; left: 0; right: 0; z-index: 200; }
.app-notice {
  padding: 8px 14px; font-family: var(--font-ui); font-size: 12.5px; font-weight: 600;
  text-align: center; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.22);
}
/* The topmost banner extends up behind the status bar and insets its own content
   by the safe-area, so it never covers the phone's clock/battery. In a normal
   browser tab env(safe-area-inset-top) is 0, so this is a no-op there. */
.app-notice:first-child { padding-top: calc(8px + env(safe-area-inset-top)); }
.app-notice--offline { background: var(--ink); color: var(--bg); }
.app-notice--update { background: var(--accent); color: #fff; display: flex; align-items: center; gap: 8px; padding: 0; }
/* The update bar's height comes from its buttons (padding: 0 here), so when it's
   the topmost banner only the safe-area inset goes on top; the buttons sit below it. */
.app-notice--update:first-child { padding-top: env(safe-area-inset-top); }
.update-main { flex: 1; background: none; border: none; color: inherit; font: inherit; padding: 8px 14px; cursor: pointer; text-align: center; }
.update-x { background: none; border: none; color: inherit; font-size: 13px; cursor: pointer; padding: 8px 12px; opacity: 0.85; }
</style>
