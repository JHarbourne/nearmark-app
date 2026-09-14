<!-- Event page for an Announcement ("What's on"). A simple, read-only page — NOT a
     tour. Reached from the Tour list, or /?event=<slug>. See docs/announcements-spec.md. -->
<template>
  <div style="position: absolute; inset: 0; overflow-y: auto;">
    <button @click="$emit('back')" :style="backBtn" aria-label="Back">
      <svg width="10" height="16" viewBox="0 0 10 16" fill="none" aria-hidden="true"><path d="M8.5 1 L2 8 L8.5 15" stroke="var(--ink)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </button>

    <!-- hero -->
    <div :style="hero">
      <div v-if="!a.imageUrl" style="position:absolute; inset:0; opacity:0.22; background-image: radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1.4px); background-size: 13px 13px;"></div>
      <div style="position:absolute; inset:0; background: linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.25) 48%, rgba(0,0,0,0) 76%);"></div>
      <span :style="eventTag">What's on</span>
      <div style="position:absolute; left:24px; right:24px; bottom:18px;">
        <div v-if="whenLabel" style="font-size:12px; font-weight:700; letter-spacing:1.2px; color:rgba(255,255,255,0.92); text-transform:uppercase;">{{ whenLabel }}</div>
        <h1 style="font-family:var(--font-heading); font-weight:700; font-size:30px; line-height:1.04; margin:6px 0 0; color:#fff;">{{ a.title }}</h1>
      </div>
    </div>

    <div style="padding: 18px 24px 48px;">
      <!-- caption + credit under the photo (same as a story card) -->
      <p v-if="a.imageCaption || showCredit" style="margin:0 0 14px; font-size:12.5px; color:var(--ink-muted);">
        <span v-if="a.imageCaption" style="font-style:italic;">{{ a.imageCaption }}</span>
        <span v-if="showCredit">{{ a.imageCaption ? ' · ' : '' }}Photo: <a v-if="a.imageCreditUrl" :href="a.imageCreditUrl" target="_blank" rel="noopener" style="color:inherit; text-decoration:underline;">{{ a.imageCredit }}</a><template v-else>{{ a.imageCredit }}</template></span>
      </p>

      <!-- where it is: venue, address, and a "Directions" link (device maps app) -->
      <div v-if="a.place || a.address || hasCoords" style="margin:0 0 16px;">
        <p v-if="a.place" style="display:flex; align-items:center; gap:8px; margin:0; font-weight:600; color:var(--ink-soft);">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex-shrink:0;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0Z"/><circle cx="12" cy="10" r="3"/></svg>
          {{ a.place }}
        </p>
        <p v-if="a.address" style="margin:3px 0 0 24px; font-size:13.5px; color:var(--ink-muted);">{{ a.address }}</p>
        <a v-if="hasCoords" :href="directionsHref" target="_blank" rel="noopener" style="display:inline-flex; align-items:center; gap:4px; margin:6px 0 0 24px; font-size:13.5px; font-weight:700; color:var(--accent-warm); text-decoration:none;">
          Directions
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>
        </a>
      </div>

      <!-- eslint-disable-next-line vue/no-v-html -- HTML-escaped in renderBody; only safe tags emitted -->
      <div v-if="a.description" class="ann-body" v-html="descriptionHtml"></div>

      <a v-if="a.linkUrl" :href="a.linkUrl" target="_blank" rel="noopener" :style="linkBtn">
        {{ a.linkLabel || 'Find out more' }}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="margin-left:6px;"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
      </a>

      <button v-if="linkedTour" @click="$emit('open-tour', linkedTour.id)" :style="walkBtn">
        Start the walk: {{ linkedTour.title }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { renderBody } from '../lib/richtext.js'
import { eventWhen } from '../lib/eventtime.js'

const props = defineProps({
  announcement: { type: Object, required: true },
  tours: { type: Array, default: () => [] },
})
defineEmits(['back', 'open-tour'])

const a = computed(() => props.announcement)
const descriptionHtml = computed(() => renderBody(props.announcement.description || ''))
const linkedTour = computed(() => props.announcement.tourSlug ? props.tours.find((t) => t.id === props.announcement.tourSlug) || null : null)
const whenLabel = computed(() => eventWhen(props.announcement.eventStart, props.announcement.eventEnd))
const showCredit = computed(() => !!props.announcement.imageCredit && props.announcement.showImageCredit !== false)

// "Directions" — open the device maps app to the place (Apple Maps on iOS, else Google).
const hasCoords = computed(() => props.announcement.lat != null && props.announcement.lng != null)
const directionsHref = computed(() => {
  if (!hasCoords.value) return ''
  const dest = `${props.announcement.lat},${props.announcement.lng}`
  const label = encodeURIComponent(props.announcement.title || 'Event')
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
    ? `https://maps.apple.com/?daddr=${dest}&q=${label}`
    : `https://www.google.com/maps/dir/?api=1&destination=${dest}`
})

const backBtn = {
  position: 'absolute', top: '18px', left: '18px', zIndex: 5,
  width: '38px', height: '38px', borderRadius: '50%', background: 'var(--overlay-panel)',
  border: '1px solid var(--line)', cursor: 'pointer', display: 'flex',
  alignItems: 'center', justifyContent: 'center',
}
const hero = computed(() => {
  const base = { position: 'relative', height: '230px', overflow: 'hidden' }
  return props.announcement.imageUrl
    ? { ...base, backgroundImage: `url(${props.announcement.imageUrl})`, backgroundSize: 'cover', backgroundPosition: props.announcement.imagePosition || '50% 50%', backgroundRepeat: 'no-repeat' }
    : { ...base, background: 'var(--grad-brand)' }
})
const eventTag = {
  position: 'absolute', top: '16px', right: '16px', fontSize: '11px', fontWeight: 700,
  letterSpacing: '0.6px', textTransform: 'uppercase', color: '#fff',
  background: 'var(--accent, #9B6DFF)', padding: '4px 10px', borderRadius: '20px',
}
const linkBtn = {
  display: 'inline-flex', alignItems: 'center', marginTop: '18px', padding: '11px 18px',
  borderRadius: '12px', background: 'var(--raised)', border: '1px solid var(--line)',
  color: 'var(--ink)', fontWeight: 600, fontSize: '14px', textDecoration: 'none',
}
const walkBtn = {
  display: 'block', width: '100%', marginTop: '14px', padding: '14px', borderRadius: '12px',
  background: 'var(--grad-warm)', border: 'none', color: '#1b1020', fontWeight: 700,
  fontSize: '15px', cursor: 'pointer', fontFamily: 'inherit',
}
</script>

<style scoped>
.ann-body { font-family: var(--font-body); font-size: 16px; line-height: 1.6; color: var(--ink-soft); }
.ann-body :deep(p) { margin: 0 0 12px; }
.ann-body :deep(ul) { margin: 0 0 12px; padding-left: 20px; }
.ann-body :deep(a) { color: var(--accent); }
</style>
