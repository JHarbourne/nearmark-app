<!-- Story card sheet (BRD §9.1 screen 7, §10 "Story Card") – verbatim styling
     from the prototype. Audio is a real HTML5 Audio element; hero supports image
     or muted looping background video; "Read full article" opens wiki_url. -->
<template>
  <div style="position: absolute; inset: 0; z-index: 60;">
    <button @click="$emit('close')" :style="[scrim, scrimDrag]" aria-label="Close story" tabindex="-1"></button>
    <div ref="sheetRef" :style="[sheet, sheetDrag]" role="dialog" aria-modal="true" :aria-label="loc.title" @touchstart="onTouchStart" @touchend="onTouchEnd" @touchcancel="onTouchEnd">
      <div ref="scrollRef" style="overflow-y: auto;">
        <!-- hero: a static header image (or looping video). This same image is
             the location's thumbnail. The before/after slider now lives in the
             body, after the first paragraph, so it gets its own room. -->
        <div style="height: 200px; position: relative; background: var(--raised); overflow: hidden;">
          <video v-if="heroVideoUrl" :src="heroVideoUrl" autoplay muted loop playsinline :aria-label="loc.caption ? null : (loc.imageAlt || loc.title)" :style="[heroMedia, { objectPosition: loc.heroPosition || '50% 50%' }]"></video>
          <div v-else :style="heroFill" :role="(loc.heroImageUrl && !loc.caption) ? 'img' : null" :aria-label="(loc.heroImageUrl && !loc.caption) ? (loc.imageAlt || loc.title) : null"></div>
          <div style="position: absolute; inset: 0; pointer-events: none; background: linear-gradient(to top, rgba(28,21,38,0.94) 1%, rgba(28,21,38,0) 42%);"></div>
          <span style="position: absolute; top: 11px; left: 50%; transform: translateX(-50%); width: 38px; height: 4px; border-radius: 2px; background: rgba(255,255,255,0.6); pointer-events: none; z-index: 3;"></span>
          <button ref="closeRef" @click="$emit('close')" :style="closeBtn" aria-label="Close story">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M1 1 L11 11 M11 1 L1 11" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/></svg>
          </button>
          <span :style="period">{{ loc.period }}</span>
          <!-- photographer / source credit for the header image -->
          <component v-if="loc.photoCredit && loc.showPhotoCredit !== false" :is="loc.photoCreditUrl ? 'a' : 'span'" :href="loc.photoCreditUrl || null" target="_blank" rel="noopener" :style="credit">Photo: {{ loc.photoCredit }}</component>
        </div>

        <div style="padding: 18px 22px calc(26px + env(safe-area-inset-bottom));">
          <p v-if="loc.caption" style="font-family: var(--font-body); font-style: italic; font-size: 13.5px; line-height: 1.45; color: var(--ink-muted); margin: 0 0 12px;">{{ typo(loc.caption) }}</p>
          <h2 style="font-family: var(--font-heading); font-weight: 700; font-size: 27px; line-height: 1.05; letter-spacing: -0.6px; margin: 0;">{{ typo(loc.title) }}</h2>
          <p style="font-size: 13.5px; color: var(--ink-muted); margin: 7px 0 0; font-weight: 500;">{{ typo(loc.significance) }}</p>

          <!-- audio player (hidden if no narration available) -->
          <div v-if="showAudio" style="margin: 20px 0 22px; padding: 13px 14px; background: var(--raised); border-radius: 16px; display: flex; align-items: center; gap: 13px;">
            <button @click="onPlay" :style="playBtn" :aria-label="audio.playing.value ? 'Pause audio narration' : 'Play audio narration'">
              <svg v-if="audio.playing.value" width="15" height="15" viewBox="0 0 14 14" fill="none" aria-hidden="true"><rect x="2" y="1.5" width="3.4" height="11" rx="1" fill="var(--bg)"/><rect x="8.6" y="1.5" width="3.4" height="11" rx="1" fill="var(--bg)"/></svg>
              <svg v-else width="15" height="15" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M3 1.5 L12 7 L3 12.5 Z" fill="var(--bg)"/></svg>
            </button>
            <div style="flex: 1; min-width: 0;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 7px;">
                <span style="font-size: 12px; font-weight: 700;">Audio narration</span>
                <span style="font-size: 11.5px; color: var(--ink-muted); font-variant-numeric: tabular-nums;">{{ fmt(audio.currentTime.value) }} / {{ fmt(audio.duration.value) }}</span>
              </div>
              <div
                role="slider"
                tabindex="0"
                aria-label="Audio position"
                :aria-valuemin="0"
                :aria-valuemax="Math.round(audio.duration.value) || 0"
                :aria-valuenow="Math.round(audio.currentTime.value)"
                :aria-valuetext="`${fmt(audio.currentTime.value)} of ${fmt(audio.duration.value)}`"
                @click="scrub"
                @keydown="onSeekKey"
                style="height: 6px; border-radius: 3px; background: var(--toggle-off); cursor: pointer; position: relative; outline-offset: 4px;"
              >
                <div :style="progress"></div>
              </div>
            </div>
          </div>
          <div v-else style="height: 12px;"></div>

          <!-- audio transcript (WCAG 1.2.1): collapsed by default, shown only when one exists -->
          <div v-if="showTranscript" style="margin: -10px 0 20px;">
            <button @click="transcriptOpen = !transcriptOpen" :aria-expanded="transcriptOpen" aria-controls="loc-transcript-panel" :style="transcriptToggle">
              <svg width="11" height="11" viewBox="0 0 14 14" fill="none" aria-hidden="true" :style="{ transition: 'transform 0.18s', transform: transcriptOpen ? 'rotate(90deg)' : 'none' }"><path d="M4 2 L10 7 L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
              {{ transcriptOpen ? 'Hide transcript' : 'Show transcript' }}
            </button>
            <div v-if="transcriptOpen" id="loc-transcript-panel" :style="transcriptPanel">
              <p v-for="(para, i) in transcriptParas" :key="i" style="margin: 0 0 10px;">
                <template v-for="(seg, j) in para" :key="j"><em v-if="seg.sound" :style="soundCue">{{ seg.text }}</em><template v-else>{{ seg.text }}</template></template>
              </p>
            </div>
          </div>

          <!-- story text (all of it) sits above the slider; Markdown subset: **bold**, *italic*, - bullets -->
          <!-- eslint-disable-next-line vue/no-v-html -- input is HTML-escaped in renderBody; only <p>/<ul>/<li>/<strong>/<em> are emitted -->
          <div class="story-body" v-html="bodyHtml"></div>

          <!-- before/after reveal slider, below the hero + text (only when both a today + a historic image exist) -->
          <figure v-if="showSlider" :style="sliderFig">
            <img-comparison-slider class="story-slider" value="50">
              <figure slot="first" class="ics-fig">
                <img :src="loc.historicImageUrl" :alt="loc.caption ? '' : (loc.historicAlt || (loc.title + ' – historic image, ' + loc.period))" :style="{ objectPosition: loc.historicPosition || '50% 50%' }" />
                <figcaption v-if="loc.historicLabel || loc.period" class="ics-label ics-left">{{ loc.historicLabel || loc.period }}</figcaption>
              </figure>
              <figure slot="second" class="ics-fig">
                <img :src="loc.sliderAfterUrl || loc.heroImageUrl" :alt="loc.caption ? '' : (loc.imageAlt || (loc.title + ' – today'))" :style="{ objectPosition: (loc.sliderAfterUrl ? loc.sliderAfterPosition : loc.heroPosition) || '50% 50%' }" />
                <figcaption v-if="loc.imageLabel" class="ics-label ics-right">{{ loc.imageLabel }}</figcaption>
              </figure>
            </img-comparison-slider>
            <component v-if="loc.historicCredit" :is="loc.historicCreditUrl ? 'a' : 'span'" :href="loc.historicCreditUrl || null" target="_blank" rel="noopener" :style="creditSliderL">Photo: {{ loc.historicCredit }}</component>
            <component v-if="loc.photoCredit && loc.showPhotoCredit !== false" :is="loc.photoCreditUrl ? 'a' : 'span'" :href="loc.photoCreditUrl || null" target="_blank" rel="noopener" :style="creditSliderR">Photo: {{ loc.photoCredit }}</component>
          </figure>

          <!-- embedded YouTube player (when the Video URL is a YouTube link, not a file) -->
          <div v-if="ytEmbedUrl" :style="videoFrame">
            <iframe :src="ytEmbedUrl" :title="`${loc.title} – video`" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin" style="position:absolute; inset:0; width:100%; height:100%; border:0;"></iframe>
          </div>

          <!-- second in-body photo (a person, a detail, anything) – not full-bleed -->
          <figure v-if="loc.portraitUrl" :style="portraitFig">
            <img :src="loc.portraitUrl" :alt="loc.portraitAlt || (loc.title + ' – photo')" :style="portraitImg" />
            <figcaption v-if="loc.portraitCaption" :style="portraitCap">{{ typo(loc.portraitCaption) }}</figcaption>
            <figcaption v-if="loc.portraitCredit" :style="portraitCreditLine"><component :is="loc.portraitCreditUrl ? 'a' : 'span'" :href="loc.portraitCreditUrl || null" target="_blank" rel="noopener" style="color: inherit; text-decoration: none;">Photo: {{ loc.portraitCredit }}</component></figcaption>
          </figure>

          <a v-if="loc.wikiUrl" :href="loc.wikiUrl" target="_blank" rel="noopener" :style="wikiLink" @click="track('wiki_clicked', { location_id: loc.id, title: loc.title })">
            <span style="display: flex; align-items: center; gap: 11px;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M5 4 h9 a2 2 0 0 1 2 2 v13 a1 1 0 0 1-1.5 0.85 L12 18 l-2.5 1.85 A1 1 0 0 1 8 19 V6 a2 2 0 0 1 2-2 Z" stroke="var(--accent-warm)" stroke-width="1.7" stroke-linejoin="round"/></svg>
              <span style="font-size: 14.5px; font-weight: 600;">{{ loc.linkLabel || urlLabel }}</span>
            </span>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 11 L11 3 M5 3 H11 V9" stroke="var(--ink-muted)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </a>

          <div v-if="loc.linkList && loc.linkList.length" style="margin-top: 20px;">
            <div style="font-size: 11.5px; font-weight: 700; letter-spacing: 1.3px; color: var(--ink-muted); text-transform: uppercase; margin-bottom: 9px;">Further reading</div>
            <a v-for="(lnk, i) in loc.linkList" :key="i" :href="lnk.url" target="_blank" rel="noopener" :style="furtherLink" @click="track('further_reading_clicked', { location_id: loc.id, url: lnk.url })">
              <span style="flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{{ lnk.label }}</span>
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M3 11 L11 3 M5 3 H11 V9" stroke="var(--ink-muted)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </a>
          </div>

          <div v-if="related.length" style="margin-top: 24px;">
            <div style="font-size: 11.5px; font-weight: 700; letter-spacing: 1.3px; color: var(--ink-muted); text-transform: uppercase; margin-bottom: 11px;">Nearby stories</div>
            <div style="display: flex; align-items: stretch; gap: 10px; overflow-x: auto; margin: 0 -22px; padding: 0 22px;">
              <button v-for="r in related" :key="r.id" @click="$emit('open-related', r.id)" :style="relCard">
                <span :style="{ display: 'block', width: '28px', height: '28px', borderRadius: '9px', marginBottom: '9px', background: r.hue }"></span>
                <span style="display: block; font-family: var(--font-heading); font-weight: 600; font-size: 14px; line-height: 1.15;">{{ r.title }}</span>
                <span style="display: block; font-size: 11.5px; color: var(--ink-muted); margin-top: 3px;">{{ r.period }}</span>
              </button>
            </div>
          </div>

          <button v-if="showContinue" @click="$emit('continue')" :style="continueBtn">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M5 12.5 L10 17.5 L19.5 7" stroke="var(--bg)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
            {{ continueLabel }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, watch, onMounted, onUnmounted, nextTick, ref } from 'vue'
