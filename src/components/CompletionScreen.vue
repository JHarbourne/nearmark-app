<!-- Tour completion (BRD §9.1 screen 8) – verbatim from the prototype. -->
<template>
  <div :style="wrap">
    <div :style="badgeRing">
      <span style="width: 80px; height: 80px; border-radius: 50%; background: var(--bg); display: flex; align-items: center; justify-content: center;">
        <svg width="38" height="38" viewBox="0 0 24 24" fill="none"><path d="M5 12.5 L10 17.5 L19.5 7" stroke="var(--accent-warm)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </span>
    </div>
    <h1 style="font-family: var(--font-heading); font-weight: 700; font-size: 38px; line-height: 1; letter-spacing: -1px; margin: 30px 0 0;">Tour complete</h1>
    <p style="font-family: var(--font-body); font-size: 17px; line-height: 1.55; color: var(--ink-soft); margin: 16px 0 0; max-width: 290px;">{{ message }}</p>

    <div style="display: flex; gap: 12px; margin: 34px 0 0; width: 100%;">
      <span :style="statCard"><span :style="statNum">{{ visitedCount }}</span><span :style="statLbl">stops visited</span></span>
      <span :style="statCard"><span :style="statNum">{{ timeLabel }}</span><span :style="statLbl">time taken</span></span>
    </div>

    <div style="margin-top: auto; width: 100%;">
      <button @click="$emit('keep')" :style="cta">Keep exploring</button>
      <button @click="$emit('home')" :style="ghost">Back to home</button>
    </div>
  </div>
</template>

<script setup>
import { config } from '../config.js'
defineProps({
  visitedCount: { type: Number, default: 6 },
  timeLabel: { type: String, default: '1h 47m' },
})
defineEmits(['keep', 'home'])
const message = config.completionMessage
const wrap = {
  position: 'absolute', inset: 0, padding: '70px 30px 40px', display: 'flex', flexDirection: 'column',
  alignItems: 'center', textAlign: 'center',
  background: 'radial-gradient(120% 70% at 50% 0%, var(--raised) 0%, var(--bg) 60%)',
}
const badgeRing = {
  marginTop: '36px', width: '96px', height: '96px', borderRadius: '50%',
  background: 'conic-gradient(#FF4D5E, #FF8C42, #FFC53D, #2FBF71, #3D9BFF, #9B6DFF, #FF4D5E)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}
const statCard = { flex: 1, background: 'var(--raised)', borderRadius: '16px', padding: '18px 12px' }
const statNum = { display: 'block', fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: '30px' }
const statLbl = { fontSize: '12px', color: 'var(--ink-muted)' }
const cta = {
  width: '100%', height: '54px', border: 'none', borderRadius: '16px', cursor: 'pointer',
  fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: '16px', color: 'var(--bg)',
  background: 'var(--grad-warm)', marginBottom: '12px',
}
const ghost = {
  width: '100%', height: '54px', border: '1px solid var(--line)', borderRadius: '16px',
  cursor: 'pointer', fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: '16px',
  color: 'var(--ink)', background: 'none',
}
</script>
