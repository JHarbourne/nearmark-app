<!-- Add-to-home-screen banner. Shows a one-tap Install button where the browser
     supports it (Android/desktop Chrome & Edge), or iOS "Add to Home Screen"
     instructions where install is manual. Dismissible (remembered), and never
     shown once the app is already installed. -->
<template>
  <div v-if="show" :style="wrap" role="dialog" aria-label="Install this app">
    <span :style="iconWrap" aria-hidden="true">
      <img src="/icon-192.png" alt="" width="40" height="40" style="border-radius:9px; display:block;" />
    </span>

    <span style="flex: 1; min-width: 0;">
      <span style="display: block; font-family: var(--font-button); font-weight: 700; font-size: 15px;">Install this app</span>
      <span v-if="iosInstall" style="display: block; font-size: 12.5px; color: var(--ink-muted); margin-top: 2px;">
        Tap <span :style="shareChip">Share <svg width="11" height="13" viewBox="0 0 14 18" fill="none" aria-hidden="true" style="vertical-align:-2px;"><path d="M7 1 L7 11 M3.5 4.5 L7 1 L10.5 4.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 8 H1.5 V16.5 H12.5 V8 H11" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span> then “Add to Home Screen”.
      </span>
      <span v-else style="display: block; font-size: 12.5px; color: var(--ink-muted); margin-top: 2px;">Full-screen, on your home screen, works offline.</span>
    </span>

    <button v-if="!iosInstall" @click="install" :style="cta">Install</button>
    <button @click="dismiss" :style="closeBtn" aria-label="Dismiss install banner">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M1 1 L11 11 M11 1 L1 11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
    </button>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useInstall } from '../composables/useInstall.js'

const KEY = 'nearmark-install-dismissed'
const { deferred, isIOS, isSafari, isStandalone, promptInstall } = useInstall()
const dismissed = ref(localStorage.getItem(KEY) === '1')

// iOS Safari has no programmatic install – guide the user to the Share menu.
const iosInstall = computed(() => isIOS && isSafari && !isStandalone)
const show = computed(() => !isStandalone && !dismissed.value && (!!deferred.value || iosInstall.value))

async function install() {
  const outcome = await promptInstall()
  if (outcome === 'accepted') dismiss()
}
function dismiss() {
  dismissed.value = true
  try { localStorage.setItem(KEY, '1') } catch { /* private mode */ }
}

const wrap = {
  display: 'flex', alignItems: 'center', gap: '12px', margin: '16px 0 0', padding: '12px 14px', borderRadius: '16px',
  background: 'var(--raised)', border: '1px solid var(--line)', color: 'var(--ink)',
}
const iconWrap = { flexShrink: 0, display: 'block' }
const shareChip = { whiteSpace: 'nowrap', fontWeight: 600, color: 'var(--ink)' }
const cta = {
  flexShrink: 0, height: '38px', padding: '0 16px', borderRadius: '11px', border: 'none', cursor: 'pointer',
  fontFamily: "var(--font-button)", fontWeight: 700, fontSize: '14px', color: 'var(--bg)',
  background: 'var(--grad-warm)',
}
const closeBtn = {
  flexShrink: 0, width: '28px', height: '28px', borderRadius: '50%', border: 'none',
  background: 'var(--line)', color: 'var(--ink)', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}
</script>
