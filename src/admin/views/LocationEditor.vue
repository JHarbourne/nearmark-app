<!-- A4 Location editor (BRD §11.4) – the most important backoffice screen.
     Full form + click-to-place map + accent picker + preview + draft/publish. -->
<template>
  <div>
    <!-- inline icon sprite, referenced by the compact media-field buttons below -->
    <svg style="display:none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
      <symbol id="ic-upload" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4" /><path d="m6 10 6-6 6 6" /><path d="M4 20h16" /></symbol>
      <symbol id="ic-image" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.6" /><path d="m21 15-5-5L5 21" /></symbol>
      <symbol id="ic-undo" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14 4 9l5-5" /><path d="M4 9h11a5 5 0 0 1 0 10h-1" /></symbol>
    </svg>

    <div class="pagehead">
      <h1>{{ isNew ? 'New location' : 'Edit location' }}</h1>
      <button class="btn btn-ghost" @click="back">← Back to list</button>
    </div>

    <div class="editor-cols" style="display:grid; grid-template-columns: 1.1fr 0.9fr; gap:24px; align-items:start;">
      <!-- left: fields -->
      <div class="card" style="padding:22px;">
        <label for="loc-title">Title</label>
        <input id="loc-title" type="text" v-model="form.title" placeholder="Story card heading" />

        <div class="field-row">
          <div>
            <label for="loc-city">City</label>
            <select id="loc-city" v-model="form.city"><option v-for="c in cities" :key="c" :value="c">{{ c }}</option></select>
          </div>
          <div>
            <label for="loc-period">Period / date <span class="hint">free text</span></label>
            <input id="loc-period" type="text" v-model="form.period" placeholder="1890s · 1967 · c. 1985" />
          </div>
        </div>

        <!-- privacy / publication (migration 011) -->
        <div style="margin:18px 0; padding:14px 16px; border:1px solid var(--line); border-radius:12px;">
          <div style="display:flex; align-items:center; gap:20px; flex-wrap:wrap;">
            <div role="radiogroup" aria-label="Is this a public place or a private address?" style="display:flex; gap:20px;">
              <label style="display:flex; align-items:center; gap:8px; font-weight:500; margin:0; cursor:pointer;"><input type="radio" value="public" v-model="form.visibility" style="width:18px; height:18px; margin:0; accent-color:var(--violet);" /> Public</label>
              <label style="display:flex; align-items:center; gap:8px; font-weight:500; margin:0; cursor:pointer;"><input type="radio" value="private" v-model="form.visibility" style="width:18px; height:18px; margin:0; accent-color:var(--violet);" /> Private</label>
            </div>
            <button type="button" @click="showVisHelp = !showVisHelp" :aria-expanded="showVisHelp" style="margin-left:auto; background:none; border:none; padding:0; font:inherit; font-size:12px; font-weight:600; color:var(--violet); cursor:pointer;">What’s the difference?</button>
          </div>
          <p v-if="showVisHelp" class="muted" style="font-size:12.5px; margin:10px 0 0;">Public = a permanent place anyone can see year-round (a church, a pub, the marina). Private = someone’s home or private address (an open studio or garden). Private addresses are only shown during the event window and require the resident’s consent.</p>

          <div v-if="form.visibility === 'private'" style="margin-top:14px; padding-top:14px; border-top:1px solid var(--line);">
            <!-- consent is per resident -->
            <label for="loc-consent-contact">Resident <span class="hint">name/email of who consented · for the record, never shown in the app</span></label>
            <input id="loc-consent-contact" type="text" v-model="form.consentContact" placeholder="Jane Smith · jane@example.com" />
            <label style="display:flex; align-items:flex-start; gap:9px; margin-top:14px; font-weight:500; cursor:pointer;">
              <input type="checkbox" :checked="form.consentGiven" @change="onConsent" style="margin-top:3px;" />
              <span>I confirm the resident has given written consent to publish this address in the app for the event window. <span class="hint">(notice v{{ config.consentNoticeVersion }})</span></span>
            </label>
            <p v-if="form.consentGiven" style="font-size:12px; margin:8px 0 0; color:var(--green);">Consent recorded{{ form.consentRecordedBy ? ' by ' + form.consentRecordedBy : '' }}{{ form.consentRecordedAt ? ' · ' + new Date(form.consentRecordedAt).toLocaleDateString() : '' }}.</p>
            <p v-else style="font-size:12.5px; margin:8px 0 0; color:var(--amber);">A private address can’t be published until consent is recorded.</p>

            <!-- dates come from the event the location is a stop in -->
            <p class="muted" style="font-size:12.5px; margin:14px 0 0;">When it’s shown is set by the <strong>event</strong> – this address appears only while a tour it’s a stop in is live, then hides automatically.</p>
            <p v-if="!inAnyTour" style="font-size:12.5px; margin:6px 0 0; color:var(--amber);">It isn’t a stop in any tour yet, so it won’t appear publicly until you add it to one (or set an override below).</p>
            <button type="button" class="btn btn-ghost btn-sm" style="margin-top:8px;" @click="overrideDates = !overrideDates">{{ overrideDates ? 'Hide override' : 'Override event dates' }}</button>
            <div v-if="overrideDates" class="field-row" style="margin-top:8px;">
              <div>
                <label for="loc-pub-from">Publish from <span class="hint">visible on/after</span></label>
                <input id="loc-pub-from" type="date" :value="dateIn(form.publishFrom)" @input="setPublishFrom($event.target.value)" />
              </div>
              <div>
                <label for="loc-pub-until">Publish until <span class="hint">hidden after</span></label>
                <input id="loc-pub-until" type="date" :value="dateIn(form.publishUntil)" @input="setPublishUntil($event.target.value)" />
              </div>
            </div>
          </div>
        </div>

        <!-- Guided-tour-only: hide from Discover mode; only shown inside a guided tour -->
        <div style="margin:18px 0; padding:14px 16px; border:1px solid var(--line); border-radius:12px;">
          <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
            <label style="display:flex; align-items:center; gap:9px; font-weight:500; margin:0; cursor:pointer;">
              <input type="checkbox" v-model="form.guidedTourOnly" style="width:18px; height:18px; margin:0; accent-color:var(--violet);" />
              <span>Guided tour only – hide from Discover mode</span>
            </label>
            <button type="button" @click="showTourHelp = !showTourHelp" :aria-expanded="showTourHelp" style="margin-left:auto; background:none; border:none; padding:0; font:inherit; font-size:12px; font-weight:600; color:var(--violet); cursor:pointer;">What does this do?</button>
          </div>
          <p v-if="showTourHelp" class="muted" style="font-weight:400; font-size:12.5px; margin:10px 0 0;">The stop only appears while someone is following a guided tour that includes it – never in proximity-based Discover browsing. Use for stops that only make sense in a narrated sequence.</p>
        </div>

        <!-- Hero image: the lead photo at the top of the story card – its own image, separate from the slider -->
        <p class="muted" style="font-size:12px; margin:14px 0 8px;">Images are optimised automatically on upload. For a quick upload, use a web-sized landscape JPG (around 1400&nbsp;px wide, or smaller) rather than a full-resolution phone photo.</p>
        <label for="loc-hero-url">Hero image <span class="hint">the main photo, shown at the top</span></label>
        <div class="media-input">
          <input id="loc-hero-url" type="url" v-model="form.heroImageUrl" placeholder="Paste a URL, or use the icons →" />
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
        <button v-if="canUndo('heroImageUrl')" type="button" class="btn btn-ghost btn-sm" style="margin-top:6px;" @click="undoReplace('heroImageUrl')">↩ Undo</button>
        <template v-if="form.heroImageUrl">
          <div role="button" tabindex="0" :style="focalBox(form.heroImageUrl, form.heroPosition, '39 / 20')" aria-label="Hero image focal point. Click, or focus and use arrow keys, to set what stays in view." @click="setFocal($event,'heroPosition')" @keydown="nudgeFocal($event,'heroPosition')">
            <span :style="focalDot(form.heroPosition)"></span>
          </div>
          <p class="muted" style="font-size:11.5px; margin:4px 0 0;">Click, or use arrow keys, to set the focal point.</p>
          <label for="loc-hero-alt">Alt text <span class="hint">screen readers · skipped if a caption is set below</span></label>
          <input id="loc-hero-alt" type="text" v-model="form.imageAlt" placeholder="e.g. The Café Royal frontage, Regent Street" />
          <label for="loc-caption">Image caption <span class="hint">under the photo</span></label>
          <input id="loc-caption" type="text" v-model="form.caption" placeholder="e.g. The Sail Lofts, on their concrete piers" />
          <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; margin:16px 0 6px;">
            <label for="loc-hero-credit" style="margin:0;">Photo credit <span class="hint">photographer / source</span></label>
            <label style="display:flex; align-items:center; gap:7px; margin:0; font-size:13px; font-weight:600; cursor:pointer; white-space:nowrap;" title="Off = kept on record, hidden in the app">
              <input type="checkbox" v-model="form.showPhotoCredit" style="width:17px; height:17px; margin:0; accent-color:var(--violet);" /> Show
            </label>
          </div>
          <input id="loc-hero-credit" type="text" v-model="form.photoCredit" placeholder="Photographer / source" />
          <label for="loc-hero-credit-link">Credit link <span class="hint">optional</span></label>
          <input id="loc-hero-credit-link" type="url" v-model="form.photoCreditUrl" placeholder="https://…" />
        </template>

        <!-- Before/after slider is optional; kept behind a toggle to keep the form tidy -->
        <label style="display:flex; align-items:center; gap:9px; margin:22px 0 8px; font-weight:500; cursor:pointer;">
          <input type="checkbox" v-model="showHistoric" />
          <span>Add a before/after slider <span class="hint">a historic “before” photo revealed against a “today” photo</span></span>
        </label>
        <div v-if="showHistoric">
          <p class="muted" style="font-size:12.5px; margin:0 0 10px;">A reveal slider shown in the story body – these two photos are separate from the hero above.</p>
          <div class="field-row">
            <div>
              <label for="loc-historic-url">Before image <span class="hint">historic · slider LEFT</span></label>
              <div class="media-input">
                <input id="loc-historic-url" type="url" v-model="form.historicImageUrl" placeholder="Paste a URL, or use the icons →" />
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
              <button v-if="canUndo('historicImageUrl')" type="button" class="btn btn-ghost btn-sm" style="margin-top:6px;" @click="undoReplace('historicImageUrl')">↩ Undo</button>
            </div>
            <div>
              <label for="loc-after-url">After image <span class="hint">today · slider RIGHT · blank = reuse the hero</span></label>
              <div class="media-input">
                <input id="loc-after-url" type="url" v-model="form.sliderAfterUrl" placeholder="Paste a URL, or use the icons →" />
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
              <button v-if="canUndo('sliderAfterUrl')" type="button" class="btn btn-ghost btn-sm" style="margin-top:6px;" @click="undoReplace('sliderAfterUrl')">↩ Undo</button>
            </div>
          </div>

          <!-- focal points -->
          <div class="field-row">
            <div>
              <div v-if="form.historicImageUrl" role="button" tabindex="0" :style="focalBox(form.historicImageUrl, form.historicPosition, '4 / 3')" aria-label="Before image focal point. Click, or focus and use arrow keys, to set what stays in view." @click="setFocal($event,'historicPosition')" @keydown="nudgeFocal($event,'historicPosition')">
                <span :style="focalDot(form.historicPosition)"></span>
              </div>
              <p v-if="form.historicImageUrl" class="muted" style="font-size:11.5px; margin:4px 0 0;">Click, or use arrow keys, to set the focal point.</p>
            </div>
            <div>
              <div v-if="form.sliderAfterUrl" role="button" tabindex="0" :style="focalBox(form.sliderAfterUrl, form.sliderAfterPosition, '4 / 3')" aria-label="After image focal point. Click, or focus and use arrow keys, to set what stays in view." @click="setFocal($event,'sliderAfterPosition')" @keydown="nudgeFocal($event,'sliderAfterPosition')">
                <span :style="focalDot(form.sliderAfterPosition)"></span>
              </div>
              <p v-if="form.sliderAfterUrl" class="muted" style="font-size:11.5px; margin:4px 0 0;">Click, or use arrow keys, to set the focal point.</p>
            </div>
          </div>

          <!-- slider captions -->
          <div class="field-row">
            <div>
              <label for="loc-historic-slabel">Caption <span class="hint">over the LEFT (before) image</span></label>
              <input id="loc-historic-slabel" type="text" v-model="form.historicLabel" :placeholder="form.period ? `default: ${form.period}` : 'e.g. 1890s'" />
            </div>
            <div>
              <label for="loc-hero-slabel">Caption <span class="hint">over the RIGHT (after) image</span></label>
              <input id="loc-hero-slabel" type="text" v-model="form.imageLabel" placeholder="e.g. Today" />
            </div>
          </div>

          <!-- the historic (before) image has its own credit; the after image reuses the hero photo credit above -->
          <label for="loc-historic-credit">Before photo credit <span class="hint">the historic image · archive / source</span></label>
          <input id="loc-historic-credit" type="text" v-model="form.historicCredit" placeholder="Archive / source" />
          <label for="loc-historic-credit-link">Credit link <span class="hint">optional</span></label>
          <input id="loc-historic-credit-link" type="url" v-model="form.historicCreditUrl" placeholder="https://…" />

          <button v-if="form.historicImageUrl && form.sliderAfterUrl" type="button" class="btn btn-ghost btn-sm" style="margin-top:10px;" @click="swapImages">⇄ Swap before / after images</button>
        </div>

        <label for="loc-significance">Historical significance <span class="hint">one-line subtitle</span></label>
        <input id="loc-significance" type="text" v-model="form.significance" />

        <label for="loc-summary">Text <span class="hint">~80–100 words</span></label>
        <textarea id="loc-summary" v-model="form.summary" rows="6"></textarea>

        <label for="loc-wiki">URL to more information <span class="hint">optional</span></label>
        <input id="loc-wiki" type="url" v-model="form.wikiUrl" :placeholder="wikiPlaceholder" />
        <p v-if="form.wikiUrl && !validWiki" style="color:var(--amber); font-size:12px; margin:6px 0 0;">Should be a {{ wikiDomain }} URL.</p>
        <template v-if="form.wikiUrl">
          <label for="loc-link-label">Link button text <span class="hint">optional · blank shows the web address</span></label>
          <input id="loc-link-label" type="text" v-model="form.linkLabel" :placeholder="linkUrlLabel || 'e.g. Visit the church website'" maxlength="60" />
        </template>

        <label for="loc-links">Further reading / sources <span class="hint">one per line: Label | https://url</span></label>
        <textarea id="loc-links" v-model="form.links" rows="3" placeholder="Colony Room gallery | https://www.theguardian.com/..."></textarea>

        <label for="loc-radius">Trigger radius <span class="hint">metres · how close before a story unlocks</span></label>
        <input id="loc-radius" type="number" v-model.number="form.triggerRadius" min="20" max="300" />

        <span class="field-label" id="loc-hue-label">Accent colour</span>
        <div role="group" aria-labelledby="loc-hue-label" style="display:flex; gap:8px;">
          <button v-for="o in hues" :key="o.value" type="button" class="swatch" :class="{ sel: form.hue === o.value }" :style="{ background: o.value }" @click="form.hue = o.value" :aria-label="o.name" :aria-pressed="form.hue === o.value" :title="o.name"></button>
        </div>

        <!-- second in-body image (a person, a detail, anything), shown within the story text, separate from the hero -->
        <label for="loc-portrait-url">Second photo <span class="hint">shown within the story text, separate from the hero</span></label>
        <div class="media-input">
          <input id="loc-portrait-url" type="url" v-model="form.portraitUrl" placeholder="Paste a URL, or use the icons →" />
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
        <button v-if="canUndo('portraitUrl')" type="button" class="btn btn-ghost btn-sm" style="margin-top:6px;" @click="undoReplace('portraitUrl')">↩ Undo</button>
        <div class="field-row" v-if="form.portraitUrl">
          <div>
            <label for="loc-portrait-alt">Alt text <span class="hint">describe the photo for screen readers</span></label>
            <input id="loc-portrait-alt" type="text" v-model="form.portraitAlt" placeholder="Describe the photo" />
          </div>
          <div>
            <label for="loc-portrait-cap">Caption <span class="hint">optional, shown under the photo</span></label>
            <input id="loc-portrait-cap" type="text" v-model="form.portraitCaption" placeholder="Optional caption" />
          </div>
        </div>

        <!-- Audio + video are optional; behind a toggle to keep the form tidy -->
        <label style="display:flex; align-items:center; gap:9px; margin:22px 0 8px; font-weight:500; cursor:pointer;">
          <input type="checkbox" v-model="showMedia" />
          <span>Add audio or video <span class="hint">narration, a video clip, or a YouTube link</span></span>
        </label>
        <div v-if="showMedia">
        <label for="loc-audio">Audio narration <span class="hint">mp3/m4a</span></label>
        <div class="media-input solo">
          <input id="loc-audio" type="url" v-model="form.audioUrl" placeholder="Paste a URL, or upload →" />
          <div class="media-actions">
            <label class="icon-btn" :class="{ busy: uploading.audio }" :title="uploading.audio ? 'Uploading…' : 'Upload an audio file from your device'">
              <svg class="ic"><use href="#ic-upload" /></svg>
              <input type="file" accept="audio/*" aria-label="Upload an audio narration file from your device" style="display:none" @change="up($event,'audioUrl','audio','audio')" />
            </label>
          </div>
        </div>
        <button v-if="canUndo('audioUrl')" type="button" class="btn btn-ghost btn-sm" style="margin-top:6px;" @click="undoReplace('audioUrl')">↩ Undo</button>
        <div class="field-row">
          <div>
            <label for="loc-audio-dur">Audio duration <span class="hint">secs</span></label>
            <input id="loc-audio-dur" type="number" v-model.number="form.audioDuration" min="0" />
          </div>
          <div>
            <label for="loc-video">Video URL <span class="hint">optional · mp4 file or YouTube link</span></label>
            <input id="loc-video" type="url" v-model="form.videoUrl" placeholder="https://…" />
            <p v-if="form.videoUrl && !videoPlayable" class="warn" role="alert" style="display:flex; gap:8px; align-items:flex-start; margin:6px 0 0; font-size:12.5px; color:var(--danger,#c0392b);">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex-shrink:0; margin-top:1px;"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
              <span>Not a playable video – use a direct <strong>.mp4</strong> file or a <strong>YouTube</strong> link. Anything else is ignored in the app.</span>
            </p>
          </div>
        </div>

        <!-- Audio transcript (WCAG 1.2.1) – only relevant when there's an audio file -->
        <template v-if="form.audioUrl">
          <label for="loc-transcript">Audio transcript <span class="hint">required for accessibility if audio is present</span></label>
          <textarea id="loc-transcript" v-model="form.transcript" rows="6" placeholder="Type or paste what is spoken in the narration. Put non-speech sounds in square brackets, e.g. [Sound of church bells]."></textarea>
          <p v-if="!form.transcript.trim()" class="warn" role="alert" style="display:flex; gap:8px; align-items:flex-start; margin:6px 0 0; font-size:13px; color:var(--danger,#c0392b);">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex-shrink:0; margin-top:1px;"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
            <span>No transcript — audio without a transcript fails WCAG 1.2.1.</span>
          </p>
          <p v-else class="hint" style="margin:6px 0 0;">Wrap non-speech sounds in [square brackets] — they’ll show in a muted style in the app.</p>
        </template>
        </div>

        <label for="loc-related">Related locations <span class="hint">powers “Nearby stories”</span></label>
        <select id="loc-related" multiple v-model="form.relatedIds" style="height:96px;">
          <option v-for="l in others" :key="l.id" :value="l.id">{{ l.title }}</option>
        </select>

        <label for="loc-notes">Internal notes <span class="hint">never shown in the app</span></label>
        <textarea id="loc-notes" v-model="form.notesInternal" rows="2"></textarea>

        <div style="display:flex; align-items:center; gap:12px; margin-top:22px; flex-wrap:wrap;">
          <div class="seg-toggle" role="group" aria-label="Visibility">
            <button type="button" :class="{ on: form.status === 'published' }" @click="form.status = 'published'">Published</button>
            <button type="button" :class="{ on: form.status !== 'published' }" @click="form.status = 'draft'">Draft</button>
          </div>
          <button class="btn btn-primary" @click="save()" :disabled="saving">{{ saving ? 'Saving…' : 'Save' }}</button>
          <span v-if="flash" role="status" style="font-size:13px; font-weight:600; color:var(--green);">{{ flash }}</span>
          <button class="btn btn-ghost btn-sm" style="margin-left:auto;" @click="back">← Back to list</button>
        </div>
      </div>

      <!-- right: map + preview -->
      <div style="display:flex; flex-direction:column; gap:20px;">
        <div class="card" style="padding:18px;">
          <span class="field-label" style="margin-top:0;">Location <span class="hint">click the map, or paste coordinates below</span></span>
          <PlaceMap v-model="coords" :hue="form.hue" :center="mapCenter" />
          <label for="loc-coords" style="margin-top:10px;">Paste coordinates <span class="hint">lat, lng – e.g. copied from Google Maps</span></label>
          <input id="loc-coords" type="text" :value="coordsText" @change="pasteCoords($event.target.value)" placeholder="51.7607, 0.8369" />
        </div>

        <div class="card" style="padding:18px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <h3 style="margin:0; font-size:15px;">Preview</h3>
            <button class="btn btn-ghost btn-sm" @click="showPreview = !showPreview">{{ showPreview ? 'Hide' : 'Preview as story card' }}</button>
          </div>
          <div v-if="showPreview" :style="previewCard">
            <div :style="previewHero">
              <span :style="previewPeriod">{{ form.period }}</span>
            </div>
            <div style="padding:14px 16px;">
              <div style="font-family:'Bricolage Grotesque'; font-weight:700; font-size:20px;">{{ form.title || 'Untitled' }}</div>
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
import { reactive, ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { store } from '../store.js'
import { HUE_OPTIONS } from '../../lib/tokens.js'
import { isPlayableVideo } from '../../lib/video.js'
import { config, wikiDomain } from '../../config.js'
import PlaceMap from '../components/PlaceMap.vue'
import MediaPicker from '../components/MediaPicker.vue'

const wikiPlaceholder = config.wikiBaseUrl ? `${config.wikiBaseUrl}…` : 'https://…'
// the URL's host, shown as the placeholder / the app-side label when no custom text is set
const linkUrlLabel = computed(() => { try { return new URL(form.wikiUrl).hostname.replace(/^www\./, '') } catch { return '' } })
const videoPlayable = computed(() => isPlayableVideo(form.videoUrl))
const cities = config.cities

const hues = HUE_OPTIONS
const mapCenter = config.mapCenter // start on the deployment's city, not a hardcoded London

const existing = store.params.id ? store.locations.find((l) => l.id === store.params.id) : null
const isNew = !existing

const blank = {
  id: 'loc-' + Math.random().toString(36).slice(2, 8),
  recordId: undefined, title: '', city: config.cities[0], period: '', significance: '', summary: '',
  wikiUrl: config.wikiBaseUrl, linkLabel: '', lat: null, lng: null, triggerRadius: 80,
  heroImageUrl: '', historicImageUrl: '', sliderAfterUrl: '', heroPosition: '50% 50%', historicPosition: '50% 50%', sliderAfterPosition: '50% 50%', imageAlt: '', historicAlt: '', imageLabel: '', historicLabel: '', photoCredit: '', photoCreditUrl: '', showPhotoCredit: true, historicCredit: '', historicCreditUrl: '', portraitUrl: '', portraitAlt: '', portraitCaption: '', audioUrl: '', audioDuration: 0, transcript: '', videoUrl: '', thumbnailUrl: '',
  caption: '', links: '',
  hue: HUE_OPTIONS[0].value, relatedIds: [], tourNum: null, status: 'draft', notesInternal: '',
  visibility: 'public', publishFrom: null, publishUntil: null, guidedTourOnly: false,
  consentGiven: false, consentContact: '', consentRecordedAt: null, consentRecordedBy: '', consentNoticeVersion: '',
}
const form = reactive(existing ? JSON.parse(JSON.stringify(existing)) : { ...blank })
if (!form.visibility) form.visibility = 'public' // records created before the privacy migration
if (form.showPhotoCredit === undefined) form.showPhotoCredit = true // pre-credit-toggle records
if (form.guidedTourOnly === undefined) form.guidedTourOnly = false // pre-guided-tour-only records

// historic "before" image is opt-in (turns the photo into a before/after slider);
// switching it off clears the image so the app shows a single, full-width photo.
const showHistoric = ref(!!form.historicImageUrl)
watch(showHistoric, (on) => { if (!on) { form.historicImageUrl = ''; form.sliderAfterUrl = '' } })

// audio + video are opt-in too, tucked behind a toggle to keep the form tidy
const showMedia = ref(!!(form.audioUrl || form.videoUrl))
watch(showMedia, (on) => { if (!on) { form.audioUrl = ''; form.videoUrl = '' } })

// inline "learn more" toggles for the Visibility / Guided-tour boxes
const showVisHelp = ref(false)
const showTourHelp = ref(false)

// ── unsaved-changes guard: warn before leaving (in-app nav + tab close/reload) ──
const baseline = ref(JSON.stringify(form))
const isDirty = () => JSON.stringify(form) !== baseline.value
function onBeforeUnload(e) { if (isDirty()) { e.preventDefault(); e.returnValue = '' } }
onMounted(() => { store.registerDirtyCheck(isDirty); window.addEventListener('beforeunload', onBeforeUnload) })
onUnmounted(() => { store.clearDirtyCheck(); window.removeEventListener('beforeunload', onBeforeUnload) })

// ── privacy / publication helpers ──
const overrideDates = ref(!!(form.publishFrom || form.publishUntil)) // open the override if one's already set
const inAnyTour = computed(() => store.tours.some((t) => t.stopIds.includes(form.id)))
const dateIn = (iso) => (iso ? new Date(iso).toLocaleDateString('en-CA') : '') // YYYY-MM-DD (local)
function setPublishFrom(v) { form.publishFrom = v ? new Date(v + 'T00:00:00').toISOString() : null }
function setPublishUntil(v) { form.publishUntil = v ? new Date(v + 'T23:59:59').toISOString() : null }
// ticking the consent box records who/when/which-notice; unticking withdraws it
function onConsent(e) {
  if (e.target.checked) {
    form.consentGiven = true
    form.consentRecordedAt = new Date().toISOString()
    form.consentRecordedBy = store.user?.email || ''
    form.consentNoticeVersion = config.consentNoticeVersion
  } else {
    form.consentGiven = false
  }
}

// ── replace-undo + orphan cleanup (so old uploads don't pile up in storage) ──
const undoBuf = reactive({})                                   // field -> value before the last replace
const sessionUploads = []                                      // every file uploaded during this edit
function undoReplace(field) { if (field in undoBuf) { form[field] = undoBuf[field]; delete undoBuf[field] } }
function canUndo(field) { return field in undoBuf }
const coords = ref(form.lat != null ? { lat: form.lat, lng: form.lng } : null)
watch(coords, (c) => { if (c) { form.lat = c.lat; form.lng = c.lng } })
const coordsText = computed(() => (coords.value ? `${coords.value.lat.toFixed(6)}, ${coords.value.lng.toFixed(6)}` : ''))
function pasteCoords(v) {
  const m = (v || '').trim().match(/^(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)$/)
  if (!m) { if ((v || '').trim()) alert('Paste coordinates as “lat, lng”, e.g. 51.7607, 0.8369'); return }
  coords.value = { lat: parseFloat(m[1]), lng: parseFloat(m[2]) } // moves the pin + recentres the map
}

const showPreview = ref(false)
const others = computed(() => store.locations.filter((l) => l.id !== form.id))
const validWiki = computed(() => !wikiDomain || form.wikiUrl.includes(wikiDomain))

// swap the slider's before (historic) and after (today) image + their paired fields
function swapImages() {
  const pairs = [
    ['sliderAfterUrl', 'historicImageUrl'], ['sliderAfterPosition', 'historicPosition'],
    ['imageLabel', 'historicLabel'],
  ]
  for (const [a, b] of pairs) { const tmp = form[a]; form[a] = form[b]; form[b] = tmp }
}

// ── focal point picker (click the preview to set what stays in view when cropped) ──
// The crop preview matches how the image is shown on the card, so the focal point is
// accurate: hero is 39:20 (390×200 on a phone), the slider's before/after images are 4:3.
function focalBox(url, pos, aspect) {
  return {
    marginTop: '8px', width: '100%', aspectRatio: aspect || '39 / 20',
    borderRadius: '10px', border: '1px solid var(--line)',
    backgroundImage: `url(${url})`, backgroundSize: 'cover', backgroundPosition: pos || '50% 50%',
    backgroundRepeat: 'no-repeat', position: 'relative', cursor: 'crosshair',
  }
}
function focalDot(pos) {
  const [x, y] = (pos || '50% 50%').split(' ')
  return {
    position: 'absolute', left: x, top: y, transform: 'translate(-50%,-50%)',
    width: '16px', height: '16px', borderRadius: '50%', background: 'rgba(107,70,229,0.9)',
    border: '2px solid #fff', boxShadow: '0 0 0 2px rgba(0,0,0,0.35)', pointerEvents: 'none',
  }
}
function setFocal(e, field) {
  const r = e.currentTarget.getBoundingClientRect()
  const x = Math.round(Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100)))
  const y = Math.round(Math.max(0, Math.min(100, ((e.clientY - r.top) / r.height) * 100)))
  form[field] = `${x}% ${y}%`
}
// keyboard alternative to the click picker: arrow keys nudge the focal point 5%
function nudgeFocal(e, field) {
  const step = { ArrowLeft: [-5, 0], ArrowRight: [5, 0], ArrowUp: [0, -5], ArrowDown: [0, 5] }[e.key]
  if (!step) return
  e.preventDefault()
  const [cx, cy] = (form[field] || '50% 50%').split(' ').map((v) => parseInt(v, 10) || 0)
  const x = Math.max(0, Math.min(100, cx + step[0]))
  const y = Math.max(0, Math.min(100, cy + step[1]))
  form[field] = `${x}% ${y}%`
}

