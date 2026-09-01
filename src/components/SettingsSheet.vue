<!-- Settings sheet (BRD §9.1 screen 10, §10 "Settings") – verbatim from the
     prototype, now wired to real permission status + persisted localStorage. -->
<template>
  <div style="position: absolute; inset: 0; z-index: 70;">
    <button @click="$emit('close')" :style="scrim" aria-label="Close settings" tabindex="-1"></button>
    <div :style="sheet">
      <span style="display: block; width: 38px; height: 4px; border-radius: 2px; background: var(--grabber); margin: 0 auto 18px;"></span>
      <button @click="$emit('close')" :style="closeBtn" aria-label="Close settings">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M1 1 L11 11 M11 1 L1 11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
      </button>
      <h2 style="font-family: var(--font-heading); font-weight: 700; font-size: 24px; margin: 0 0 18px;">Settings</h2>

      <div style="display: flex; align-items: center; justify-content: space-between; padding: 14px 0; border-bottom: 1px solid var(--line);">
        <span>
          <span style="display: block; font-size: 15px; font-weight: 600;">Location</span>
          <span :style="{ fontSize: '12.5px', color: permColor }">{{ permLabel }}</span>
        </span>
        <button v-if="canEnable" @click="$emit('enable-location')" :style="enableBtn">Turn on</button>
        <span v-else :style="{ width: '7px', height: '7px', borderRadius: '50%', background: permColor }"></span>
      </div>

      <button @click="$emit('toggle-audio')" :style="row">
        <span style="font-size: 15px; font-weight: 600;">Audio narration</span>
        <span :style="track"><span :style="knob"></span></span>
      </button>

      <button @click="$emit('toggle-units')" :style="row">
        <span style="font-size: 15px; font-weight: 600;">Distance units</span>
        <span style="font-size: 14px; font-weight: 700; color: var(--accent-warm);">{{ unitsLabel }}</span>
      </button>

      <button v-if="showInstall" @click="openInstall" :style="row">
        <span style="font-size: 15px; font-weight: 600;">Add to home screen</span>
        <svg width="9" height="15" viewBox="0 0 9 15" fill="none" aria-hidden="true"><path d="M1 1 L7.5 7.5 L1 14" stroke="var(--ink-muted)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>

      <ShareButton variant="row" />

      <a v-if="faultHref" :href="faultHref" :style="rowLink">
        <span>
          <span style="display: block; font-size: 15px; font-weight: 600;">Report a fault</span>
          <span style="display: block; font-size: 12.5px; color: var(--ink-muted); margin-top: 2px;">Tell us about a problem or something that looks wrong.</span>
        </span>
        <svg width="9" height="15" viewBox="0 0 9 15" fill="none" aria-hidden="true" style="flex-shrink: 0;"><path d="M1 1 L7.5 7.5 L1 14" stroke="var(--ink-muted)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </a>

      <button @click="toggleAnalytics" :style="row" style="border-bottom: none; padding-bottom: 4px;">
        <span style="padding-right: 14px;">
          <span style="display: block; font-size: 15px; font-weight: 600;">Usage analytics</span>
          <span style="display: block; font-size: 12.5px; color: var(--ink-muted); margin-top: 2px;">Helps us understand how the app is used. No personal data collected.</span>
        </span>
        <span :style="analyticsTrack" role="switch" :aria-checked="String(analyticsOn)"><span :style="analyticsKnob"></span></span>
      </button>
      <p style="font-size: 11.5px; color: var(--ink-faint); margin: 0 0 14px; padding-bottom: 14px; border-bottom: 1px solid var(--line);">We use PostHog in cookie-free mode. See <a href="https://posthog.com/privacy" target="_blank" rel="noopener" style="color: inherit; text-decoration: underline;">posthog.com/privacy</a>.</p>

      <p v-if="sourcingNote" style="font-family: var(--font-body); font-size: 14px; line-height: 1.55; color: var(--ink-muted); margin: 18px 0 0;">{{ sourcingNote }}</p>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { isOptedOut, setAnalyticsOptOut } from '../lib/analytics.js'