import { useAudio } from '../composables/useAudio.js'
import { track } from '../lib/analytics.js'
import { isFileVideo, youtubeEmbed } from '../lib/video.js'
import { typo } from '../lib/typography.js'
import { renderBody } from '../lib/richtext.js'
// No custom link label? Show the link's web address (host) rather than a generic
// app-wide default, so it's always accurate (a church isn't an "artist's website").
const urlLabel = computed(() => {
  try { return new URL(props.loc.wikiUrl).hostname.replace(/^www\./, '') } catch { return props.loc.wikiUrl || '' }
})

const props = defineProps({
  loc: { type: Object, required: true },
  related: { type: Array, default: () => [] },
  audioOn: { type: Boolean, default: true },
  showContinue: { type: Boolean, default: false },
  continueLabel: { type: String, default: 'Mark visited · next stop' },
})
const emit = defineEmits(['close', 'open-related', 'continue'])

// ── pull-down-to-dismiss (touch). The X, Esc and backdrop still close too. Only
// engages when the content is scrolled to the top and the drag is downward, so it
// never fights scrolling the body. ──
const sheetRef = ref(null)
const scrollRef = ref(null)
const dragY = ref(0)
const dragging = ref(false)
let dragStartY = 0
let dragEngaged = false
let dragFromTop = true
const sheetDrag = computed(() => ({
  transform: `translateY(${dragY.value}px)`,
  transition: dragging.value ? 'none' : 'transform 0.28s cubic-bezier(0.32, 0.72, 0, 1)',
}))
const scrimDrag = computed(() => ({ opacity: dragY.value ? String(Math.max(0.25, 1 - dragY.value / 500)) : null }))
function onTouchStart(e) {
  if (e.touches.length !== 1 || dragY.value) return
  dragStartY = e.touches[0].clientY
  dragFromTop = !scrollRef.value || scrollRef.value.scrollTop <= 0
  dragEngaged = false
  dragging.value = true
}
function onDragMove(e) {
  if (!dragging.value) return
  const dy = e.touches[0].clientY - dragStartY
  if (!dragEngaged) {
    if (dy > 6 && dragFromTop) dragEngaged = true
    else { if (dy < -4 || !dragFromTop) dragging.value = false; return }
  }
  e.preventDefault() // take over from native scroll / overscroll bounce
  dragY.value = Math.max(0, dy)
}
function onTouchEnd() {
  if (!dragging.value) return
  dragging.value = false
  if (dragEngaged && dragY.value > 110) {
    dragY.value = (sheetRef.value?.offsetHeight || 700) + 40 // slide off, then close
    window.setTimeout(() => emit('close'), 200)
  } else {
    dragY.value = 0 // spring back
  }
  dragEngaged = false
}

