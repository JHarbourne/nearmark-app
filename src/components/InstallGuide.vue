<!-- Prominent "add to home screen" guide. On Android/Chrome it offers the
     one-tap native install; on iOS (no programmatic install exists) it shows a
     clear, illustrated step-by-step. Opened from the install banner and from
     Settings. Scrolls internally so nothing is ever trapped off-screen. -->
<template>
  <div v-if="guideOpen" style="position: absolute; inset: 0; z-index: 90;">
    <button @click="closeGuide" :style="scrim" aria-label="Dismiss" tabindex="-1"></button>
    <div :style="sheet" role="dialog" aria-modal="true" aria-label="Add to home screen">
      <span style="display:block; width:38px; height:4px; border-radius:2px; background:var(--grabber); margin:0 auto 16px;"></span>
      <button @click="closeGuide" :style="closeBtn" aria-label="Close">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M1 1 L11 11 M11 1 L1 11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
      </button>

      <span :style="iconWrap" aria-hidden="true">
        <img src="/icon-192.png" alt="" width="46" height="46" style="border-radius:11px; display:block;" />
      </span>
      <h2 style="font-family:var(--font-heading); font-weight:700; font-size:22px; margin:14px 0 6px; text-align:center;">Add to your home screen</h2>
      <p style="font-family:var(--font-body); font-size:14.5px; line-height:1.5; color:var(--ink-soft); margin:0 auto 20px; max-width:320px; text-align:center;">
        The full app – <strong>no App Store needed</strong>. Once it's on your home screen it opens full-screen and works offline, just like any app.
      </p>

      <!-- Android / Chrome: real one-tap install -->
      <button v-if="canOneTap" @click="oneTap" :style="cta">Install now</button>

      <!-- iOS / manual: clear numbered steps -->
      <ol v-else :style="steps">
        <li :style="step">
          <span :style="num">1</span>
          <span>Tap the <strong>Share</strong> button
            <span :style="chip" aria-hidden="true"><svg width="11" height="13" viewBox="0 0 14 18" fill="none" style="vertical-align:-2px;"><path d="M7 1 L7 11 M3.5 4.5 L7 1 L10.5 4.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 8 H1.5 V16.5 H12.5 V8 H11" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
            – it's at the <strong>bottom</strong> of the screen in Safari.</span>
        </li>
        <li :style="step">
          <span :style="num">2</span>
          <span>Scroll down the list and tap <strong>“Add to Home Screen”</strong>
            <span :style="chip" aria-hidden="true"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" style="vertical-align:-2px;"><rect x="4" y="4" width="16" height="16" rx="4.5" stroke="currentColor" stroke-width="1.8"/><path d="M12 9 V15 M9 12 H15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></span>.
          </span>
        </li>
        <li :style="step">
          <span :style="num">3</span>
          <span>Tap <strong>Add</strong>. That's it – open it from your home screen any time.</span>
        </li>
      </ol>

      <button @click="closeGuide" :style="ghost">Got it</button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useInstall } from '../composables/useInstall.js'

const { deferred, isStandalone, promptInstall, guideOpen, closeGuide } = useInstall()
const canOneTap = computed(() => !!deferred.value && !isStandalone)

async function oneTap() {
  const outcome = await promptInstall()
  if (outcome === 'accepted') closeGuide()
}

const scrim = { position: 'absolute', inset: 0, background: 'rgba(10,7,14,0.6)', border: 'none', cursor: 'pointer' }
const sheet = {
  position: 'absolute', bottom: 0, left: 0, right: 0, maxHeight: '86dvh', overflowY: 'auto',
  WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain',
  background: 'var(--card)', borderRadius: '26px 26px 0 0',
  padding: '14px 22px max(30px, env(safe-area-inset-bottom))', boxShadow: '0 -10px 50px rgba(0,0,0,0.6)',
  animation: 'sheetUp .28s ease',
}
const closeBtn = {
  position: 'absolute', top: '14px', right: '16px', width: '30px', height: '30px', borderRadius: '50%',
  border: 'none', background: 'var(--line)', color: 'var(--ink)', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}
const iconWrap = { display: 'flex', width: '46px', margin: '0 auto', justifyContent: 'center' }
const cta = {
  width: '100%', height: '56px', border: 'none', borderRadius: '16px', cursor: 'pointer',
  fontFamily: 'var(--font-button)', fontWeight: 700, fontSize: '17px', color: 'var(--bg)',
  background: 'var(--grad-warm)', marginBottom: '12px',
}
const steps = { listStyle: 'none', margin: '0 0 18px', padding: 0, display: 'flex', flexDirection: 'column', gap: '14px' }
const step = { display: 'flex', gap: '13px', alignItems: 'flex-start', fontFamily: 'var(--font-body)', fontSize: '15px', lineHeight: 1.5, color: 'var(--ink)' }
const num = {
  flexShrink: 0, width: '26px', height: '26px', borderRadius: '50%', background: 'var(--raised)',
  border: '1px solid var(--line)', color: 'var(--ink)', fontFamily: 'var(--font-button)', fontWeight: 700,
  fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '1px',
}
const chip = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '22px', height: '22px',
  borderRadius: '6px', background: 'var(--raised)', border: '1px solid var(--line)', verticalAlign: '-6px',
}
const ghost = {
  width: '100%', height: '50px', border: '1px solid var(--line)', borderRadius: '16px', cursor: 'pointer',
  fontFamily: 'var(--font-button)', fontWeight: 600, fontSize: '15px', color: 'var(--ink)', background: 'none',
}
</script>