import { config } from '../config.js'
import ShareButton from './ShareButton.vue'
import { useInstall } from '../composables/useInstall.js'
const sourcingNote = config.contentSourceNote
const props = defineProps({
  audioOn: { type: Boolean, default: true },
  units: { type: String, default: 'mi' },
  permission: { type: String, default: 'prompt' },
})
const emit = defineEmits(['close', 'toggle-audio', 'toggle-units', 'enable-location'])

// "Add to home screen" – opens the prominent install guide (hidden once installed)
const { isStandalone, openGuide } = useInstall()
const showInstall = computed(() => !isStandalone)
function openInstall() { openGuide(); emit('close') }

// "Report a fault" – opens the device mail app (no form, no backend; works
// offline). Pre-fills the app name, version and device so we can reproduce it.
// Hidden if no support address is configured.
const version = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : ''
const faultHref = computed(() => {
  if (!config.faultEmail) return ''
  const subject = `${config.appName} – report a fault`
  const body = `Hi,\n\nI found a problem with the ${config.appName} app:\n\n\n\n`
    + `— Please leave the details below so we can look into it —\n`
    + `App version: ${version}\nDevice: ${navigator.userAgent}`
  return `mailto:${config.faultEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
})

// usage-analytics opt-out (persisted in localStorage by setAnalyticsOptOut)
const analyticsOn = ref(!isOptedOut())
function toggleAnalytics() {
  analyticsOn.value = !analyticsOn.value
  setAnalyticsOptOut(!analyticsOn.value)
}
const analyticsTrack = computed(() => ({
  width: '46px', height: '27px', borderRadius: '14px', background: analyticsOn.value ? '#2FBF71' : 'var(--toggle-off)',
  position: 'relative', transition: 'background .2s', flexShrink: 0, display: 'block',
}))
const analyticsKnob = computed(() => ({
  position: 'absolute', top: '3px', left: analyticsOn.value ? '22px' : '3px', width: '21px', height: '21px',
  borderRadius: '50%', background: '#fff', transition: 'left .2s', display: 'block',
}))

const unitsLabel = computed(() => (props.units === 'mi' ? 'Miles' : 'Kilometres'))
const permLabel = computed(() => ({
  granted: 'Permission granted',
  denied: 'Permission denied – enable in OS settings',
  prompt: 'Not yet enabled',
  unsupported: 'Not available on this device',
}[props.permission] || 'Not yet enabled'))
const permColor = computed(() => (props.permission === 'granted' ? '#2FBF71' : props.permission === 'denied' ? '#FF4D5E' : 'var(--accent-warm)'))
const canEnable = computed(() => props.permission === 'prompt')
const enableBtn = {
  border: 'none', borderRadius: '11px', padding: '7px 14px', cursor: 'pointer', flexShrink: 0,
  fontFamily: "var(--font-button)", fontWeight: 700, fontSize: '13px', color: 'var(--bg)',
  background: 'var(--grad-warm)',
}

const track = computed(() => ({
  width: '46px', height: '27px', borderRadius: '14px', background: props.audioOn ? '#2FBF71' : 'var(--toggle-off)',
  position: 'relative', transition: 'background .2s', flexShrink: 0, display: 'block',
}))
const knob = computed(() => ({
  position: 'absolute', top: '3px', left: props.audioOn ? '22px' : '3px', width: '21px', height: '21px',
  borderRadius: '50%', background: '#fff', transition: 'left .2s', display: 'block',
}))

const scrim = { position: 'absolute', inset: 0, background: 'rgba(10,7,14,0.6)', border: 'none', cursor: 'pointer' }
const sheet = {
  position: 'absolute', bottom: 0, left: 0, right: 0, background: 'var(--card)', borderRadius: '26px 26px 0 0',
  padding: '14px 22px 34px', boxShadow: '0 -10px 50px rgba(0,0,0,0.6)', animation: 'sheetUp .28s ease',
}
const closeBtn = {
  position: 'absolute', top: '14px', right: '16px', width: '30px', height: '30px', borderRadius: '50%',
  border: 'none', background: 'var(--line)', color: 'var(--ink)', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}
const row = {
  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0',
  borderBottom: '1px solid var(--line)', borderLeft: 'none', borderRight: 'none', borderTop: 'none',
  background: 'none', cursor: 'pointer', color: 'inherit', textAlign: 'left',
}
const rowLink = { ...row, textDecoration: 'none', gap: '14px' }
</script>
