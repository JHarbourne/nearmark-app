<!--
  City select (BRD §9.1 screen 2). New screen styled to the prototype system.
  For the pilot only London/Soho is live; future cities (BRD §18) shown as
  "coming soon".
-->
<template>
  <div :style="wrap">
    <div style="display: flex; align-items: center; gap: 9px; margin-bottom: 30px;">
      <span style="display: flex; gap: 2px;">
        <span v-for="c in bars" :key="c" :style="{ width: '4px', height: '17px', borderRadius: '2px', background: c }"></span>
      </span>
      <span style="font-size: 11px; font-weight: 700; letter-spacing: 2.4px; color: var(--ink-muted); text-transform: uppercase;">{{ orgName }}</span>
    </div>

    <h1 style="font-family: var(--font-heading); font-weight: 700; font-size: 38px; line-height: 0.98; letter-spacing: -1.4px; margin: 0 0 6px;">Choose a city</h1>
    <p style="font-family: var(--font-body); font-size: 16px; line-height: 1.5; color: var(--ink-muted); margin: 0 0 26px;">More cities are coming soon.</p>

    <button
      v-for="c in cities"
      :key="c.id"
      @click="c.live && $emit('select', c)"
      :disabled="!c.live"
      :style="cityBtn(c.live)"
    >
      <span style="flex: 1;">
        <span style="display: block; font-family: var(--font-heading); font-weight: 600; font-size: 19px;">{{ c.name }}</span>
        <span style="display: block; font-size: 13px; color: var(--ink-muted); margin-top: 2px;">
          {{ c.live ? `${c.area} · ${c.locationCount} locations · ${c.tourCount} tour` : 'Coming soon' }}
        </span>
      </span>
      <svg v-if="c.live" width="9" height="15" viewBox="0 0 9 15" fill="none"><path d="M1 1 L7.5 7.5 L1 14" stroke="var(--ink-muted)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </button>
  </div>
</template>

<script setup>
import { theme } from '../theme.js'
defineProps({ cities: { type: Array, default: () => [] } })
defineEmits(['select'])
const bars = theme.brandBars
const orgName = theme.orgName
const wrap = { position: 'absolute', inset: 0, padding: '64px 26px 30px', display: 'flex', flexDirection: 'column', overflowY: 'auto' }
function cityBtn(live) {
  return {
    display: 'flex', alignItems: 'center', gap: '16px', textAlign: 'left', width: '100%',
    background: 'var(--raised)', border: '1px solid var(--line)', borderRadius: '18px',
    padding: '18px', cursor: live ? 'pointer' : 'default', color: 'inherit', marginBottom: '12px',
    opacity: live ? 1 : 0.45,
  }
}
</script>
