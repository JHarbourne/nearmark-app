<!-- Private approval page (/approve/<token>). Shows ONE artist their own story
     card — a DRAFT, hidden from the public — lets them confirm a few details
     (name, where they'll be, website/social), read a plain consent notice and tap
     Approve. No login: the only public door to a draft story is the two token-scoped
     SECURITY DEFINER RPCs (migrations 033 + 034). The tour stays unpublished. -->
<template>
  <div class="approve-stage">
    <div class="approve-col">
      <!-- brand line (theme accent — red for Tollesbury) -->
      <header class="approve-head">
        <span class="brand">{{ orgName }}</span>
      </header>

      <!-- loading -->
      <div v-if="state === 'loading'" class="panel" role="status">
        <p class="lead" style="margin:0;">Loading your preview…</p>
      </div>

      <!-- invalid / expired / unknown token — never leak why -->
      <div v-else-if="state === 'notfound'" class="panel">
        <h1 class="title">Link not found</h1>
        <p class="lead">This approval link isn’t valid, or it may have expired. If you were expecting to review something, please get back in touch with the organisers and they’ll send you a fresh link.</p>
      </div>

      <!-- the card + (approve form | already-approved | thank-you) -->
      <template v-else>
        <div class="intro">
          <h1 class="title">Please check your story</h1>
          <p class="lead">
            This is how you’ll appear on the public <strong>{{ appName }}</strong> app and map. Have a read through, then approve it below.
          </p>
        </div>

        <StoryCard :loc="cardLoc" embedded :audio-on="false" />

        <!-- already approved -->
        <div v-if="state === 'approved' || state === 'done'" class="panel approved">
          <div class="tick" aria-hidden="true">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M4 12.5 L9.5 18 L20 6" stroke="var(--bg)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </div>
          <h2 class="title" style="font-size:22px;">Thank you{{ state === 'approved' ? ' – already approved' : '' }}</h2>
          <p class="lead" style="margin-bottom:0;">
            {{ state === 'approved'
              ? 'Your approval is already on record, so there’s nothing more to do. Thank you.'
              : 'Your approval has been recorded. Thank you – nothing more is needed from you.' }}
          </p>
          <p v-if="state === 'done' && note.trim()" class="lead" style="margin:12px 0 0; font-size:14px; color:var(--ink-muted);">
            We’ve also passed on your note to the organisers.
          </p>
        </div>

        <!-- approve form -->
        <form v-else class="panel" @submit.prevent="submit">
          <!-- where you'll be -->
          <h2 class="title" style="font-size:20px;">Where you’ll be</h2>
          <p v-if="venueTitle" class="lead" style="margin-bottom:10px;"><strong>{{ venueTitle }}</strong></p>
          <template v-if="isShared">
            <p class="ro-address">{{ address || 'No address on record.' }}</p>
            <p class="hint-line">This location is shared with other stories, so its address is fixed. If it needs changing, mention it in the note lower down.</p>
          </template>
          <template v-else>
            <label class="fld-label" for="approve-address">Your address</label>
            <input id="approve-address" type="text" v-model="address" placeholder="e.g. 2 East Street, Tollesbury, CM9 8QD" />
            <p class="hint-line">If you change this, we’ll re-check it on the map before it goes live.</p>
          </template>

          <!-- your details -->
          <h2 class="title" style="font-size:20px; margin-top:22px;">Your details</h2>
          <p class="lead" style="margin:0 0 2px;">Your <strong>website</strong> and <strong>social link</strong> will appear on your public page. Your <strong>name</strong> is just so we know who approved – it’s not shown.</p>
          <label class="fld-label" for="approve-name">Your name <span class="req">required</span> <span class="hint">· private, not shown</span></label>
          <input id="approve-name" type="text" v-model="name" placeholder="The name to show this is approved by you" autocomplete="name" />

          <label class="fld-label" for="approve-website">Website <span class="hint">optional · shown on your page</span></label>
          <input id="approve-website" type="url" v-model="website" placeholder="https://…" inputmode="url" />

          <label class="fld-label" for="approve-social">Social media link <span class="hint">optional · shown on your page</span></label>
          <input id="approve-social" type="url" v-model="social" placeholder="https://instagram.com/…" inputmode="url" />

          <label class="keep">
            <input type="checkbox" v-model="keep" />
            <span>Keep my details for next time, so I don’t have to fill this in again.</span>
          </label>

          <!-- consent + corrections -->
          <h2 class="title" style="font-size:20px; margin-top:22px;">Your approval</h2>
          <p class="lead">
            By approving, you consent to us publishing this. We keep your details only for the trail and you can ask us to remove them<template v-if="privacyUrl"> – see the <a class="link" :href="privacyUrl" target="_blank" rel="noopener">privacy policy</a></template>.
          </p>

          <label class="consent">
            <input type="checkbox" v-model="agreed" />
            <span>I’m happy for this to be published as shown, or with the corrections below.</span>
          </label>

          <label class="wrong-label" for="approve-note">Something looks wrong? Tell us <span class="hint">optional</span></label>
          <textarea id="approve-note" v-model="note" rows="3" placeholder="e.g. please correct the spelling of my name, or swap the photo…"></textarea>

          <p v-if="error" class="err" role="alert">{{ error }}</p>

          <button type="submit" class="cta" :disabled="!canApprove || submitting">
            {{ submitting ? 'Sending…' : 'Approve' }}
          </button>
        </form>
      </template>

      <footer class="approve-foot">
        <span>Powered by {{ platformName }}</span>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import StoryCard from '../components/StoryCard.vue'
import { supabase, supabaseConfigured, parseLinks } from '../lib/supabase.js'
import { config } from '../config.js'

const appName = config.appName
const orgName = config.orgName
const platformName = config.platformName
const privacyUrl = config.privacyUrl

// state machine: loading → (notfound | form | approved | done)
const state = ref('loading')
const row = ref(null)
const agreed = ref(false)
const note = ref('')
// confirmed / supplied details (prefilled from the RPC where available)
const name = ref('')
const website = ref('')
const social = ref('')
const keep = ref(false)
const address = ref('')
const submitting = ref(false)
const error = ref('')

const isShared = computed(() => !!row.value?.is_shared)
const venueTitle = computed(() => row.value?.location_title || '')
// Approve needs both the opt-in consent AND a name (the consent signature).
const canApprove = computed(() => agreed.value && name.value.trim().length > 0)

// Read the token from the path (/approve/<token>, via the Vercel rewrite) and, as
// a fallback for local dev where the rewrite isn't active, from ?token=.
function readToken() {
  const m = window.location.pathname.match(/\/approve\/([^/?#]+)/)
  if (m && m[1]) return decodeURIComponent(m[1])
  return new URLSearchParams(window.location.search).get('token') || ''
}
const token = readToken()

// Map the RPC row (snake_case story columns + extras) into the `loc` shape
// StoryCard reads — mirroring App.vue's cardFromStory (heading → title).
function cardFromRow(r) {
  return {
    id: 'approve',
    title: r.heading || 'Untitled',
    locationTitle: r.location_title || '',
    period: r.period || '',
    significance: r.significance || '',
    summary: r.summary || '',
    heroImageUrl: r.hero_image_url || null,
    heroPosition: r.hero_position || '50% 50%',
    imageAlt: r.image_alt || '',
    imageLabel: r.image_label || '',
    caption: r.caption || '',
    photoCredit: r.hero_credit || '',
    photoCreditUrl: r.hero_credit_url || '',
    showPhotoCredit: r.show_hero_credit !== false,
    historicImageUrl: r.historic_image_url || null,
    historicPosition: r.historic_position || '50% 50%',
    historicAlt: r.historic_alt || '',
    historicLabel: r.historic_label || '',
    historicCredit: r.historic_credit || '',
    historicCreditUrl: r.historic_credit_url || '',
    sliderAfterUrl: r.slider_after_url || null,
    sliderAfterPosition: r.slider_after_position || '50% 50%',
    portraitUrl: r.portrait_url || null,
    portraitAlt: r.portrait_alt || '',
    portraitCaption: r.portrait_caption || '',
    portraitCredit: r.portrait_credit || '',
    portraitCreditUrl: r.portrait_credit_url || '',
    wikiUrl: r.wiki_url || '',
    linkLabel: r.link_label || '',
    links: r.links || '',
    linkList: parseLinks(r.links),
    videoUrl: r.video_url || null,
    videoCaption: r.video_caption || '',
    hue: r.hue || '#9B6DFF',
  }
}
const cardLoc = computed(() => (row.value ? cardFromRow(row.value) : null))

// Prefill the editable fields from the RPC row: name/keep from the participant,
// website from wiki_url, social from the single existing link (if there's just one),
// address from the location.
function prefill(r) {
  name.value = r.name || ''
  keep.value = !!r.keep_details
  website.value = r.wiki_url || ''
  address.value = r.address || ''
  const links = parseLinks(r.links)
  social.value = links.length === 1 ? links[0].url : ''
}

onMounted(async () => {
  if (!token || !supabaseConfigured || !supabase) { state.value = 'notfound'; return }
  try {
    const { data, error: rpcErr } = await supabase.rpc('approval_card', { p_token: token })
    const r = Array.isArray(data) ? data[0] : data
    if (rpcErr || !r) { state.value = 'notfound'; return }
    row.value = r
    prefill(r)
    state.value = (r.consent_given || r.approved_at) ? 'approved' : 'form'
  } catch { state.value = 'notfound' }
})

async function submit() {
  if (!canApprove.value || submitting.value) return
  submitting.value = true
  error.value = ''
  try {
    const { data, error: rpcErr } = await supabase.rpc('approval_submit', {
      p_token: token,
      p_note: note.value.trim() || null,
      p_name: name.value.trim() || null,
      p_website: website.value.trim() || null,
      p_social: social.value.trim() || null,
      p_keep: keep.value,
      // a shared venue's address is read-only here → never send an edit for it
      p_address: isShared.value ? null : (address.value.trim() || null),
    })
    if (rpcErr || data === false) {
      error.value = 'Sorry – we couldn’t record that. Please try again, or contact the organisers.'
      return
    }
    state.value = 'done'
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } catch {
    error.value = 'Sorry – something went wrong. Please try again.'
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.approve-stage {
  min-height: 100dvh;
  background: radial-gradient(120% 80% at 50% 0%, var(--bg-glow) 0%, var(--bg-deep) 70%);
  padding: max(20px, env(safe-area-inset-top)) 16px max(28px, env(safe-area-inset-bottom));
}
.approve-col { width: 100%; max-width: 440px; margin: 0 auto; display: flex; flex-direction: column; gap: 18px; }
.approve-head { display: flex; align-items: center; justify-content: center; padding: 6px 0 2px; }
.brand { font-family: var(--font-heading); font-weight: 800; font-size: 18px; letter-spacing: -0.3px; color: var(--accent); }
.intro { text-align: center; padding: 0 6px; }
.title { font-family: var(--font-heading); font-weight: 800; font-size: 26px; line-height: 1.08; letter-spacing: -0.5px; color: var(--ink); margin: 0 0 8px; }
.lead { font-family: var(--font-ui); font-size: 15px; line-height: 1.55; color: var(--ink-soft); margin: 0 0 4px; }
.panel { background: var(--card); border: 1px solid var(--line); border-radius: 20px; padding: 20px 22px; }
.panel.approved { text-align: center; }
.tick { width: 52px; height: 52px; border-radius: 50%; margin: 0 auto 12px; display: flex; align-items: center; justify-content: center; background: linear-gradient(100deg, #2FBF71, #3D9BFF); }
.link { color: var(--accent-warm); text-decoration: underline; text-underline-offset: 2px; }
.consent, .keep { display: flex; align-items: flex-start; gap: 11px; font-family: var(--font-ui); color: var(--ink); cursor: pointer; }
.consent { margin: 16px 0 6px; font-size: 15px; font-weight: 600; }
.keep { margin: 16px 0 2px; font-size: 14px; font-weight: 500; color: var(--ink-soft); }
.consent input, .keep input { width: 20px; height: 20px; margin: 1px 0 0; flex-shrink: 0; accent-color: var(--accent); cursor: pointer; }
.fld-label { display: block; margin: 16px 0 7px; font-family: var(--font-ui); font-size: 14px; font-weight: 600; color: var(--ink-soft); }
.fld-label .hint, .wrong-label .hint { font-weight: 400; color: var(--ink-muted); }
.fld-label .req { font-weight: 500; color: var(--accent-warm); }
.wrong-label { display: block; margin: 18px 0 7px; font-family: var(--font-ui); font-size: 14px; font-weight: 600; color: var(--ink-soft); }
.ro-address { font-family: var(--font-ui); font-size: 15px; font-weight: 600; color: var(--ink); margin: 0 0 6px; }
.hint-line { font-family: var(--font-ui); font-size: 13px; line-height: 1.45; color: var(--ink-muted); margin: 6px 0 0; }
input[type="text"], input[type="url"], textarea {
  width: 100%; font-family: var(--font-ui); font-size: 15px; line-height: 1.5; color: var(--ink);
  background: var(--raised); border: 1px solid var(--line); border-radius: 12px; padding: 11px 13px;
}
textarea { resize: vertical; }
input[type="text"]:focus-visible, input[type="url"]:focus-visible, textarea:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
.err { margin: 12px 0 0; font-size: 13.5px; color: #FF6B6B; }
.cta {
  width: 100%; height: 52px; margin-top: 18px; border: none; border-radius: 14px; cursor: pointer;
  font-family: var(--font-button, var(--font-heading)); font-weight: 700; font-size: 16px; color: var(--bg);
  background: linear-gradient(100deg, #2FBF71, #3D9BFF);
}
.cta:disabled { opacity: 0.45; cursor: not-allowed; }
.approve-foot { text-align: center; padding: 8px 0 4px; font-family: var(--font-ui); font-size: 12px; color: var(--ink-faint); }
</style>
