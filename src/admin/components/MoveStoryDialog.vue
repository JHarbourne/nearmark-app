<!-- Pick a location to move a story to. Lists every other location (searchable);
     selecting one emits its recordId so the caller can reassign the story. The
     story keeps all its content + owner/approval — only its location changes. -->
<template>
  <!-- eslint-disable-next-line vuejs-accessibility/no-static-element-interactions -- modal backdrop: Esc + click-outside are shortcuts; the Cancel button + list are the accessible paths -->
  <div role="dialog" aria-modal="true" aria-labelledby="move-title"
    style="position:fixed; inset:0; z-index:200; display:flex; align-items:center; justify-content:center; padding:20px; background:rgba(20,16,28,0.45);"
    @keydown.esc="$emit('close')" @click.self="$emit('close')">
    <div style="background:var(--card,#fff); color:var(--ink); border:1px solid var(--line); border-radius:16px; padding:20px 20px 16px; max-width:460px; width:100%; max-height:80vh; display:flex; flex-direction:column; box-shadow:0 20px 60px rgba(0,0,0,0.35);">
      <h2 id="move-title" style="margin:0 0 4px; font-size:18px;">Move story to another location</h2>
      <p class="muted" style="margin:0 0 14px; font-size:13.5px; line-height:1.5;">
        Moving <strong>{{ story.heading || 'this story' }}</strong> keeps all its content and its owner/approval — only the pin it sits under changes.
      </p>
      <input ref="searchEl" type="text" v-model="q" placeholder="Search locations…" aria-label="Search locations" style="margin-bottom:12px;" />
      <div style="overflow-y:auto; border:1px solid var(--line); border-radius:10px;">
        <button v-for="l in matches" :key="l.recordId" type="button" class="move-row"
          style="display:flex; align-items:center; gap:10px; width:100%; text-align:left; padding:10px 12px; border:none; border-bottom:1px solid var(--line); background:none; color:inherit; cursor:pointer;"
          @click="$emit('select', l.recordId)">
          <span :style="{ flexShrink:0, width:'14px', height:'14px', borderRadius:'4px', background: l.hue || '#8a7d97' }"></span>
          <span style="flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-weight:600;">{{ l.title }}</span>
          <span class="muted" style="font-size:12px; white-space:nowrap;">{{ (l.stories || []).length }} {{ (l.stories || []).length === 1 ? 'story' : 'stories' }}</span>
        </button>
        <p v-if="!matches.length" class="muted" style="padding:16px; margin:0; font-size:13px; text-align:center;">No other locations match.</p>
      </div>
      <div style="display:flex; justify-content:flex-end; margin-top:14px;">
        <button class="btn btn-ghost" @click="$emit('close')">Cancel</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { store } from '../store.js'

const props = defineProps({
  story: { type: Object, required: true },
  excludeId: { type: String, default: '' }, // the current location's recordId
})
defineEmits(['close', 'select'])

const q = ref('')
const searchEl = ref(null)
onMounted(() => searchEl.value?.focus())

const matches = computed(() => {
  const term = q.value.trim().toLowerCase()
  return store.locations
    .filter((l) => l.recordId && l.recordId !== props.excludeId)
    .filter((l) => !term || (l.title || '').toLowerCase().includes(term))
    .sort((a, b) => (a.title || '').localeCompare(b.title || ''))
})
</script>

<style scoped>
.move-row:hover { background: var(--bg); }
.move-row:last-child { border-bottom: none; }
</style>