// ── focus management for the modal sheet (WCAG 2.1.2 / 2.4.3) ──
const closeRef = ref(null)
let lastFocused = null
function onKeydown(e) { if (e.key === 'Escape') emit('close') }
onMounted(() => {
  lastFocused = document.activeElement           // remember what opened the sheet
  // preventScroll: Safari otherwise scrolls the still-animating sheet to reveal
  // the focused button, making the card jump up then settle.
  nextTick(() => { if (scrollRef.value) scrollRef.value.scrollTop = 0; closeRef.value?.focus?.({ preventScroll: true }) })
  document.addEventListener('keydown', onKeydown) // Escape closes
  // touchmove must be non-passive so we can preventDefault while pulling down
  sheetRef.value?.addEventListener('touchmove', onDragMove, { passive: false })
})
onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown)
  sheetRef.value?.removeEventListener('touchmove', onDragMove)
  if (lastFocused && lastFocused.focus) lastFocused.focus() // restore focus on close
})

const audio = useAudio()
// only show the player when a real audio file has been uploaded
const showAudio = computed(() => props.audioOn && !!props.loc.audioUrl)
// Reveal slider only when there's both a contemporary hero and a historic image,
// and no video (video keeps priority). Otherwise the hero falls back to the single image.
// Only a real video FILE drives the hero background; a YouTube link (or any non-file
// URL) never blanks the hero – it's embedded in the body instead, or ignored.
const heroVideoUrl = computed(() => (isFileVideo(props.loc.videoUrl) ? props.loc.videoUrl : ''))
const ytEmbedUrl = computed(() => youtubeEmbed(props.loc.videoUrl))
// slider needs a "before" (historic) and an "after" – the after is its own image, or the hero as a fallback
const showSlider = computed(() => !heroVideoUrl.value && !!props.loc.historicImageUrl && !!(props.loc.sliderAfterUrl || props.loc.heroImageUrl))

