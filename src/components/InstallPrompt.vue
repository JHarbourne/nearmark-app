<!-- Add-to-home-screen banner on the cover. One-tap Install where the browser
     supports it (Android/desktop Chrome & Edge); tapping the banner body opens
     the fuller step-by-step guide (essential on iOS, where install is manual).
     Dismissible (remembered), never shown once the app is already installed. -->
<template>
  <div v-if="show" :style="wrap" role="dialog" aria-label="Install this app">
    <button @click="openGuide" :style="body" aria-label="How to add this app to your home screen">
      <img src="/icon-192.png" alt="" width="40" height="40" style="border-radius:9px; display:block; flex-shrink:0;" />
      <span style="flex:1; min-width:0;">
        <span style="display:block; font-family:var(--font-button); font-weight:700; font-size:15px;">Install this app</span>
        <span style="display:block; font-size:12.5px; color:var(--ink-muted); margin-top:2px;">{{ subtitle }}</span>
      </span>
    </button>

    <button v-if="!iosInstall" @click.stop="install" :style="cta">Install</button>
    <button @click.stop="dismiss" :style="closeBtn" aria-label="Dismiss install banner">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M1 1 L11 11 M11 1 L1 11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
    </button>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useInstall } from '../composables/useInstall.js'

const KEY = 'nearmark-install-dismissed'
const { deferred, isIOS, isSafari, isStandalone, promptInstall, openGuide } = useInstall()
const dismissed = ref(localStorage.getItem(KEY) === '1')

// iOS Safari has no programmatic install – the guide walks through the Share menu.
const iosInstall = computed(() => isIOS && isSafari && !isStandalone)
const show = computed(() => !isStandalone && !dismissed.value && (!!deferred.value || iosInstall.value))
const subtitle = computed(() => (iosInstall.value
  ? 'No App Store needed – tap to see how.'
  : 'The full app – no App Store needed. Works offline.'))

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
const body = {
  display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0,
  background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'inherit', textAlign: 'left',
}
const cta = {
  flexShrink: 0, height: '38px', padding: '0 16px', borderRadius: '11px', border: 'none', cursor: 'pointer',
  fontFamily: 'var(--font-button)', fontWeight: 700, fontSize: '14px', color: 'var(--bg)',
  background: 'var(--grad-warm)',
}
const closeBtn = {
  flexShrink: 0, width: '28px', height: '28px', borderRadius: '50%', border: 'none',
  background: 'var(--line)', color: 'var(--ink)', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}
</script>
