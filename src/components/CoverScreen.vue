<!-- Cover / Home – mode select (BRD §9.1 screen 3). Verbatim from the prototype;
     location/tour counts now come from the database (BRD §10 "Cover / Home"). -->
<template>
  <div style="position: absolute; inset: 0; padding: 64px 26px max(30px, env(safe-area-inset-bottom)); display: flex; flex-direction: column; overflow-y: auto; -webkit-overflow-scrolling: touch; overscroll-behavior: contain;">
    <div style="display: flex; align-items: center; justify-content: space-between; gap: 9px;">
      <span style="display: flex; align-items: center; gap: 9px;">
        <img v-if="logoUrl" :src="logoUrl" :alt="orgName" style="height: 24px; width: auto; display: block;" />
        <template v-else>
          <span style="display: flex; gap: 2px;">
            <span v-for="c in bars" :key="c" :style="{ width: '4px', height: '17px', borderRadius: '2px', background: c }"></span>
          </span>
          <span style="font-size: 11px; font-weight: 700; letter-spacing: 2.4px; color: var(--ink-muted); text-transform: uppercase;">{{ orgName }}</span>
        </template>
      </span>
      <span style="display: flex; align-items: center; gap: 7px;">
        <button @click="$emit('settings')" :style="iconBtn" aria-label="Settings" title="Settings">
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.24-.438.613-.43.992a7.7 7.7 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.5 6.5 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.5 6.5 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.9 6.9 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.281Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <ShareButton />
      </span>
    </div>

    <div style="margin-top: auto;"></div>

    <div style="font-size: 13px; font-weight: 600; letter-spacing: 1px; color: var(--accent); text-transform: uppercase;">{{ cityName }}</div>
    <h1 style="font-family: var(--font-heading); font-weight: 800; font-size: 58px; line-height: 0.92; letter-spacing: -2px; margin: 12px 0 0; white-space: pre-line;">{{ headline }}</h1>
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
        <span style="display: block; font-family: var(--font-button); font-weight: 700; font-size: 18.5px;">Guided Tour</span>
        <span style="display: block; font-size: 13px; color: var(--ink-muted); margin-top: 2px;">Follow a set walking route, stop by stop</span>
      </span>
      <svg width="9" height="15" viewBox="0 0 9 15" fill="none"><path d="M1 1 L7.5 7.5 L1 14" stroke="var(--ink-muted)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </button>

    <button @click="$emit('discovery')" :style="modeBtn">
      <span style="flex-shrink: 0; width: 46px; height: 46px; border-radius: 13px; background: var(--grad-discovery); display: flex; align-items: center; justify-content: center;">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="2.6" fill="#fff"/><path d="M7.5 7.5 a6 6 0 0 0 0 9 M16.5 7.5 a6 6 0 0 1 0 9" stroke="#fff" stroke-width="2" stroke-linecap="round"/><path d="M4.6 4.6 a10 10 0 0 0 0 14.8 M19.4 4.6 a10 10 0 0 1 0 14.8" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity="0.5"/></svg>
      </span>
      <span style="flex: 1;">
        <span style="display: block; font-family: var(--font-button); font-weight: 700; font-size: 18.5px;">Discovery Mode</span>
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
const logoUrl = theme.logoUrl
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