// Split the story into paragraphs so the before/after slider can sit after the
// first one. Blank lines separate paragraphs; single newlines are kept (pre-line).
// Body text → safe HTML: paragraphs, bullet lists and inline **bold**/*italic*,
// with house-style typography. Each line is its own spaced paragraph.
const bodyHtml = computed(() => renderBody(props.loc.summary))

// audio transcript (WCAG 1.2.1): only offered when audio is present AND a transcript exists
const transcriptOpen = ref(false)
const showTranscript = computed(() => showAudio.value && !!(props.loc.transcript && props.loc.transcript.trim()))
// split into paragraphs, then each into plain / [bracketed non-speech] segments
const transcriptParas = computed(() => {
  const t = props.loc.transcript || ''
  return t.split(/\n+/).map((line) => line.trim()).filter(Boolean).map((line) =>
    line.split(/(\[[^\]]*\])/).filter(Boolean).map((s) => ({ sound: /^\[[^\]]*\]$/.test(s), text: s })),
  )
})
// When the card's content changes — a different pin, a "nearby story", or another
// story of the same location — reset it to the top and clear drag/transcript state,
// so it never opens scrolled to wherever the previous card was left.
watch(() => [props.loc.id, props.loc.title], () => {
  transcriptOpen.value = false
  dragY.value = 0
  nextTick(() => { if (scrollRef.value) scrollRef.value.scrollTop = 0 })
})
const transcriptToggle = {
  display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '6px 2px',
  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-warm)',
  fontFamily: 'var(--font-ui)', fontSize: '13px', fontWeight: 700,
}
const transcriptPanel = {
  marginTop: '6px', padding: '14px 16px', background: 'var(--raised)', borderRadius: '14px',
  fontFamily: 'var(--font-body)', fontSize: '14.5px', lineHeight: 1.6, color: 'var(--ink-soft)',
}
const soundCue = { fontStyle: 'italic', color: 'var(--ink-muted)' }

