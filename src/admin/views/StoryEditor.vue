<!-- Story editor – the content form for one story (Tour → Location → Story).
     A location can hold several stories; this edits one of them. All content
     fields live here; the location holds only place/identity.
     Field order roughly follows the story card top-to-bottom: heading →
     period → significance → hero → text → (in-body: slider, 2nd photo,
     audio/video) → links → related. -->
<template>
  <div>
    <svg style="display:none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
      <symbol id="ic-upload" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4" /><path d="m6 10 6-6 6 6" /><path d="M4 20h16" /></symbol>
      <symbol id="ic-image" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.6" /><path d="m21 15-5-5L5 21" /></symbol>
    </svg>

    <div class="pagehead">
      <div>
        <h1>{{ isNew ? 'New story' : 'Edit story' }}</h1>
        <p class="muted" style="margin:2px 0 0; font-size:13px;">for <strong>{{ location?.title || 'location' }}</strong></p>
      </div>
      <button class="btn btn-ghost" @click="back">← Back to location</button>
    </div>

    <div class="editor-cols" style="display:grid; grid-template-columns: 1.1fr 0.9fr; gap:24px; align-items:start;">
      <div class="card" style="padding:22px;">
        <label for="st-heading">Heading <span class="hint">the story card title</span></label>
        <input id="st-heading" type="text" v-model="form.heading" placeholder="Story card heading" />

        <label for="st-period">Period / date <span class="hint">free text</span></label>
        <input id="st-period" type="text" v-model="form.period" placeholder="1890s · 1967 · c. 1985" />

        <label for="st-significance">Historical significance <span class="hint">one-line subtitle</span></label>
        <input id="st-significance" type="text" v-model="form.significance" />

        <!-- Hero image -->
        <p class="muted" style="font-size:12px; margin:14px 0 8px;">Images are optimised automatically on upload. For a quick upload, use a web-sized landscape JPG (around 1400&nbsp;px wide, or smaller) rather than a full-resolution phone photo.</p>
        <label for="st-hero-url">Hero image <span class="hint">the main photo, shown at the top</span></label>
        <div class="media-row">
          <div class="media-input">
            <input id="st-hero-url" type="url" v-model="form.heroImageUrl" placeholder="Paste a URL, or use the icons →" />
            <div class="media-actions">
              <label class="icon-btn" :class="{ busy: uploading.hero }" :title="uploading.hero ? 'Uploading…' : 'Upload an image from your device'">
                <svg class="ic"><use href="#ic-upload" /></svg>
                <input type="file" accept="image/*" aria-label="Upload a hero image from your device" style="display:none" @change="up($event,'heroImageUrl','image','hero')" />
              </label>
              <button type="button" class="icon-btn" title="Choose from the media library" aria-label="Choose a hero image from the media library" @click="openPicker('heroImageUrl')">
                <svg class="ic"><use href="#ic-image" /></svg>
              </button>
            </div>
          </div>
          <button v-if="canUndo('heroImageUrl')" type="button" class="btn btn-ghost btn-sm" @click="undoReplace('heroImageUrl')">↩ Undo</button>
        </div>
        <template v-if="form.heroImageUrl">
          <div role="button" tabindex="0" :style="focalBox(form.heroImageUrl, form.heroPosition, '39 / 20')" aria-label="Hero image focal point. Click, or focus and use arrow keys, to set what stays in view." @click="setFocal($event,'heroPosition')" @keydown="nudgeFocal($event,'heroPosition')">
            <span :style="focalDot(form.heroPosition)"></span>
          </div>
          <p class="muted" style="font-size:11.5px; margin:4px 0 0;">Click, or use arrow keys, to set the focal point.</p>
          <label for="st-hero-alt">Alt text <span class="hint">screen readers · skipped if a caption is set below</span></label>
          <input id="st-hero-alt" type="text" v-model="form.imageAlt" placeholder="e.g. The Café Royal frontage, Regent Street" />
          <label for="st-caption">Image caption <span class="hint">under the photo</span></label>
          <input id="st-caption" type="text" v-model="form.caption" placeholder="e.g. The Sail Lofts, on their concrete piers" />
          <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; margin:16px 0 6px;">
            <label for="st-hero-credit" style="margin:0;">Photo credit <span class="hint">photographer / source</span></label>
            <label style="display:flex; align-items:center; gap:7px; margin:0; font-size:13px; font-weight:600; cursor:pointer; white-space:nowrap;" title="Off = kept on record, hidden in the app">
              <input type="checkbox" v-model="form.showPhotoCredit" style="width:17px; height:17px; margin:0; accent-color:var(--violet);" /> Show
            </label>
          </div>
          <input id="st-hero-credit" type="text" v-model="form.photoCredit" placeholder="Photographer / source" />
          <label for="st-hero-credit-link">Credit link <span class="hint">optional</span></label>
          <input id="st-hero-credit-link" type="url" v-model="form.photoCreditUrl" placeholder="https://…" />
        </template>

        <label for="st-summary">Text <span class="hint">~80–100 words</span></label>
        <textarea id="st-summary" v-model="form.summary" rows="9"></textarea>
        <p class="hint" style="margin:5px 0 0;">Optional Markdown: <code>**bold**</code>, <code>*italic*</code>, and <code>- </code> at the start of a line for bullet points. Blank lines and new lines both start a new paragraph.</p>

        <!-- before/after slider — appears in the story body, after the text -->
        <label style="display:flex; align-items:flex-start; gap:9px; margin:22px 0 8px; font-weight:500; cursor:pointer;">
          <input type="checkbox" v-model="showHistoric" style="margin-top:3px;" />
          <span>
            <span style="display:block;">Add a before/after slider</span>
            <span class="hint" style="display:block; font-weight:400;">a historic “before” photo revealed against a “today” photo</span>
          </span>
        </label>
        <div v-if="showHistoric">
          <p class="muted" style="font-size:12.5px; margin:0 0 10px;">A reveal slider shown in the story body – these two photos are separate from the hero above.</p>
          <div class="field-row" style="align-items:end;">
            <div>
              <label for="st-historic-url">Before image <span class="hint">historic · slider LEFT</span></label>
              <div class="media-row">
                <div class="media-input">
                  <input id="st-historic-url" type="url" v-model="form.historicImageUrl" placeholder="Paste a URL, or use the icons →" />
                  <div class="media-actions">
                    <label class="icon-btn" :class="{ busy: uploading.historic }" :title="uploading.historic ? 'Uploading…' : 'Upload an image from your device'">
                      <svg class="ic"><use href="#ic-upload" /></svg>
                      <input type="file" accept="image/*" aria-label="Upload a before (historic) image from your device" style="display:none" @change="up($event,'historicImageUrl','image','historic')" />
                    </label>
                    <button type="button" class="icon-btn" title="Choose from the media library" aria-label="Choose a before image from the media library" @click="openPicker('historicImageUrl')">
                      <svg class="ic"><use href="#ic-image" /></svg>
                    </button>
                  </div>
                </div>
                <button v-if="canUndo('historicImageUrl')" type="button" class="btn btn-ghost btn-sm" @click="undoReplace('historicImageUrl')">↩ Undo</button>
              </div>
            </div>
            <div>
              <label for="st-after-url">After image <span class="hint">today · slider RIGHT · blank = reuse the hero</span></label>
              <div class="media-row">
                <div class="media-input">
                  <input id="st-after-url" type="url" v-model="form.sliderAfterUrl" placeholder="Paste a URL, or use the icons →" />
                  <div class="media-actions">
                    <label class="icon-btn" :class="{ busy: uploading.after }" :title="uploading.after ? 'Uploading…' : 'Upload an image from your device'">
                      <svg class="ic"><use href="#ic-upload" /></svg>
                      <input type="file" accept="image/*" aria-label="Upload an after (today) image from your device" style="display:none" @change="up($event,'sliderAfterUrl','image','after')" />
                    </label>
                    <button type="button" class="icon-btn" title="Choose from the media library" aria-label="Choose an after image from the media library" @click="openPicker('sliderAfterUrl')">
                      <svg class="ic"><use href="#ic-image" /></svg>
                    </button>
                  </div>
                </div>
                <button v-if="canUndo('sliderAfterUrl')" type="button" class="btn btn-ghost btn-sm" @click="undoReplace('sliderAfterUrl')">↩ Undo</button>
              </div>
            </div>
          </div>
          <div class="field-row">
            <div>
              <div v-if="form.historicImageUrl" role="button" tabindex="0" :style="focalBox(form.historicImageUrl, form.historicPosition, '4 / 3')" aria-label="Before image focal point. Click, or focus and use arrow keys, to set what stays in view." @click="setFocal($event,'historicPosition')" @keydown="nudgeFocal($event,'historicPosition')">
                <span :style="focalDot(form.historicPosition)"></span>
              </div>
            </div>
            <div>
              <div v-if="form.sliderAfterUrl" role="button" tabindex="0" :style="focalBox(form.sliderAfterUrl, form.sliderAfterPosition, '4 / 3')" aria-label="After image focal point. Click, or focus and use arrow keys, to set what stays in view." @click="setFocal($event,'sliderAfterPosition')" @keydown="nudgeFocal($event,'sliderAfterPosition')">
                <span :style="focalDot(form.sliderAfterPosition)"></span>
              </div>
            </div>
          </div>
          <div class="field-row">
            <div>
              <label for="st-historic-slabel">Caption <span class="hint">over the LEFT (before) image</span></label>
              <input id="st-historic-slabel" type="text" v-model="form.historicLabel" :placeholder="form.period ? `default: ${form.period}` : 'e.g. 1890s'" />
            </div>
            <div>
              <label for="st-hero-slabel">Caption <span class="hint">over the RIGHT (after) image</span></label>
              <input id="st-hero-slabel" type="text" v-model="form.imageLabel" placeholder="e.g. Today" />
            </div>
          </div>
          <label for="st-historic-credit">Before photo credit <span class="hint">the historic image · archive / source</span></label>
          <input id="st-historic-credit" type="text" v-model="form.historicCredit" placeholder="Archive / source" />
          <label for="st-historic-credit-link">Credit link <span class="hint">optional</span></label>
          <input id="st-historic-credit-link" type="url" v-model="form.historicCreditUrl" placeholder="https://…" />
        </div>

        <!-- second in-body photo -->
        <label style="display:flex; align-items:flex-start; gap:9px; margin:22px 0 8px; font-weight:500; cursor:pointer;">
          <input type="checkbox" v-model="showPortrait" style="margin-top:3px;" />
          <span>
            <span style="display:block;">Add a second photo</span>
            <span class="hint" style="display:block; font-weight:400;">a person or a detail, shown within the story text — separate from the hero</span>
          </span>
        </label>
        <div v-if="showPortrait">
          <label for="st-portrait-url">Second photo</label>
          <div class="media-row">
            <div class="media-input">
              <input id="st-portrait-url" type="url" v-model="form.portraitUrl" placeholder="Paste a URL, or use the icons →" />
              <div class="media-actions">
                <label class="icon-btn" :class="{ busy: uploading.portrait }" :title="uploading.portrait ? 'Uploading…' : 'Upload an image from your device'">
                  <svg class="ic"><use href="#ic-upload" /></svg>
                  <input type="file" accept="image/*" aria-label="Upload a second photo from your device" style="display:none" @change="up($event,'portraitUrl','image','portrait')" />
                </label>
                <button type="button" class="icon-btn" title="Choose from the media library" aria-label="Choose a second photo from the media library" @click="openPicker('portraitUrl')">
                  <svg class="ic"><use href="#ic-image" /></svg>
                </button>
              </div>
            </div>
            <button v-if="canUndo('portraitUrl')" type="button" class="btn btn-ghost btn-sm" @click="undoReplace('portraitUrl')">↩ Undo</button>
          </div>
          <template v-if="form.portraitUrl">
            <div class="field-row">
              <div>
                <label for="st-portrait-alt">Alt text <span class="hint">describe the photo for screen readers</span></label>
                <input id="st-portrait-alt" type="text" v-model="form.portraitAlt" placeholder="Describe the photo" />
              </div>
              <div>
                <label for="st-portrait-cap">Caption <span class="hint">optional, shown under the photo</span></label>
                <input id="st-portrait-cap" type="text" v-model="form.portraitCaption" placeholder="Optional caption" />
              </div>
            </div>
            <div class="field-row">
              <div>
                <label for="st-portrait-credit">Photo credit <span class="hint">photographer / source</span></label>
                <input id="st-portrait-credit" type="text" v-model="form.portraitCredit" placeholder="Photographer / source" />
              </div>
              <div>
                <label for="st-portrait-credit-link">Credit link <span class="hint">optional</span></label>
                <input id="st-portrait-credit-link" type="url" v-model="form.portraitCreditUrl" placeholder="https://…" />
              </div>
            </div>
          </template>
        </div>

        <!-- audio + video -->
        <label style="display:flex; align-items:flex-start; gap:9px; margin:22px 0 8px; font-weight:500; cursor:pointer;">
          <input type="checkbox" v-model="showMedia" style="margin-top:3px;" />
          <span>
            <span style="display:block;">Add audio or video</span>
            <span class="hint" style="display:block; font-weight:400;">narration, a video clip, or a YouTube link</span>
          </span>
        </label>
        <div v-if="showMedia">
          <label for="st-audio">Audio narration <span class="hint">mp3/m4a</span></label>
          <div class="media-row">
            <div class="media-input solo">
              <input id="st-audio" type="url" v-model="form.audioUrl" placeholder="Paste a URL, or upload →" />
              <div class="media-actions">
                <label class="icon-btn" :class="{ busy: uploading.audio }" :title="uploading.audio ? 'Uploading…' : 'Upload an audio file from your device'">
                  <svg class="ic"><use href="#ic-upload" /></svg>
                  <input type="file" accept="audio/*" aria-label="Upload an audio narration file from your device" style="display:none" @change="up($event,'audioUrl','audio','audio')" />
                </label>
              </div>
            </div>
            <button v-if="canUndo('audioUrl')" type="button" class="btn btn-ghost btn-sm" @click="undoReplace('audioUrl')">↩ Undo</button>
          </div>
          <div class="field-row">
            <div>
              <label for="st-audio-dur">Audio duration <span class="hint">secs</span></label>
              <input id="st-audio-dur" type="number" v-model.number="form.audioDuration" min="0" />
            </div>
            <div>
              <label for="st-video">Video URL <span class="hint">optional · mp4 or YouTube</span></label>
              <input id="st-video" type="url" v-model="form.videoUrl" placeholder="https://…" />
              <p v-if="form.videoUrl && !videoPlayable" class="warn" role="alert" style="display:flex; gap:8px; align-items:flex-start; margin:6px 0 0; font-size:12.5px; color:var(--danger,#c0392b);">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex-shrink:0; margin-top:1px;"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
                <span>Not a playable video – use a direct <strong>.mp4</strong> file or a <strong>YouTube</strong> link. Anything else is ignored in the app.</span>
              </p>
            </div>
          </div>
          <template v-if="form.audioUrl">
            <label for="st-transcript">Audio transcript <span class="hint">required for accessibility if audio is present</span></label>
            <textarea id="st-transcript" v-model="form.transcript" rows="6" placeholder="Type or paste what is spoken in the narration. Put non-speech sounds in square brackets, e.g. [Sound of church bells]."></textarea>
            <p v-if="!form.transcript.trim()" class="warn" role="alert" style="display:flex; gap:8px; align-items:flex-start; margin:6px 0 0; font-size:13px; color:var(--danger,#c0392b);">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex-shrink:0; margin-top:1px;"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
              <span>No transcript — audio without a transcript fails WCAG 1.2.1.</span>
            </p>
          </template>
        </div>

        <label for="st-wiki">URL to more information <span class="hint">optional</span></label>
        <input id="st-wiki" type="url" v-model="form.wikiUrl" :placeholder="wikiPlaceholder" />
        <p v-if="form.wikiUrl && !validWiki" style="color:var(--amber); font-size:12px; margin:6px 0 0;">Should be a {{ wikiDomain }} URL.</p>
        <template v-if="form.wikiUrl">
          <label for="st-link-label">Link button text <span class="hint">optional · blank shows the web address</span></label>
          <input id="st-link-label" type="text" v-model="form.linkLabel" :placeholder="linkUrlLabel || 'e.g. Visit the church website'" maxlength="60" />
        </template>

        <label for="st-links">Further reading / sources <span class="hint">one per line: Label | https://url</span></label>
        <textarea id="st-links" v-model="form.links" rows="3" placeholder="Colony Room gallery | https://www.theguardian.com/..."></textarea>

        <span class="field-label" id="st-hue-label">Accent colour</span>
        <div role="group" aria-labelledby="st-hue-label" style="display:flex; gap:8px;">
          <button v-for="o in hues" :key="o.value" type="button" class="swatch" :class="{ sel: form.hue === o.value }" :style="{ background: o.value }" @click="form.hue = o.value" :aria-label="o.name" :aria-pressed="form.hue === o.value" :title="o.name"></button>
        </div>

        <span class="field-label">Related locations <span class="hint">shown as “Nearby stories” at the foot of this card</span></span>
        <div v-if="form.relatedIds.length" style="display:flex; flex-wrap:wrap; gap:8px; margin:6px 0 10px;">
          <span v-for="id in form.relatedIds" :key="id" style="display:inline-flex; align-items:center; gap:7px; padding:5px 6px 5px 12px; background:var(--raised); border:1px solid var(--line); border-radius:999px; font-size:13px; font-weight:500;">
            {{ relatedTitle(id) }}
            <button type="button" class="chip-x" :aria-label="`Remove ${relatedTitle(id)}`" @click="removeRelated(id)">✕</button>
          </span>
        </div>
        <p v-else class="hint" style="margin:6px 0 10px;">None yet.</p>
        <select v-if="availableRelated.length" aria-label="Add a related location" @change="addRelated($event)">
          <option value="">+ Add a related stop…</option>
          <option v-for="l in availableRelated" :key="l.id" :value="l.id">{{ l.title }}</option>
        </select>

        <label for="st-notes">Internal notes <span class="hint">never shown in the app</span></label>
        <textarea id="st-notes" v-model="form.notesInternal" rows="2"></textarea>

        <div style="display:flex; align-items:center; gap:12px; margin-top:22px; flex-wrap:wrap;">
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
          <div v-if="showPreview" :style="previewCard">
            <div :style="previewHero"><span :style="previewPeriod">{{ form.period }}</span></div>
            <div style="padding:14px 16px;">
              <div style="font-family:'Bricolage Grotesque'; font-weight:700; font-size:20px;">{{ form.heading || 'Untitled' }}</div>
              <div style="color:#A99BB8; font-size:12.5px; margin-top:5px;">{{ form.significance }}</div>
              <p style="font-family:'Newsreader'; color:#E8E0EE; font-size:14px; line-height:1.6; margin:12px 0 0; white-space:pre-line;">{{ form.summary }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <MediaPicker :open="picker.open" :current="picker.field ? form[picker.field] : ''" @select="onPickMedia" @close="picker.open = false" />
  </div>
</template>

<script setup>
import { reactive, ref, computed, onMounted, onUnmounted } from 'vue'
import { store } from '../store.js'
import { HUE_OPTIONS } from '../../lib/tokens.js'
import { isPlayableVideo } from '../../lib/video.js'
import { config, wikiDomain } from '../../config.js'
import MediaPicker from '../components/MediaPicker.vue'

const wikiPlaceholder = config.wikiBaseUrl ? `${config.wikiBaseUrl}…` : 'https://…'
const linkUrlLabel = computed(() => { try { return new URL(form.wikiUrl).hostname.replace(/^www\./, '') } catch { return '' } })
const videoPlayable = computed(() => isPlayableVideo(form.videoUrl))
const hues = HUE_OPTIONS

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
  audioUrl: '', audioDuration: 0, transcript: '', videoUrl: '', thumbnailUrl: '', caption: '', links: '',
  hue: HUE_OPTIONS[0].value, relatedIds: [], notesInternal: '',
}
const form = reactive(existing ? JSON.parse(JSON.stringify(existing)) : { ...blank })
if (form.showPhotoCredit === undefined) form.showPhotoCredit = true
form.locationId = store.params.locationId // always bind to the parent

