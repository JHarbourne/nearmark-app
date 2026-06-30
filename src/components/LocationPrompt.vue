<!-- Location re-prompt — shown when the user starts a Guided tour or Discovery
     Mode without having granted location yet (they skipped it on the splash, or
     it's blocked). Lets them enable it at the moment it matters, or continue. -->
<template>
  <div style="position: absolute; inset: 0; z-index: 80;">
    <button @click="$emit('close')" :style="scrim" aria-label="Dismiss" tabindex="-1"></button>
    <div :style="sheet" role="dialog" aria-modal="true" aria-label="Enable location">
      <span style="display: block; width: 38px; height: 4px; border-radius: 2px; background: var(--grabber); margin: 0 auto 18px;"></span>
      <span :style="iconWrap">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 21 C 8 16, 5 12.5 5 9 a7 7 0 0 1 14 0 C 19 12.5 16 16 12 21 Z" fill="#fff"/><circle cx="12" cy="9" r="2.6" fill="var(--bg)"/></svg>
      </span>
      <h2 style="font-family: var(--font-heading); font-weight: 700; font-size: 22px; margin: 16px 0 8px; text-align: center;">{{ title }}</h2>
      <p style="font-family: var(--font-body); font-size: 15.5px; line-height: 1.55; color: var(--ink-soft); margin: 0 auto 22px; max-width: 300px; text-align: center;">{{ body }}</p>
      <button v-if="permission !== 'denied'" @click="$emit('enable')" :style="cta">Enable location</button>
      <button @click="$emit('continue')" :style="ghost">{{ permission === 'denied' ? 'Continue without location' : 'Not now' }}</button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { config } from '../config.js'
const props = defineProps({
  mode: { type: String, default: 'discovery' }, // 'guided' | 'discovery'
  permission: { type: String, default: 'prompt' },
})
defineEmits(['enable', 'continue', 'close'])

const title = computed(() => {
  if (props.permission === 'denied') return 'Location is switched off'
  return props.mode === 'discovery' ? 'Find history around you' : 'Follow along with GPS'
})
const body = computed(() => {
  if (props.permission === 'denied') {
    return 'Location is blocked for this site. To get alerts near each site, turn it back on in your browser or device settings. You can still explore the map and tap any stop.'
  }
  return props.mode === 'discovery'
    ? config.discoveryPrompt
    : 'Enable location to see where you are on the route and unlock each stop as you reach it. You can also follow the route manually.'
})

const scrim = { position: 'absolute', inset: 0, background: 'rgba(10,7,14,0.6)', border: 'none', cursor: 'pointer' }
const sheet = {
  position: 'absolute', bottom: 0, left: 0, right: 0, background: 'var(--card)', borderRadius: '26px 26px 0 0',
  padding: '14px 22px 34px', boxShadow: '0 -10px 50px rgba(0,0,0,0.6)', animation: 'sheetUp .28s ease',
}
const iconWrap = {
  display: 'flex', width: '64px', height: '64px', margin: '0 auto', borderRadius: '20px',
  background: 'var(--grad-icon)', alignItems: 'center', justifyContent: 'center',
}
const cta = {
  width: '100%', height: '56px', border: 'none', borderRadius: '16px', cursor: 'pointer',
  fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: '17px', color: 'var(--bg)',
  background: 'var(--grad-warm)', marginBottom: '12px',
}
const ghost = {
  width: '100%', height: '52px', border: '1px solid var(--line)', borderRadius: '16px',
  cursor: 'pointer', fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: '15px',
  color: 'var(--ink)', background: 'none',
}
</script>
