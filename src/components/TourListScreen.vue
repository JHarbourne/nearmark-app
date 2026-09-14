<!-- Tour list (BRD §9.1 screen 4) – browse available guided tours for the city.
     New screen; visual system matches the prototype's tour detail header card. -->
<template>
  <div style="position: absolute; inset: 0; overflow-y: auto; padding: 64px 24px 40px;">
    <button @click="$emit('back')" :style="backBtn" aria-label="Back">
      <svg width="10" height="16" viewBox="0 0 10 16" fill="none" aria-hidden="true"><path d="M8.5 1 L2 8 L8.5 15" stroke="var(--ink)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </button>

    <h1 style="font-family: var(--font-heading); font-weight: 700; font-size: 34px; line-height: 1; letter-spacing: -1px; margin: 6px 0 20px;">{{ city }}</h1>

    <!-- "What's on" — village events (not walks); clearly badged, above the tours -->
    <template v-if="announcements.length">
      <div style="font-size: 12px; font-weight: 700; letter-spacing: 1.4px; color: var(--accent); text-transform: uppercase; margin: 0 0 10px;">What's on</div>
      <button v-for="a in announcements" :key="a.id" @click="$emit('open-announcement', a)" :style="annCard">
        <div :style="annThumb(a)">
          <svg v-if="!a.imageUrl" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
        </div>
        <span style="flex: 1; min-width: 0; padding: 11px 14px;">
          <span style="display: flex; align-items: center; gap: 8px;">
            <span :style="annTag">Event</span>
            <span v-if="whenLabel(a)" style="font-size: 11.5px; font-weight: 600; color: var(--ink-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{ whenLabel(a) }}</span>
          </span>
          <span style="display: block; font-family: var(--font-heading); font-weight: 700; font-size: 17px; line-height: 1.15; margin-top: 5px;">{{ a.title }}</span>
          <span v-if="a.place" style="display: block; font-size: 12.5px; color: var(--ink-muted); margin-top: 2px;">{{ a.place }}</span>
        </span>
      </button>
      <div style="font-size: 12px; font-weight: 700; letter-spacing: 1.4px; color: var(--ink-muted); text-transform: uppercase; margin: 22px 0 12px;">Walking tours</div>
    </template>

    <button v-for="t in tours" :key="t.id" @click="$emit('open', t)" :style="card">
      <div :style="cover(t)">
        <div v-if="!t.coverImageUrl" style="position: absolute; inset: 0; opacity: 0.22; background-image: radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1.4px); background-size: 13px 13px;"></div>
        <div style="position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.25) 46%, rgba(0,0,0,0) 74%);"></div>
        <span v-if="t.coverCredit && t.showCoverCredit !== false" :style="creditPill">Photo: {{ t.coverCredit }}</span>
        <div style="position: absolute; left: 16px; bottom: 14px; right: 16px;">
          <div style="font-size: 11px; font-weight: 700; letter-spacing: 1.2px; color: rgba(255,255,255,0.92); text-transform: uppercase;">{{ t.theme }}</div>
          <div style="font-family: var(--font-heading); font-weight: 700; font-size: 24px; line-height: 1.02; margin-top: 6px; color: #fff;">{{ t.title }}</div>
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
  announcements: { type: Array, default: () => [] },
})
defineEmits(['open', 'back', 'open-announcement'])

// "What's on" event cards
const annFmt = (d) => d ? new Date(d).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''
function whenLabel(a) {
  if (!a.eventStart) return ''
  return a.eventEnd && a.eventEnd !== a.eventStart ? `${annFmt(a.eventStart)} – ${annFmt(a.eventEnd)}` : annFmt(a.eventStart)
}
const annCard = {
  display: 'flex', alignItems: 'stretch', width: '100%', textAlign: 'left', background: 'var(--card)',
  border: '1px solid var(--line)', borderRadius: '16px', overflow: 'hidden', cursor: 'pointer',
  color: 'inherit', marginBottom: '12px', padding: 0,
}
function annThumb(a) {
  const base = { width: '74px', flexShrink: 0, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }
  return a.imageUrl
    ? { ...base, backgroundImage: `url(${a.imageUrl})`, backgroundSize: 'cover', backgroundPosition: '50% 50%', backgroundRepeat: 'no-repeat' }
    : { ...base, background: 'var(--grad-icon, var(--grad-brand))' }
}
const annTag = {
  fontSize: '10px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: '#fff',
  background: 'var(--accent, #9B6DFF)', padding: '2px 8px', borderRadius: '20px', flexShrink: 0,
}
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
