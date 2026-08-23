<!-- Story editor – the standalone screen for one story (Tour → Location → Story).
     A location can hold several stories; this edits one of them on its own screen
     (used when a location has 2+ stories – the single-story case is edited inline
     in the Location editor instead). The content form itself is the shared
     <StoryFields> component; this wrapper adds the page header, the Published/Draft
     toggle, Save, and a live preview. -->
<template>
  <div>
    <div class="pagehead">
      <div>
        <h1>{{ isNew ? 'New story' : 'Edit story' }}</h1>
        <p class="muted" style="margin:2px 0 0; font-size:13px;">for <strong>{{ location?.title || 'location' }}</strong></p>
      </div>
      <button class="btn btn-ghost" @click="back">← Back to location</button>
    </div>

    <div class="editor-cols" style="display:grid; grid-template-columns: 1.1fr 0.9fr; gap:24px; align-items:start;">
      <div class="card" style="padding:22px;">
        <StoryFields ref="fields" :story="form" :contact="contact" />

        <div style="display:flex; align-items:center; gap:12px; margin-top:22px; flex-wrap:wrap;">
          <div class="seg-toggle" role="group" aria-label="Visibility">
            <button type="button" :class="{ on: form.status === 'published' }" @click="form.status = 'published'">Published</button>
            <button type="button" :class="{ on: form.status !== 'published' }" @click="form.status = 'draft'">Draft</button>
          </div>
          <button class="btn btn-primary" @click="save()" :disabled="saving">{{ saving ? 'Saving…' : 'Save story' }}</button>
          <span v-if="flash" role="status" style="font-size:13px; font-weight:600; color:var(--green);">{{ flash }}</span>
          <button class="btn btn-ghost btn-sm" style="margin-left:auto;" @click="back">← Back to location</button>
        </div>
      </div>

      <!-- right: preview -->
      <div style="display:flex; flex-direction:column; gap:20px;">
        <div class="card" style="padding:18px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <h3 style="margin:0; font-size:15px;">Preview</h3>
            <button class="btn btn-ghost btn-sm" @click="showPreview = !showPreview">{{ showPreview ? 'Hide' : 'Preview as story card' }}</button>
          </div>
          <div v-if="showPreview" style="margin-top:12px;">
            <StoryCard :loc="previewLoc" embedded :audio-on="false" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, computed, onMounted, onUnmounted } from 'vue'
import { store } from '../store.js'
import { HUE_OPTIONS } from '../../lib/tokens.js'
import { parseLinks } from '../../lib/supabase.js'
import StoryFields from '../components/StoryFields.vue'
import StoryCard from '../../components/StoryCard.vue'
import { config } from '../../config.js'

// context: the parent location (by recordId) + the story being edited (by storyId)
const location = computed(() => store.locations.find((l) => l.recordId === store.params.locationId) || null)
const existing = store.params.storyId
  ? (location.value?.stories || []).find((s) => s.storyId === store.params.storyId)
  : null
const isNew = !existing

const blank = {
  storyId: undefined, locationId: store.params.locationId, sortOrder: (location.value?.stories?.length || 0) + 1,
  heading: '', period: '', significance: '', summary: '', wikiUrl: config.wikiBaseUrl, linkLabel: '',
  heroImageUrl: '', historicImageUrl: '', sliderAfterUrl: '', heroPosition: '50% 50%', historicPosition: '50% 50%', sliderAfterPosition: '50% 50%',
  imageAlt: '', historicAlt: '', imageLabel: '', historicLabel: '', photoCredit: '', photoCreditUrl: '', showPhotoCredit: true,
  historicCredit: '', historicCreditUrl: '', portraitUrl: '', portraitAlt: '', portraitCaption: '', portraitCredit: '', portraitCreditUrl: '',
  audioUrl: '', audioDuration: 0, transcript: '', videoUrl: '', videoCaption: '', thumbnailUrl: '', caption: '', links: '',
  hue: HUE_OPTIONS[0].value, relatedIds: [], notesInternal: '', status: 'published',
}
const form = reactive(existing ? JSON.parse(JSON.stringify(existing)) : { ...blank })
if (form.showPhotoCredit === undefined) form.showPhotoCredit = true
if (!form.status) form.status = 'published' // pre-028 stories default to published
form.locationId = store.params.locationId // always bind to the parent

const fields = ref(null)

// ── private owner contact (participants table – never part of the story form) ──
const contact = reactive({ contact_email: '', contact_mobile: '' })
let participantExisted = false
const contactBaseline = ref(JSON.stringify(contact))
async function loadContact() {
  if (!form.storyId) return
  const p = await store.getParticipant(form.storyId)
  if (p) {
    contact.contact_email = p.contact_email || ''
    contact.contact_mobile = p.contact_mobile || ''
    participantExisted = true
  }
  contactBaseline.value = JSON.stringify(contact)
}

// ── live preview: merge the story form with the parent location identity into the
// shape StoryCard reads (heading → title, plus lat/lng/tourNum/locationTitle),
// mirroring App.vue's cardFromStory. Reactive, so it tracks edits as they're made.
const previewLoc = computed(() => ({
  ...form,
  title: form.heading || 'Untitled',
  id: location.value?.id,
  recordId: location.value?.recordId,
  lat: location.value?.lat ?? null,
  lng: location.value?.lng ?? null,
  tourNum: location.value?.tourNum ?? null,
  locationTitle: location.value?.title || '',
  linkList: parseLinks(form.links),
}))

// ── unsaved-changes guard ──
const baseline = ref(JSON.stringify(form))
const isDirty = () => JSON.stringify(form) !== baseline.value || JSON.stringify(contact) !== contactBaseline.value
function onBeforeUnload(e) { if (isDirty()) { e.preventDefault(); e.returnValue = '' } }
onMounted(() => { store.registerDirtyCheck(isDirty, save); window.addEventListener('beforeunload', onBeforeUnload); loadContact() })
onUnmounted(() => { store.clearDirtyCheck(); window.removeEventListener('beforeunload', onBeforeUnload) })

const showPreview = ref(false)

const saving = ref(false)
const flash = ref('')
let flashTimer
async function save() {
  if (!form.heading) { alert('Heading is required.'); return }
  fields.value?.normalize()
  saving.value = true
  try {
    const saved = await store.saveStory({ ...form })
    if (!form.storyId && saved?.id) form.storyId = saved.id
    // Persist the private owner contact once the story has an id. Upsert when
    // there's something to store, or when a record already exists (so clears stick).
    if (form.storyId && (contact.contact_email || contact.contact_mobile || participantExisted)) {
      await store.saveParticipant(form.storyId, { contact_email: contact.contact_email, contact_mobile: contact.contact_mobile })
      participantExisted = true
    }
    const inUse = new Set(fields.value?.inUseUrls() || [])
    for (const url of fields.value?.sessionUploads || []) if (!inUse.has(url)) await store.removeMedia(url).catch(() => {})
    baseline.value = JSON.stringify(form)
    contactBaseline.value = JSON.stringify(contact)
    flash.value = 'Saved ✓'
    clearTimeout(flashTimer)
    flashTimer = setTimeout(() => { flash.value = '' }, 4000)
  } catch (e) { alert('Save failed: ' + e.message) } finally { saving.value = false }
}
function back() { store.go('locationEditor', { id: location.value?.id }) }
</script>
