<!-- Tour list (BRD §9.1 screen 4) – browse available guided tours for the city.
     New screen; visual system matches the prototype's tour detail header card. -->
<template>
  <div style="position: absolute; inset: 0; overflow-y: auto; padding: 64px 24px 40px;">
    <button @click="$emit('back')" :style="backBtn" aria-label="Back">
      <svg width="10" height="16" viewBox="0 0 10 16" fill="none" aria-hidden="true"><path d="M8.5 1 L2 8 L8.5 15" stroke="var(--ink)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </button>

    <div style="font-size: 12px; font-weight: 700; letter-spacing: 1.4px; color: var(--ink-muted); text-transform: uppercase; margin: 6px 0 4px;">Walking tours</div>
    <h1 style="font-family: var(--font-heading); font-weight: 700; font-size: 34px; line-height: 1; letter-spacing: -1px; margin: 0 0 22px;">{{ city }}</h1>

    <button v-for="t in tours" :key="t.id" @click="$emit('open', t)" :style="card">
      <div :style="cover(t)">
        <div v-if="!t.coverImageUrl" style="position: absolute; inset: 0; opacity: 0.22; background-image: radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1.4px); background-size: 13px 13px;"></div>
        <div style="position: absolute; inset: 0; background: linear-gradient(to top, var(--card) 4%, transparent 60%);"></div>
        <span v-if="t.coverCredit" :style="creditPill">Photo: {{ t.coverCredit }}</span>
        <div style="position: absolute; left: 16px; bottom: 14px; right: 16px;">
          <div style="font-size: 11px; font-weight: 700; letter-spacing: 1.2px; color: rgba(255,255,255,0.9); text-transform: uppercase;">{{ t.theme }}</div>
          <div style="font-family: var(--font-heading); font-weight: 700; font-size: 24px; line-height: 1.02; margin-top: 6px;">{{ t.title }}</div>
        </div>
      </div>
      <div style="display: flex; gap: 16px; padding: 13px 16px; font-size: 12.5px; color: var(--ink-muted); font-weight: 600;">
        <span>{{ t.stopIds.length }} stops</span>
        <span style="opacity: 0.4;">·</span>
        <span>{{ t.durationLabel }}</span>
        <span style="opacity: 0.4;">·</span>
        <span>{{ t.distanceLabel }}</span>
      </div>
    </button>
  </div>
</template>

<script setup>
defineProps({
  city: { type: String, default: 'London' },
  tours: { type: Array, default: () => [] },
})
defineEmits(['open', 'back'])
const backBtn = {
  width: '38px', height: '38px', borderRadius: '50%', background: 'var(--overlay-panel)',
  border: '1px solid var(--line)', cursor: 'pointer', display: 'flex',
  alignItems: 'center', justifyContent: 'center', marginBottom: '14px',
}
const card = {
  display: 'block', width: '100%', textAlign: 'left', background: 'var(--card)',
  border: '1px solid var(--line)', borderRadius: '18px', overflow: 'hidden',
  cursor: 'pointer', color: 'inherit', marginBottom: '16px', padding: 0,
}
function cover(t) {
  const base = { height: '150px', position: 'relative', overflow: 'hidden' }
  if (t.coverImageUrl) {
    return { ...base, backgroundImage: `url(${t.coverImageUrl})`, backgroundSize: 'cover', backgroundPosition: t.coverPosition || '50% 50%', backgroundRepeat: 'no-repeat' }
  }
  return { ...base, background: 'var(--grad-brand)' }
}
const creditPill = {
  position: 'absolute', top: '10px', right: '12px', fontSize: '9.5px', fontWeight: 600,
  color: 'rgba(255,255,255,0.92)', background: 'rgba(23,17,31,0.5)', backdropFilter: 'blur(4px)',
  padding: '2px 7px', borderRadius: '6px', maxWidth: '60%', whiteSpace: 'nowrap',
  overflow: 'hidden', textOverflow: 'ellipsis',
}
</script>
