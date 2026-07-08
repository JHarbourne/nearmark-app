<!-- Story picker – shown when a location has 2+ stories (e.g. the Arts Trail hub
     listing every exhibiting artist). A single-story location skips this entirely
     and opens the card directly (see App.openStory). -->
<template>
  <div :style="wrap">
    <div :style="header">
      <button @click="$emit('close')" :style="backBtn" aria-label="Back">
        <svg width="10" height="16" viewBox="0 0 10 16" fill="none" aria-hidden="true"><path d="M8.5 1 L2 8 L8.5 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
      <div style="min-width: 0;">
        <div :style="eyebrow">{{ location.stories.length }} stories</div>
        <h1 :style="title">{{ typo(location.title) }}</h1>
      </div>
    </div>

    <div :style="listWrap">
      <button
        v-for="s in location.stories"
        :key="s.storyId"
        type="button"
        :style="row"
        @click="$emit('open', s.storyId)"
        :aria-label="`Open ${s.heading}`"
      >
        <span :style="thumb(s)"></span>
        <span style="flex: 1; min-width: 0;">
          <span :style="rowHeading">{{ typo(s.heading) }}</span>
          <span v-if="s.significance || s.period" :style="rowSub">{{ typo(s.significance || s.period) }}</span>
        </span>
        <svg width="8" height="13" viewBox="0 0 9 15" fill="none" aria-hidden="true" style="flex-shrink: 0;"><path d="M1 1 L7.5 7.5 L1 14" stroke="var(--ink-faint)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
    </div>
  </div>
</template>

<script setup>
import { typo } from '../lib/typography.js'
import { badgeColors } from '../lib/tokens.js'
defineProps({ location: { type: Object, required: true } })
defineEmits(['open', 'close'])

const wrap = { position: 'absolute', inset: 0, zIndex: 60, background: 'var(--bg)', color: 'var(--ink)', display: 'flex', flexDirection: 'column' }
const header = { display: 'flex', alignItems: 'flex-start', gap: '14px', padding: 'calc(18px + env(safe-area-inset-top)) 22px 14px' }
const eyebrow = { fontSize: '12px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'var(--ink-muted)' }
const title = { fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 'clamp(24px, 7vw, 30px)', lineHeight: 1.1, letterSpacing: '-0.5px', margin: '4px 0 0', color: 'var(--ink)' }
const backBtn = { flexShrink: 0, width: '38px', height: '38px', borderRadius: '50%', background: 'var(--raised)', color: 'var(--ink)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }
const listWrap = { flex: 1, overflowY: 'auto', padding: '4px 16px calc(24px + env(safe-area-inset-bottom))' }
const row = { display: 'flex', alignItems: 'center', gap: '14px', width: '100%', padding: '12px 8px', borderBottom: '1px solid var(--line)', borderTop: 'none', borderLeft: 'none', borderRight: 'none', background: 'none', color: 'inherit', textAlign: 'left', cursor: 'pointer' }
const rowHeading = { display: 'block', fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '17px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }
const rowSub = { display: 'block', fontSize: '13px', color: 'var(--ink-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }

function thumb(s) {
  const base = { flexShrink: 0, width: '58px', height: '58px', borderRadius: '14px', display: 'block' }
  if (s.thumbnailUrl || s.heroImageUrl) {
    return { ...base, backgroundImage: `url(${s.thumbnailUrl || s.heroImageUrl})`, backgroundSize: 'cover', backgroundPosition: s.heroPosition || '50% 50%', backgroundRepeat: 'no-repeat' }
  }
  return { ...base, background: badgeColors(s.hue).bg }
}
</script>