const showHistoric = ref(!!form.historicImageUrl)
const showMedia = ref(!!(form.audioUrl || form.videoUrl))
const showPortrait = ref(!!form.portraitUrl)

// ── unsaved-changes guard ──
const baseline = ref(JSON.stringify(form))
const isDirty = () => JSON.stringify(form) !== baseline.value
function onBeforeUnload(e) { if (isDirty()) { e.preventDefault(); e.returnValue = '' } }
onMounted(() => { store.registerDirtyCheck(isDirty); window.addEventListener('beforeunload', onBeforeUnload) })
onUnmounted(() => { store.clearDirtyCheck(); window.removeEventListener('beforeunload', onBeforeUnload) })

// ── replace-undo + orphan cleanup ──
const undoBuf = reactive({})
const sessionUploads = []
function undoReplace(field) { if (field in undoBuf) { form[field] = undoBuf[field]; delete undoBuf[field] } }
function canUndo(field) { return field in undoBuf }

const showPreview = ref(false)
const others = computed(() => store.locations.filter((l) => l.recordId !== store.params.locationId))
const availableRelated = computed(() => others.value.filter((l) => !form.relatedIds.includes(l.id)))
const relatedTitle = (id) => store.locations.find((l) => l.id === id)?.title || id
function removeRelated(id) { form.relatedIds = form.relatedIds.filter((x) => x !== id) }
function addRelated(e) { const id = e.target.value; if (id && !form.relatedIds.includes(id)) form.relatedIds.push(id); e.target.value = '' }
const validWiki = computed(() => !wikiDomain || form.wikiUrl.includes(wikiDomain))

