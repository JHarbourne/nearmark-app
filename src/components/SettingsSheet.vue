<!-- Settings sheet (BRD §9.1 screen 10, §10 "Settings") — verbatim from the
     prototype, now wired to real permission status + persisted localStorage. -->
<template>
  <div style="position: absolute; inset: 0; z-index: 70;">
    <button @click="$emit('close')" :style="scrim" aria-label="Close settings" tabindex="-1"></button>
    <div :style="sheet">
      <span style="display: block; width: 38px; height: 4px; border-radius: 2px; background: rgba(255,255,255,0.25); margin: 0 auto 18px;"></span>
      <h2 style="font-family: 'Bricolage Grotesque'; font-weight: 700; font-size: 24px; margin: 0 0 18px;">Settings</h2>

      <div style="display: flex; align-items: center; justify-content: space-between; padding: 14px 0; border-bottom: 1px solid rgba(246,239,230,0.07);">
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
        <span style="font-size: 14px; font-weight: 700; color: #FFC53D;">{{ unitsLabel }}</span>
      </button>

      <button @click="toggleAnalytics" :style="row" style="border-bottom: none; padding-bottom: 4px;">
        <span style="padding-right: 14px;">
          <span style="display: block; font-size: 15px; font-weight: 600;">Usage analytics</span>
          <span style="display: block; font-size: 12.5px; color: #A99BB8; margin-top: 2px;">Helps us understand how the app is used. No personal data collected.</span>
        </span>
        <span :style="analyticsTrack" role="switch" :aria-checked="String(analyticsOn)"><span :style="analyticsKnob"></span></span>
      </button>
      <p style="font-size: 11.5px; color: #968ba8; margin: 0 0 14px; padding-bottom: 14px; border-bottom: 1px solid rgba(246,239,230,0.07);">We use PostHog in cookie-free mode. See <a href="https://posthog.com/privacy" target="_blank" rel="noopener" style="color: inherit; text-decoration: underline;">posthog.com/privacy</a>.</p>

      <p v-if="sourcingNote" style="font-family: 'Newsreader'; font-size: 14px; line-height: 1.55; color: #A99BB8; margin: 18px 0 0;">{{ sourcingNote }}</p>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { isOptedOut, setAnalyticsOptOut } from '../lib/analytics.js'
import { config } from '../config.js'
const sourcingNote = config.contentSourceNote
const props = defineProps({
  audioOn: { type: Boolean, default: true },
  units: { type: String, default: 'mi' },
  permission: { type: String, default: 'prompt' },
})
defineEmits(['close', 'toggle-audio', 'toggle-units', 'enable-location'])

// usage-analytics opt-out (persisted in localStorage by setAnalyticsOptOut)
const analyticsOn = ref(!isOptedOut())
function toggleAnalytics() {
  analyticsOn.value = !analyticsOn.value
  setAnalyticsOptOut(!analyticsOn.value)
}
const analyticsTrack = computed(() => ({
  width: '46px', height: '27px', borderRadius: '14px', background: analyticsOn.value ? '#2FBF71' : '#3a2e49',
  position: 'relative', transition: 'background .2s', flexShrink: 0, display: 'block',
}))
const analyticsKnob = computed(() => ({
  position: 'absolute', top: '3px', left: analyticsOn.value ? '22px' : '3px', width: '21px', height: '21px',
  borderRadius: '50%', background: '#fff', transition: 'left .2s', display: 'block',
}))

const unitsLabel = computed(() => (props.units === 'mi' ? 'Miles' : 'Kilometres'))
const permLabel = computed(() => ({
  granted: 'Permission granted',
  denied: 'Permission denied — enable in OS settings',
  prompt: 'Not yet enabled',
  unsupported: 'Not available on this device',
}[props.permission] || 'Not yet enabled'))
const permColor = computed(() => (props.permission === 'granted' ? '#2FBF71' : props.permission === 'denied' ? '#FF4D5E' : '#FFC53D'))
const canEnable = computed(() => props.permission === 'prompt')
const enableBtn = {
  border: 'none', borderRadius: '11px', padding: '7px 14px', cursor: 'pointer', flexShrink: 0,
  fontFamily: "'Bricolage Grotesque'", fontWeight: 700, fontSize: '13px', color: '#17111f',
  background: 'linear-gradient(100deg, #FFC53D, #FF8C42)',
}

const track = computed(() => ({
  width: '46px', height: '27px', borderRadius: '14px', background: props.audioOn ? '#2FBF71' : '#3a2e49',
  position: 'relative', transition: 'background .2s', flexShrink: 0, display: 'block',
}))
const knob = computed(() => ({
  position: 'absolute', top: '3px', left: props.audioOn ? '22px' : '3px', width: '21px', height: '21px',
  borderRadius: '50%', background: '#fff', transition: 'left .2s', display: 'block',
}))

const scrim = { position: 'absolute', inset: 0, background: 'rgba(10,7,14,0.6)', border: 'none', cursor: 'pointer' }
const sheet = {
  position: 'absolute', bottom: 0, left: 0, right: 0, background: '#1c1526', borderRadius: '26px 26px 0 0',
  padding: '14px 22px 34px', boxShadow: '0 -10px 50px rgba(0,0,0,0.6)', animation: 'sheetUp .28s ease',
}
const row = {
  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0',
  borderBottom: '1px solid rgba(246,239,230,0.07)', borderLeft: 'none', borderRight: 'none', borderTop: 'none',
  background: 'none', cursor: 'pointer', color: 'inherit', textAlign: 'left',
}
</script>