function loadAudio() {
  audio.load(props.loc.audioUrl, props.loc.audioDuration || 0)
}
onMounted(loadAudio)
watch(() => props.loc.id, loadAudio)

function onPlay() {
  const starting = !audio.playing.value
  audio.toggle()
  if (starting) track('audio_played', { location_id: props.loc.id, title: props.loc.title })
}
function fmt(s) { return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` }
function scrub(e) {
  const rect = e.currentTarget.getBoundingClientRect()
  audio.seek((e.clientX - rect.left) / rect.width)
}
// keyboard seek for the role="slider" scrub bar (WCAG 2.1.1)
function onSeekKey(e) {
  const d = audio.duration.value || 0
  if (!d) return
  const cur = audio.currentTime.value
  let t
  switch (e.key) {
    case 'ArrowRight': case 'ArrowUp': t = cur + 5; break
    case 'ArrowLeft': case 'ArrowDown': t = cur - 5; break
    case 'PageUp': t = cur + 15; break
    case 'PageDown': t = cur - 15; break
    case 'Home': t = 0; break
    case 'End': t = d; break
    default: return
  }
  e.preventDefault()
  audio.seek(Math.max(0, Math.min(d, t)) / d)
}

const progress = computed(() => ({
  height: '6px', borderRadius: '3px',
  width: (audio.duration.value ? (audio.currentTime.value / audio.duration.value) * 100 : 0) + '%',
  background: props.loc.hue, position: 'absolute', left: 0, top: 0,
}))
const heroFill = computed(() => props.loc.heroImageUrl
  ? {
      position: 'absolute', inset: 0, width: '100%', height: '100%',
      backgroundImage: `url(${props.loc.heroImageUrl})`, backgroundSize: 'cover',
      backgroundPosition: props.loc.heroPosition || '50% 50%', backgroundRepeat: 'no-repeat',
    }
  : {
      position: 'absolute', inset: 0, width: '100%', height: '100%',
      background: `linear-gradient(150deg, ${props.loc.hue} 0%, var(--raised) 80%)`,
    })
const playBtn = computed(() => ({
  flexShrink: 0, width: '44px', height: '44px', borderRadius: '50%', border: 'none', cursor: 'pointer',
  background: props.loc.hue, display: 'flex', alignItems: 'center', justifyContent: 'center',
}))

const creditBase = {
  position: 'absolute', zIndex: 3, fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.92)',
  background: 'rgba(23,17,31,0.5)', backdropFilter: 'blur(4px)', padding: '2px 7px',
  borderRadius: '6px', textDecoration: 'none', whiteSpace: 'nowrap', overflow: 'hidden',
  textOverflow: 'ellipsis', pointerEvents: 'auto',
}
const credit = { ...creditBase, bottom: '8px', right: '12px', maxWidth: '60%' }      // single hero
const creditSliderL = { ...creditBase, bottom: '34px', left: '12px', maxWidth: '44%' } // slider: historic (before)
const creditSliderR = { ...creditBase, bottom: '34px', right: '12px', maxWidth: '44%' } // slider: hero (today)
const heroMedia = { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }
const videoFrame = { position: 'relative', aspectRatio: '16 / 9', width: '100%', margin: '20px 0 0', borderRadius: '14px', overflow: 'hidden', background: '#000' }
const scrim = { position: 'absolute', inset: 0, background: 'rgba(10,7,14,0.6)', border: 'none', cursor: 'pointer', backdropFilter: 'blur(2px)' }
const sheet = {
  // minHeight keeps sparse stories from opening only part-way (looking half-open);
  // rich content still grows to maxHeight and scrolls.
  position: 'absolute', bottom: 0, left: 0, right: 0, minHeight: '58%', maxHeight: '90%',
  display: 'flex', flexDirection: 'column',
  background: 'var(--card)', borderRadius: '26px 26px 0 0', overflow: 'hidden',
  boxShadow: '0 -10px 50px rgba(0,0,0,0.6)', animation: 'sheetUp .3s ease',
}
const closeBtn = {
  position: 'absolute', top: '14px', right: '14px', width: '32px', height: '32px', borderRadius: '50%',
  background: 'rgba(23,17,31,0.55)', backdropFilter: 'blur(6px)', border: 'none', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2,
}
// Category tag as a readable pill (was a large overlay word that fought busy
// photos). Mirrors the before/after slider's .ics-label styling.
const period = {
  position: 'absolute', bottom: '12px', left: '16px', fontFamily: 'var(--font-ui), sans-serif',
  fontSize: '11px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase',
  color: '#fff', background: 'rgba(23,17,31,0.62)', backdropFilter: 'blur(4px)',
  padding: '4px 11px', borderRadius: '999px', pointerEvents: 'none',
  maxWidth: 'calc(100% - 32px)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
}
const furtherLink = {
  display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', marginBottom: '8px',
  borderRadius: '12px', background: 'var(--raised)', border: '1px solid var(--line)',
  textDecoration: 'none', color: 'var(--ink-soft)', fontSize: '13.5px', fontWeight: 500,
}
const sliderFig = { position: 'relative', margin: '6px 0 20px', borderRadius: '16px', overflow: 'hidden' }
const portraitFig = { margin: '22px 0 0' }
const portraitImg = { display: 'block', width: '100%', borderRadius: '16px' }
const portraitCap = { fontFamily: 'var(--font-body)', fontStyle: 'italic', fontSize: '13px', color: 'var(--ink-muted)', margin: '8px 2px 0', textAlign: 'center' }
const portraitCreditLine = { fontSize: '11px', color: 'var(--ink-faint)', margin: '4px 2px 0', textAlign: 'center' }
const wikiLink = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '22px', padding: '15px 16px',
  borderRadius: '14px', background: 'var(--raised)', border: '1px solid var(--line)',
  textDecoration: 'none', color: 'var(--ink)',
}
const relCard = {
  flexShrink: 0, width: '150px', textAlign: 'left', background: 'var(--raised)', border: '1px solid var(--line)',
  borderRadius: '14px', padding: '12px 13px', cursor: 'pointer', color: 'inherit',
  // column so content stays top-aligned when the cards stretch to a shared height
  display: 'flex', flexDirection: 'column',
}
const continueBtn = {
  width: '100%', height: '54px', marginTop: '24px', border: 'none', borderRadius: '15px', cursor: 'pointer',
  fontFamily: "var(--font-button)", fontWeight: 700, fontSize: '16px', color: 'var(--bg)',
  background: 'linear-gradient(100deg, #2FBF71, #3D9BFF)', display: 'flex', alignItems: 'center',
  justifyContent: 'center', gap: '9px',
}
</script>

<style scoped>
/* rendered story body: paragraphs, bullets and inline bold/italic (see richtext.js).
   :deep() so scoped styles reach the v-html-injected elements. */
.story-body :deep(p) { font-family: var(--font-body); font-size: 17px; line-height: 1.66; color: var(--ink-soft); margin: 0 0 16px; }
.story-body :deep(ul) { margin: 0 0 16px; padding-left: 22px; }
.story-body :deep(li) { font-family: var(--font-body); font-size: 17px; line-height: 1.5; color: var(--ink-soft); margin: 0 0 6px; }
.story-body :deep(strong) { font-weight: 700; }
.story-body :deep(em) { font-style: italic; }
.story-body :deep(:last-child) { margin-bottom: 0; }

/* before/after reveal slider (img-comparison-slider) — sits in the body and
   takes the images' natural shape (3:4 or 16:9), matched Rephoto pairs so both
   sides line up. */
.story-slider {
  width: 100%;
  display: block;
  --divider-width: 2px;
  --divider-color: #ffffff;
  --default-handle-opacity: 1;
  --divider-shadow: 0 0 6px rgba(0, 0, 0, 0.4);
}
.story-slider .ics-fig { position: relative; margin: 0; width: 100%; }
.story-slider .ics-fig img { display: block; width: 100%; height: auto; }
.story-slider .ics-label {
  position: absolute;
  bottom: 12px;
  font-family: var(--font-ui), sans-serif;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.4px;
  text-transform: uppercase;
  color: #fff;
  background: rgba(23, 17, 31, 0.62);
  backdrop-filter: blur(4px);
  padding: 3px 9px;
  border-radius: 7px;
  white-space: nowrap;
}
.story-slider .ics-left { left: 14px; }
.story-slider .ics-right { right: 14px; }
</style>