// ── focal point picker ──
function focalBox(url, pos, aspect) {
  return { marginTop: '8px', width: '100%', aspectRatio: aspect || '39 / 20', borderRadius: '10px', border: '1px solid var(--line)', backgroundImage: `url(${url})`, backgroundSize: 'cover', backgroundPosition: pos || '50% 50%', backgroundRepeat: 'no-repeat', position: 'relative', cursor: 'crosshair' }
}
function focalDot(pos) {
  const [x, y] = (pos || '50% 50%').split(' ')
  return { position: 'absolute', left: x, top: y, transform: 'translate(-50%,-50%)', width: '16px', height: '16px', borderRadius: '50%', background: 'rgba(107,70,229,0.9)', border: '2px solid #fff', boxShadow: '0 0 0 2px rgba(0,0,0,0.35)', pointerEvents: 'none' }
}
function setFocal(e, field) {
  const r = e.currentTarget.getBoundingClientRect()
  const x = Math.round(Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100)))
  const y = Math.round(Math.max(0, Math.min(100, ((e.clientY - r.top) / r.height) * 100)))
  form[field] = `${x}% ${y}%`
}
function nudgeFocal(e, field) {
  const step = { ArrowLeft: [-5, 0], ArrowRight: [5, 0], ArrowUp: [0, -5], ArrowDown: [0, 5] }[e.key]
  if (!step) return
  e.preventDefault()
  const [cx, cy] = (form[field] || '50% 50%').split(' ').map((v) => parseInt(v, 10) || 0)
  form[field] = `${Math.max(0, Math.min(100, cx + step[0]))}% ${Math.max(0, Math.min(100, cy + step[1]))}%`
}