// ── file uploads to Supabase Storage ──
const uploading = reactive({ hero: false, historic: false, after: false, portrait: false, audio: false })
async function up(e, field, kind, key) {
  const file = e.target.files[0]
  if (!file) return
  uploading[key] = true
  const prev = form[field]
  try {
    const url = await store.upload(file, kind)
    undoBuf[field] = prev            // allow undoing this replace
    sessionUploads.push(url)         // track for orphan cleanup on save
    form[field] = url
    // auto-fill audio duration from the file's metadata
    if (kind === 'audio') {
      const a = new Audio(URL.createObjectURL(file))
      a.addEventListener('loadedmetadata', () => { if (a.duration && isFinite(a.duration)) form.audioDuration = Math.round(a.duration) })
    }
  } catch (err) {
    alert('Upload failed: ' + err.message)
  } finally {
    uploading[key] = false
    e.target.value = ''
  }
}

// ── choose an existing photo from the media library (reuse across locations) ──
const picker = reactive({ open: false, field: null })
function openPicker(field) { picker.field = field; picker.open = true }
function onPickMedia(url) { if (picker.field) form[picker.field] = url }

const saving = ref(false)
const flash = ref('')
let flashTimer
async function save() {
  if (!form.title) { alert('Title is required.'); return }
  if (form.lat == null) { alert('Drop a pin on the map to set the location.'); return }
  if (form.status === 'published' && form.visibility === 'private' && !form.consentGiven) {
    alert('This is a private address. Record the resident’s consent (tick the box) before publishing.')
    return
  }
  saving.value = true
  try {
    await store.saveLocation({ ...form })
    // a newly created record now exists – adopt its id so the next save updates
    // (rather than creating a duplicate) and we can stay on the page
    if (!form.recordId) {
      const saved = store.locations.find((l) => l.id === form.id)
      if (saved) form.recordId = saved.recordId
    }
    // delete orphaned uploads: files uploaded during THIS edit that the saved
    // record no longer uses (no-op for external URLs). We deliberately never
    // delete a pre-existing image just because this location switched away from
    // it – it may be a library photo reused by other locations.
    const inUse = new Set([form.heroImageUrl, form.historicImageUrl, form.sliderAfterUrl, form.portraitUrl, form.audioUrl].filter(Boolean))
    for (const url of sessionUploads) if (!inUse.has(url)) await store.removeMedia(url).catch(() => {})
    baseline.value = JSON.stringify(form) // saved → no longer "dirty"
    flash.value = form.status === 'published' ? 'Saved · Published ✓' : 'Saved · Draft ✓'
    clearTimeout(flashTimer)
    flashTimer = setTimeout(() => { flash.value = '' }, 4000)
  } catch (e) {
    alert('Save failed: ' + e.message)
  } finally {
    saving.value = false
  }
}
function back() { store.go('locations') }

