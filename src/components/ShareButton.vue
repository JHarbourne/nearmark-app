<!-- Share this app. Uses the native Web Share API when available (mobile),
     otherwise opens a QR + copy-link sheet (desktop). Works for any deployment:
     URL is VITE_PUBLIC_URL or the current origin. No tracking, no cookies. -->
<template>
  <!-- settings-row variant -->
  <button v-if="variant === 'row'" @click="onShare" :style="rowStyle" aria-label="Share this app">
    <span style="font-size: 15px; font-weight: 600;">Share this app</span>
    <span :style="rowIcon" aria-hidden="true">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="18" cy="5" r="2.6" stroke="currentColor" stroke-width="1.9"/><circle cx="6" cy="12" r="2.6" stroke="currentColor" stroke-width="1.9"/><circle cx="18" cy="19" r="2.6" stroke="currentColor" stroke-width="1.9"/><path d="M8.4 10.7 L15.6 6.3 M8.4 13.3 L15.6 17.7" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>
    </span>
  </button>
  <!-- icon-button variant (header / top bar) -->
  <button v-else @click="onShare" :style="iconBtn" aria-label="Share this app" title="Share this app">
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="18" cy="5" r="2.6" stroke="currentColor" stroke-width="1.9"/><circle cx="6" cy="12" r="2.6" stroke="currentColor" stroke-width="1.9"/><circle cx="18" cy="19" r="2.6" stroke="currentColor" stroke-width="1.9"/><path d="M8.4 10.7 L15.6 6.3 M8.4 13.3 L15.6 17.7" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>
  </button>

  <Teleport to=".phone-frame">
    <ShareSheet v-if="sheetOpen" :url="shareUrl" @close="sheetOpen = false" />
  </Teleport>
</template>

<script setup>
import { ref, computed } from 'vue'
import ShareSheet from './ShareSheet.vue'
import { config } from '../config.js'

defineProps({ variant: { type: String, default: 'icon' } }) // 'icon' | 'row'

const sheetOpen = ref(false)
const shareUrl = computed(() => config.publicUrl || (typeof window !== 'undefined' ? window.location.origin : ''))

// Always open our own sheet. For a walking-tour app, the scannable QR code is the
// whole point of sharing in person, so it must be reachable on phones too – the
// sheet still offers a native "Share…" button for the digital route.
function onShare() { sheetOpen.value = true }

const iconBtn = {
  width: '38px', height: '38px', flexShrink: 0, borderRadius: '50%', border: '1px solid var(--line)',
  background: 'var(--raised)', color: 'var(--ink)', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}
const rowStyle = {
  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0',
  borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderBottom: '1px solid var(--line)',
  background: 'none', cursor: 'pointer', color: 'inherit', textAlign: 'left',
}
const rowIcon = { display: 'flex', color: 'var(--accent)' }
</script>

<style scoped>
button:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
</style>