// ── uploads ──
const uploading = reactive({ hero: false, historic: false, after: false, portrait: false, audio: false })
async function up(e, field, kind, key) {
  const file = e.target.files[0]
  if (!file) return
  uploading[key] = true
  const prev = form[field]
  try {
    const url = await store.upload(file, kind)
    undoBuf[field] = prev
    sessionUploads.push(url)
    form[field] = url
    if (kind === 'audio') {
      const a = new Audio(URL.createObjectURL(file))
      a.addEventListener('loadedmetadata', () => { if (a.duration && isFinite(a.duration)) form.audioDuration = Math.round(a.duration) })
    }
  } catch (err) { alert('Upload failed: ' + err.message) } finally { uploading[key] = false; e.target.value = '' }
}

const picker = reactive({ open: false, field: null })
function openPicker(field) { picker.field = field; picker.open = true }
function onPickMedia(url) { if (picker.field) form[picker.field] = url }

const saving = ref(false)
const flash = ref('')
let flashTimer
async function save() {
  if (!form.heading) { alert('Heading is required.'); return }
  if (!showHistoric.value) { form.historicImageUrl = ''; form.sliderAfterUrl = '' }
  if (!showMedia.value) { form.audioUrl = ''; form.videoUrl = '' }
  if (!showPortrait.value) { form.portraitUrl = ''; form.portraitAlt = ''; form.portraitCaption = ''; form.portraitCredit = ''; form.portraitCreditUrl = '' }
  saving.value = true
  try {
    const saved = await store.saveStory({ ...form })
    if (!form.storyId && saved?.id) form.storyId = saved.id
    const inUse = new Set([form.heroImageUrl, form.historicImageUrl, form.sliderAfterUrl, form.portraitUrl, form.audioUrl].filter(Boolean))
    for (const url of sessionUploads) if (!inUse.has(url)) await store.removeMedia(url).catch(() => {})
    baseline.value = JSON.stringify(form)
    flash.value = 'Saved ✓'
    clearTimeout(flashTimer)
    flashTimer = setTimeout(() => { flash.value = '' }, 4000)
  } catch (e) { alert('Save failed: ' + e.message) } finally { saving.value = false }
}
function back() { store.go('locationEditor', { id: location.value?.id }) }

