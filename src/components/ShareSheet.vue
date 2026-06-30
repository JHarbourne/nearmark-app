<!-- Share fallback sheet – shown when the Web Share API is unavailable (most
     desktops). Offers a brand-coloured QR code and a copy-link button so a
     visitor can pass the app on. No tracking, no cookies, no network calls. -->
<template>
  <div style="position: absolute; inset: 0; z-index: 90;">
    <button @click="$emit('close')" :style="scrim" aria-label="Close share" tabindex="-1"></button>
    <!-- eslint-disable-next-line vuejs-accessibility/no-static-element-interactions -- keydown on the dialog implements the focus trap + ESC-to-close (WCAG 2.1.2 / 2.4.3) -->
    <div ref="dialog" :style="sheet" role="dialog" aria-modal="true" aria-labelledby="share-title" @keydown="onKeydown">
      <span style="display: block; width: 38px; height: 4px; border-radius: 2px; background: var(--grabber); margin: 0 auto 16px;"></span>
      <button ref="closeRef" @click="$emit('close')" :style="closeBtn" aria-label="Close">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M1 1 L11 11 M11 1 L1 11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
      </button>

      <h2 id="share-title" style="font-family: var(--font-heading); font-weight: 700; font-size: 22px; margin: 0 0 4px; text-align: center;">Share {{ appName }}</h2>
      <p style="font-family: var(--font-body); font-size: 14.5px; line-height: 1.5; color: var(--ink-muted); margin: 0 auto 18px; max-width: 280px; text-align: center;">Scan the code or copy the link to pass the app on.</p>

      <div :style="qrTile">
        <qrcode-vue :value="url" :size="184" render-as="svg" :foreground="qrFg" :background="qrBg" level="M" :margin="1" role="img" :aria-label="`QR code linking to ${displayUrl}`" />
      </div>

      <div :style="urlRow"><span :style="urlText">{{ displayUrl }}</span></div>

      <button @click="copy" :style="copyBtn">
        <svg v-if="!copied" width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2.4" stroke="currentColor" stroke-width="1.9"/><path d="M5 15 H4.5 A1.5 1.5 0 0 1 3 13.5 V4.5 A1.5 1.5 0 0 1 4.5 3 H13.5 A1.5 1.5 0 0 1 15 4.5 V5" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>
        <svg v-else width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12.5 L10 17.5 L19.5 7" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
        {{ copied ? 'Copied' : 'Copy link' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import QrcodeVue from 'qrcode.vue'
import { config } from '../config.js'
import { COLORS } from '../lib/tokens.js'

const props = defineProps({ url: { type: String, required: true } })
const emit = defineEmits(['close'])

const appName = config.appName
// Brand-coloured QR on a white tile – the accent is dark enough on white to scan
// reliably for the bundled themes; keep client accents reasonably dark.
const qrFg = COLORS.accent
const qrBg = '#ffffff'
const displayUrl = computed(() => props.url.replace(/^https?:\/\//, '').replace(/\/$/, ''))

const copied = ref(false)
async function copy() {
  try {
    await navigator.clipboard.writeText(props.url)
    copied.value = true
    setTimeout(() => { copied.value = false }, 1800)
  } catch { /* clipboard unavailable / blocked – the URL is shown as text to copy manually */ }
}

// ── focus trap (WCAG 2.4.3 / 2.1.2): keep Tab inside the dialog, ESC closes,
//    restore focus to the trigger on close ──
const dialog = ref(null)
const closeRef = ref(null)
let lastFocused = null
function focusables() {
  if (!dialog.value) return []
  return [...dialog.value.querySelectorAll('button, a[href], [tabindex]:not([tabindex="-1"])')]
    .filter((el) => !el.disabled && el.offsetParent !== null)
}
function onKeydown(e) {
  if (e.key === 'Escape') { e.preventDefault(); emit('close'); return }
  if (e.key !== 'Tab') return
  const f = focusables(); if (!f.length) return
  const first = f[0], last = f[f.length - 1]
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
}
onMounted(() => { lastFocused = document.activeElement; closeRef.value?.focus({ preventScroll: true }) })
onBeforeUnmount(() => { lastFocused?.focus?.() })

const scrim = { position: 'absolute', inset: 0, background: 'rgba(10,7,14,0.6)', border: 'none', cursor: 'pointer' }
const sheet = { position: 'absolute', bottom: 0, left: 0, right: 0, background: 'var(--card)', borderRadius: '26px 26px 0 0', padding: '14px 22px 30px', boxShadow: '0 -10px 50px rgba(0,0,0,0.6)', animation: 'sheetUp .28s ease' }
const closeBtn = { position: 'absolute', top: '14px', right: '16px', width: '30px', height: '30px', borderRadius: '50%', border: 'none', background: 'var(--line)', color: 'var(--ink)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }
const qrTile = { width: 'fit-content', margin: '0 auto 16px', padding: '14px', background: '#ffffff', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.08)', display: 'flex' }
const urlRow = { display: 'flex', justifyContent: 'center', margin: '0 0 16px' }
const urlText = { fontFamily: 'var(--font-ui)', fontSize: '13px', color: 'var(--ink-muted)', background: 'var(--raised)', borderRadius: '9px', padding: '8px 12px', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
const copyBtn = { width: '100%', height: '50px', border: 'none', borderRadius: '14px', cursor: 'pointer', fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '15px', color: 'var(--bg)', background: 'var(--grad-warm)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '9px' }
</script>

<style scoped>
button:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 12px; }
</style>
