<!-- "Add to home screen" guide. Where the browser supports it (Android/desktop
     Chrome & Edge) it offers a real one-tap install. Otherwise it shows manual
     steps under iPhone / Android tabs – defaulting to the detected phone but
     letting the user switch, because no single instruction is right for every
     iOS version and Android browser. Opened from the banner and from Settings. -->
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

      <!-- One-tap where the browser offers it (Android/desktop Chrome & Edge) -->
      <button v-if="canOneTap" @click="oneTap" :style="cta">Install now</button>

      <!-- Otherwise: pick your phone, then follow the steps -->
      <template v-else>
        <div :style="tabs" role="tablist" aria-label="Choose your phone">
          <button :style="tabStyle('ios')" @click="platform='ios'" role="tab" :aria-selected="platform==='ios'">iPhone</button>
          <button :style="tabStyle('android')" @click="platform='android'" role="tab" :aria-selected="platform==='android'">Android</button>
        </div>
        <p :style="hint">Showing steps for <strong>{{ platform==='ios' ? 'iPhone' : 'Android' }}</strong>{{ detectedHint }} – tap the other if that's not your phone.</p>

        <!-- iPhone (Safari) -->
        <template v-if="platform==='ios'">
          <ol :style="steps">
            <li :style="step">
              <span :style="num">1</span>
              <span>In Safari's toolbar, tap the <strong>Share</strong>
                <span :style="chip" aria-hidden="true"><svg width="11" height="13" viewBox="0 0 14 18" fill="none" style="vertical-align:-2px;"><path d="M7 1 L7 11 M3.5 4.5 L7 1 L10.5 4.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 8 H1.5 V16.5 H12.5 V8 H11" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
                or <strong>•••</strong>
                <span :style="chip" aria-hidden="true"><svg width="15" height="6" viewBox="0 0 16 6" fill="currentColor"><circle cx="3" cy="3" r="1.7"/><circle cx="8" cy="3" r="1.7"/><circle cx="13" cy="3" r="1.7"/></svg></span>
                button.</span>
            </li>
            <li :style="step">
              <span :style="num">2</span>
              <span>Tap <strong>“Add to Home Screen”</strong>
                <span :style="chip" aria-hidden="true"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" style="vertical-align:-2px;"><rect x="4" y="4" width="16" height="16" rx="4.5" stroke="currentColor" stroke-width="1.8"/><path d="M12 9 V15 M9 12 H15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></span>
                – you may need to <strong>scroll down</strong> or tap <strong>“More”</strong> to see it.</span>
            </li>
            <li :style="step">
              <span :style="num">3</span>
              <span>Tap <strong>Add</strong>. It's now on your home screen, like any app.</span>
            </li>
          </ol>
          <p :style="footnote">On iPhone this only works in <strong>Safari</strong>, not other browsers.</p>
        </template>

        <!-- Android (menu wording varies a lot – stay generic) -->
        <ol v-else :style="steps">
          <li :style="step">
            <span :style="num">1</span>
            <span>Open your browser's <strong>menu</strong>
              <span :style="chip" aria-hidden="true"><svg width="4" height="16" viewBox="0 0 4 16" fill="currentColor" style="vertical-align:-3px;"><circle cx="2" cy="2" r="1.7"/><circle cx="2" cy="8" r="1.7"/><circle cx="2" cy="14" r="1.7"/></svg></span>
              – often three dots or lines near the address bar.</span>
          </li>
          <li :style="step">
            <span :style="num">2</span>
            <span>Find <strong>“Add to Home screen”</strong> (or “Install app”). You may need to tap <strong>“More”</strong> or a <strong>▾</strong> first – the wording differs by browser.</span>
          </li>
          <li :style="step">
            <span :style="num">3</span>
            <span>Confirm, and it's on your home screen.</span>
          </li>
        </ol>
      </template>

      <button @click="closeGuide" :style="ghost">Got it</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useInstall } from '../composables/useInstall.js'

const { deferred, isIOS, isStandalone, promptInstall, guideOpen, closeGuide } = useInstall()
const canOneTap = computed(() => !!deferred.value && !isStandalone)

// default the tab to the detected phone, but let the user switch
const platform = ref(isIOS ? 'ios' : 'android')
const detectedHint = computed(() => {
  const detected = isIOS ? 'ios' : 'android'
  return platform.value === detected ? ' (looks like your phone)' : ''
})

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
const tabs = { display: 'flex', gap: '6px', margin: '0 0 10px', background: 'var(--raised)', border: '1px solid var(--line)', borderRadius: '13px', padding: '4px' }
function tabStyle(p) {
  const on = platform.value === p
  return {
    flex: 1, padding: '9px 0', borderRadius: '9px', border: 'none', cursor: 'pointer',
    fontFamily: 'var(--font-button)', fontWeight: 700, fontSize: '14px',
    background: on ? 'var(--grad-warm)' : 'transparent', color: on ? 'var(--bg)' : 'var(--ink)',
  }
}
const hint = { fontSize: '12.5px', color: 'var(--ink-muted)', margin: '0 0 16px', textAlign: 'center' }
const footnote = { fontSize: '12.5px', color: 'var(--ink-muted)', margin: '-4px 0 16px' }
const steps = { listStyle: 'none', margin: '0 0 12px', padding: 0, display: 'flex', flexDirection: 'column', gap: '14px' }
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