const previewCard = { background: '#1c1526', color: '#F6EFE6', borderRadius: '14px', overflow: 'hidden', marginTop: '12px' }
const previewHero = computed(() => ({ height: '110px', position: 'relative', background: form.heroImageUrl ? `center/cover no-repeat url(${form.heroImageUrl})` : `linear-gradient(150deg, ${form.hue} 0%, #2a1d38 80%)` }))
const previewPeriod = { position: 'absolute', bottom: '8px', left: '14px', fontFamily: "'Bricolage Grotesque'", fontWeight: 800, fontSize: '28px', color: 'rgba(255,255,255,0.96)', letterSpacing: '-1px' }
</script>

<style scoped>
.media-input { position: relative; }
.media-input > input { padding-right: 78px; }
.media-input.solo > input { padding-right: 46px; }
.chip-x { border: none; background: none; cursor: pointer; color: var(--muted); font-size: 11px; line-height: 1; padding: 4px; border-radius: 50%; display: inline-flex; }
.chip-x:hover, .chip-x:focus-visible { color: var(--ink); background: var(--line); outline: none; }
.media-row { display: flex; align-items: center; gap: 8px; }
.media-row > .media-input { flex: 1; min-width: 0; }
.media-row > .btn { flex-shrink: 0; }
.media-actions { position: absolute; right: 5px; top: 50%; transform: translateY(-50%); display: flex; gap: 2px; }
.icon-btn { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; padding: 0; margin: 0; border: none; border-radius: 8px; background: none; color: var(--muted); cursor: pointer; }
.icon-btn:hover { background: var(--bg); color: var(--ink); }
.icon-btn:focus-visible { outline: 2px solid var(--violet); outline-offset: 1px; }
.icon-btn.busy { opacity: 0.5; cursor: default; }
.icon-btn .ic { width: 18px; height: 18px; display: block; }
</style>
