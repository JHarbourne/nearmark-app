<!-- Tour detail (pre-start) — verbatim from the prototype (BRD §9.1 screen 5).
     Stats and stop list now driven by the database. -->
<template>
  <div style="position: absolute; inset: 0;">
    <div style="position: absolute; inset: 0; overflow-y: auto;">
    <div :style="heroStyle" :role="tour.coverImageUrl ? 'img' : null" :aria-label="tour.coverImageUrl ? (tour.coverAlt || tour.title) : null">
      <div v-if="!tour.coverImageUrl" style="position: absolute; inset: 0; opacity: 0.22; background-image: radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1.4px); background-size: 13px 13px;"></div>
      <div style="position: absolute; inset: 0; background: linear-gradient(to top, #17111f 2%, transparent 55%);"></div>
      <button @click="$emit('back')" :style="backBtn" aria-label="Back to tours">
        <svg width="10" height="16" viewBox="0 0 10 16" fill="none" aria-hidden="true"><path d="M8.5 1 L2 8 L8.5 15" stroke="#F6EFE6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
      <div style="position: absolute; left: 24px; bottom: 22px; right: 24px;">
        <div style="font-size: 12px; font-weight: 700; letter-spacing: 1.4px; color: rgba(255,255,255,0.9); text-transform: uppercase;">Walking Tour</div>
        <h1 style="font-family: 'Bricolage Grotesque'; font-weight: 700; font-size: 34px; line-height: 1; letter-spacing: -1px; margin: 8px 0 0;">{{ tour.title }}</h1>
        <a v-if="tour.coverCredit && tour.coverCreditUrl" :href="tour.coverCreditUrl" target="_blank" rel="noopener" :style="creditLine">Photo: {{ tour.coverCredit }}</a>
        <span v-else-if="tour.coverCredit" :style="creditLine">Photo: {{ tour.coverCredit }}</span>
      </div>
    </div>

    <div style="padding: 4px 24px 150px;">
      <div style="display: flex; gap: 10px; margin: 14px 0 20px;">
        <span :style="stat"><span :style="statNum">{{ stops.length }}</span><span :style="statLbl">stops</span></span>
        <span :style="stat"><span :style="statNum">{{ durationLabel }}</span><span :style="statLbl">duration</span></span>
        <span :style="stat"><span :style="statNum">{{ distanceLabel }}</span><span :style="statLbl">distance</span></span>
      </div>

      <p style="font-family: 'Newsreader'; font-size: 17px; line-height: 1.62; color: #E4DBEA; margin: 0 0 26px;">{{ tour.description }}</p>

      <div style="font-size: 12px; font-weight: 700; letter-spacing: 1.4px; color: #A99BB8; text-transform: uppercase; margin-bottom: 14px;">The Route</div>

      <button v-for="s in stops" :key="s.id" type="button" @click="$emit('open-stop', s.id)" :style="stopRow" :aria-label="`Preview ${s.title}`">
        <span style="position: relative; flex-shrink: 0; width: 56px; height: 56px;">
          <span :style="thumb(s)"></span>
          <span :style="badge(s)">{{ s.tourNum }}</span>
        </span>
        <span style="flex: 1; min-width: 0;">
          <span style="display: block; font-family: 'Bricolage Grotesque'; font-weight: 600; font-size: 16px;">{{ s.title }}</span>
          <span style="display: block; font-size: 12.5px; color: #A99BB8;">{{ s.period }}</span>
        </span>
        <svg width="8" height="13" viewBox="0 0 9 15" fill="none" aria-hidden="true" style="flex-shrink: 0;"><path d="M1 1 L7.5 7.5 L1 14" stroke="#968ba8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
    </div>

    </div>
    <div :style="ctaWrap">
      <button @click="$emit('start')" :style="cta">
        Start tour
        <svg width="9" height="15" viewBox="0 0 9 15" fill="none"><path d="M1 1 L7.5 7.5 L1 14" stroke="#17111f" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
const props = defineProps({
  tour: { type: Object, required: true },
  stops: { type: Array, default: () => [] },
  durationLabel: { type: String, default: '~1h 50m' },
  distanceLabel: { type: String, default: '1.4mi' },
})
defineEmits(['start', 'back', 'open-stop'])

const heroStyle = computed(() => {
  const base = { height: '226px', position: 'relative', overflow: 'hidden' }
  if (props.tour.coverImageUrl) {
    return { ...base, backgroundImage: `url(${props.tour.coverImageUrl})`, backgroundSize: 'cover', backgroundPosition: props.tour.coverPosition || '50% 50%', backgroundRepeat: 'no-repeat' }
  }
  return { ...base, background: 'linear-gradient(150deg, #9B6DFF 0%, #FF4D5E 55%, #FF8C42 100%)' }
})
const creditLine = {
  display: 'inline-block', marginTop: '10px', fontSize: '11px', fontWeight: 600,
  color: 'rgba(255,255,255,0.85)', textDecoration: 'none', background: 'rgba(23,17,31,0.42)',
  backdropFilter: 'blur(4px)', padding: '3px 9px', borderRadius: '7px',
  maxWidth: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
}
const backBtn = {
  position: 'absolute', top: '56px', left: '18px', width: '38px', height: '38px', borderRadius: '50%',
  background: 'rgba(23,17,31,0.5)', backdropFilter: 'blur(6px)', border: 'none', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}
const stopRow = {
  display: 'flex', alignItems: 'center', gap: '14px', width: '100%', padding: '8px 0',
  borderBottom: '1px solid rgba(246,239,230,0.07)', borderTop: 'none', borderLeft: 'none', borderRight: 'none',
  background: 'none', color: 'inherit', textAlign: 'left', cursor: 'pointer',
}
const stat = { flex: 1, background: '#241a2e', borderRadius: '13px', padding: '12px 14px' }
const statNum = { display: 'block', fontFamily: "'Bricolage Grotesque'", fontWeight: 700, fontSize: '19px' }
const statLbl = { fontSize: '11.5px', color: '#A99BB8' }
const ctaWrap = {
  position: 'absolute', bottom: 0, left: 0, right: 0, padding: '16px 24px 30px',
  background: 'linear-gradient(to top, #17111f 60%, transparent)', zIndex: 10,
}
const cta = {
  width: '100%', height: '56px', border: 'none', borderRadius: '16px', cursor: 'pointer',
  fontFamily: "'Bricolage Grotesque'", fontWeight: 700, fontSize: '17px', color: '#17111f',
  background: 'linear-gradient(100deg, #FFC53D, #FF8C42)', display: 'flex',
  alignItems: 'center', justifyContent: 'center', gap: '9px',
}
function thumb(s) {
  // thumbnail = the "first" image (slider's left/first slot = historic), falling
  // back to the hero when there's only one — kept consistent with the slider order
  const img = s.historicImageUrl || s.heroImageUrl
  const pos = (s.historicImageUrl ? s.historicPosition : s.heroPosition) || '50% 50%'
  const base = { width: '56px', height: '56px', display: 'block', borderRadius: '13px' }
  if (img) return { ...base, backgroundImage: `url(${img})`, backgroundSize: 'cover', backgroundPosition: pos, backgroundRepeat: 'no-repeat' }
  return { ...base, background: `linear-gradient(150deg, ${s.hue} 0%, #2a1d38 85%)` }
}
function badge(s) {
  return {
    position: 'absolute', top: '-5px', left: '-5px', width: '23px', height: '23px', borderRadius: '8px',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Bricolage Grotesque'",
    fontWeight: 700, fontSize: '13px', color: '#17111f', background: s.hue, border: '2px solid #17111f',
  }
}
</script>
