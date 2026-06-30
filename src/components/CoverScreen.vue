<!-- Cover / Home – mode select (BRD §9.1 screen 3). Verbatim from the prototype;
     location/tour counts now come from the database (BRD §10 "Cover / Home"). -->
<template>
  <div style="position: absolute; inset: 0; padding: 64px 26px 30px; display: flex; flex-direction: column;">
    <div style="display: flex; align-items: center; justify-content: space-between; gap: 9px;">
      <span style="display: flex; align-items: center; gap: 9px;">
        <span style="display: flex; gap: 2px;">
          <span v-for="c in bars" :key="c" :style="{ width: '4px', height: '17px', borderRadius: '2px', background: c }"></span>
        </span>
        <span style="font-size: 11px; font-weight: 700; letter-spacing: 2.4px; color: var(--ink-muted); text-transform: uppercase;">{{ orgName }}</span>
      </span>
      <span style="display: flex; align-items: center; gap: 7px;">
        <button @click="$emit('settings')" :style="iconBtn" aria-label="Settings" title="Settings">
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.8"/><path d="M12 2.5 v3 M12 18.5 v3 M2.5 12 h3 M18.5 12 h3 M5 5 l2 2 M17 17 l2 2 M19 5 l-2 2 M7 17 l-2 2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
        </button>
        <ShareButton />
      </span>
    </div>

    <div style="margin-top: auto;"></div>

    <div style="font-size: 13px; font-weight: 600; letter-spacing: 1px; color: var(--accent); text-transform: uppercase;">{{ cityName }}</div>
    <h1 style="font-family: var(--font-heading); font-weight: 700; font-size: 58px; line-height: 0.92; letter-spacing: -2px; margin: 12px 0 0; white-space: pre-line;">{{ headline }}</h1>
    <p style="font-family: var(--font-body); font-size: 18px; line-height: 1.5; color: var(--ink-soft); margin: 20px 0 0; max-width: 300px; text-wrap: pretty;">{{ intro }}</p>

    <div style="display: flex; gap: 18px; margin: 22px 0 26px; font-size: 12.5px; color: var(--ink-muted); font-weight: 600;">
      <span>{{ locationCount }} locations</span>
      <span style="opacity: 0.4;">·</span>
      <span>{{ tourCount }} walking tour{{ tourCount === 1 ? '' : 's' }}</span>
      <span style="opacity: 0.4;">·</span>
      <span>Audio narration</span>
    </div>

    <div style="font-size: 12px; font-weight: 700; letter-spacing: 1px; color: var(--ink-muted); text-transform: uppercase; margin-bottom: 12px;">Choose how to explore</div>

    <button @click="$emit('guided')" :style="modeBtn" style="margin-bottom: 12px;">
      <span style="flex-shrink: 0; width: 46px; height: 46px; border-radius: 13px; background: var(--grad-guided); display: flex; align-items: center; justify-content: center;">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="5.5" cy="6" r="2.4" fill="#fff"/><circle cx="18.5" cy="18" r="2.4" fill="#fff"/><path d="M5.5 8.5 V13 a4 4 0 0 0 4 4 H14" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-dasharray="0.1 3.4"/></svg>
      </span>
      <span style="flex: 1;">
        <span style="display: block; font-family: var(--font-heading); font-weight: 600; font-size: 18px;">Guided Tour</span>
        <span style="display: block; font-size: 13px; color: var(--ink-muted); margin-top: 2px;">Follow a set walking route, stop by stop</span>
      </span>
      <svg width="9" height="15" viewBox="0 0 9 15" fill="none"><path d="M1 1 L7.5 7.5 L1 14" stroke="var(--ink-muted)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </button>

    <button @click="$emit('discovery')" :style="modeBtn">
      <span style="flex-shrink: 0; width: 46px; height: 46px; border-radius: 13px; background: var(--grad-discovery); display: flex; align-items: center; justify-content: center;">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="2.6" fill="#fff"/><path d="M7.5 7.5 a6 6 0 0 0 0 9 M16.5 7.5 a6 6 0 0 1 0 9" stroke="#fff" stroke-width="2" stroke-linecap="round"/><path d="M4.6 4.6 a10 10 0 0 0 0 14.8 M19.4 4.6 a10 10 0 0 1 0 14.8" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity="0.5"/></svg>
      </span>
      <span style="flex: 1;">
        <span style="display: block; font-family: var(--font-heading); font-weight: 600; font-size: 18px;">Discovery Mode</span>
        <span style="display: block; font-size: 13px; color: var(--ink-muted); margin-top: 2px;">Wander freely – we’ll alert you near a site</span>
      </span>
      <svg width="9" height="15" viewBox="0 0 9 15" fill="none"><path d="M1 1 L7.5 7.5 L1 14" stroke="var(--ink-muted)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </button>

    <AppFooter />

    <InstallPrompt />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import InstallPrompt from './InstallPrompt.vue'
import AppFooter from './AppFooter.vue'
import ShareButton from './ShareButton.vue'
import { theme } from '../theme.js'
import { config, withCity } from '../config.js'
const props = defineProps({
  cityName: { type: String, default: 'London' },
  locationCount: { type: Number, default: 20 },
  tourCount: { type: Number, default: 1 },
})
defineEmits(['guided', 'discovery', 'settings'])
const bars = theme.brandBars
const orgName = theme.orgName
const iconBtn = {
  width: '38px', height: '38px', flexShrink: 0, borderRadius: '50%', border: '1px solid var(--line)',
  background: 'var(--raised)', color: 'var(--ink)', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}
const headline = computed(() => withCity(config.coverHeadline, props.cityName))
const intro = computed(() => withCity(config.coverIntro, props.cityName))
const modeBtn = {
  display: 'flex', alignItems: 'center', gap: '16px', textAlign: 'left', width: '100%',
  background: 'var(--raised)', border: '1px solid var(--line)', borderRadius: '18px',
  padding: '18px', cursor: 'pointer', color: 'inherit',
}
</script>