const previewCard = { background: '#1c1526', color: '#F6EFE6', borderRadius: '14px', overflow: 'hidden', marginTop: '12px' }
const previewHero = computed(() => ({
  height: '110px', position: 'relative',
  background: form.heroImageUrl ? `center/cover no-repeat url(${form.heroImageUrl})` : `linear-gradient(150deg, ${form.hue} 0%, #2a1d38 80%)`,
}))
const previewPeriod = { position: 'absolute', bottom: '8px', left: '14px', fontFamily: "'Bricolage Grotesque'", fontWeight: 800, fontSize: '28px', color: 'rgba(255,255,255,0.96)', letterSpacing: '-1px' }
</script>

<style scoped>
/* compact media fields: the upload / library actions sit as icons inside the
   field, keeping each image/audio row to a single clean line */
.media-input { position: relative; }
.media-input > input { padding-right: 78px; }
.media-input.solo > input { padding-right: 46px; }
.media-actions { position: absolute; right: 5px; top: 50%; transform: translateY(-50%); display: flex; gap: 2px; }
.icon-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 32px; height: 32px; padding: 0; margin: 0; border: none; border-radius: 8px;
  background: none; color: var(--muted); cursor: pointer;
}
.icon-btn:hover { background: var(--bg); color: var(--ink); }
.icon-btn:focus-visible { outline: 2px solid var(--violet); outline-offset: 1px; }
.icon-btn.busy { opacity: 0.5; cursor: default; }
.icon-btn .ic { width: 18px; height: 18px; display: block; }
</style>
