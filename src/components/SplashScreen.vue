<!--
  Splash / location-permission primer (BRD §9.1 screen 1) — a new screen not in
  the prototype, styled to match its visual system. Shown on first run to explain
  why location is needed before the OS prompt fires.
-->
<template>
  <div :style="wrap">
    <div style="display: flex; align-items: center; gap: 9px;">
      <span style="display: flex; gap: 2px;">
        <span v-for="c in bars" :key="c" :style="{ width: '4px', height: '17px', borderRadius: '2px', background: c }"></span>
      </span>
      <span style="font-size: 11px; font-weight: 700; letter-spacing: 2.4px; color: #A99BB8; text-transform: uppercase;">{{ orgName }}</span>
    </div>

    <div style="margin: auto 0; text-align: center;">
      <span style="display: inline-flex; width: 88px; height: 88px; border-radius: 26px; background: linear-gradient(135deg, #9B6DFF, #FF4D5E); align-items: center; justify-content: center; margin-bottom: 30px;">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none"><path d="M12 21 C 8 16, 5 12.5 5 9 a7 7 0 0 1 14 0 C 19 12.5 16 16 12 21 Z" fill="#fff"/><circle cx="12" cy="9" r="2.6" fill="#17111f"/></svg>
      </span>
      <h1 style="font-family: 'Bricolage Grotesque'; font-weight: 700; font-size: 32px; line-height: 1.05; letter-spacing: -1px; margin: 0 0 14px; white-space: pre-line;">{{ title }}</h1>
      <p style="font-family: 'Newsreader'; font-size: 17px; line-height: 1.55; color: #D9CFE0; margin: 0 auto; max-width: 290px;">
        {{ body }}
      </p>
    </div>

    <button @click="$emit('grant')" :style="cta" @pointerdown.prevent>
      Enable location
    </button>
    <button @click="$emit('skip')" :style="ghost">
      Not now — browse the map
    </button>
    <AppFooter style="margin-top: 16px;" />
  </div>
</template>

<script setup>
import { theme } from '../theme.js'
import { config } from '../config.js'
import AppFooter from './AppFooter.vue'
defineEmits(['grant', 'skip'])
const bars = theme.brandBars
const orgName = theme.orgName
const title = config.splashTitle
const body = config.splashBody
const wrap = { position: 'absolute', inset: 0, padding: '64px 26px 30px', display: 'flex', flexDirection: 'column' }
const cta = {
  width: '100%', height: '56px', border: 'none', borderRadius: '16px', cursor: 'pointer',
  fontFamily: "'Bricolage Grotesque'", fontWeight: 700, fontSize: '17px', color: '#17111f',
  background: 'linear-gradient(100deg, #FFC53D, #FF8C42)', marginBottom: '12px',
}
const ghost = {
  width: '100%', height: '52px', border: '1px solid rgba(246,239,230,0.14)', borderRadius: '16px',
  cursor: 'pointer', fontFamily: "'Bricolage Grotesque'", fontWeight: 600, fontSize: '15px',
  color: '#F6EFE6', background: 'none',
}
</script>
