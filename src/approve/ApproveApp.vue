<!-- Private approval page (/approve/<token>). Shows ONE artist their own story
     card — a DRAFT, hidden from the public — and lets them read a plain consent
     notice and tap Approve. No login, no editing (curator-tight): the only public
     door to a draft story is the two token-scoped SECURITY DEFINER RPCs (migration
     033). The tour stays unpublished throughout. -->
<template>
  <div class="approve-stage">
    <div class="approve-col">
      <!-- brand line -->
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
          <h2 class="title" style="font-size:22px;">Thank you{{ state === 'approved' ? ' — already approved' : '' }}</h2>
          <p class="lead" style="margin-bottom:0;">
            {{ state === 'approved'
              ? 'Your approval is already on record, so there’s nothing more to do. Thank you.'
              : 'Your approval has been recorded. Thank you — nothing more is needed from you.' }}
          </p>
          <p v-if="state === 'done' && note.trim()" class="lead" style="margin:12px 0 0; font-size:14px; color:var(--ink-muted);">
            We’ve also passed on your note to the organisers.
          </p>
        </div>

        <!-- approve form -->
        <form v-else class="panel" @submit.prevent="submit">
          <h2 class="title" style="font-size:20px;">Your approval</h2>
          <p class="lead">
            By approving, you consent to us publishing this. We keep your details only for the trail and you can ask us to remove them — see the
            <a class="link" href="/privacy" target="_blank" rel="noopener">privacy policy</a>.
          </p>

          <label class="consent">
            <input type="checkbox" v-model="agreed" />
            <span>I’m happy for this to be published as shown.</span>
          </label>

          <label class="wrong-label" for="approve-note">Something looks wrong? Tell us <span class="hint">optional</span></label>
          <textarea id="approve-note" v-model="note" rows="3" placeholder="e.g. please correct the spelling of my name, or swap the photo…"></textarea>

          <p v-if="error" class="err" role="alert">{{ error }}</p>

          <button type="submit" class="cta" :disabled="!agreed || submitting">
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

// state machine: loading → (notfound | form | approved | done)
const state = ref('loading')
const row = ref(null)
const agreed = ref(false)
const note = ref('')
const submitting = ref(false)
const error = ref('')

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

onMounted(async () => {
  if (!token || !supabaseConfigured || !supabase) { state.value = 'notfound'; return }
  try {
    const { data, error: rpcErr } = await supabase.rpc('approval_card', { p_token: token })
    const r = Array.isArray(data) ? data[0] : data
    if (rpcErr || !r) { state.value = 'notfound'; return }
    row.value = r
    state.value = (r.consent_given || r.approved_at) ? 'approved' : 'form'
  } catch { state.value = 'notfound' }
})

async function submit() {
  if (!agreed.value || submitting.value) return
  submitting.value = true
  error.value = ''
  try {
    const { data, error: rpcErr } = await supabase.rpc('approval_submit', {
      p_token: token,
      p_note: note.value.trim() || null,
    })
    if (rpcErr || data === false) {
      error.value = 'Sorry — we couldn’t record that. Please try again, or contact the organisers.'
      return
    }
    state.value = 'done'
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } catch {
    error.value = 'Sorry — something went wrong. Please try again.'
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
.brand { font-family: var(--font-heading); font-weight: 800; font-size: 18px; letter-spacing: -0.3px; color: var(--ink); }
.intro { text-align: center; padding: 0 6px; }
.title { font-family: var(--font-heading); font-weight: 800; font-size: 26px; line-height: 1.08; letter-spacing: -0.5px; color: var(--ink); margin: 0 0 8px; }
.lead { font-family: var(--font-ui); font-size: 15px; line-height: 1.55; color: var(--ink-soft); margin: 0 0 4px; }
.panel { background: var(--card); border: 1px solid var(--line); border-radius: 20px; padding: 20px 22px; }
.panel.approved { text-align: center; }
.tick { width: 52px; height: 52px; border-radius: 50%; margin: 0 auto 12px; display: flex; align-items: center; justify-content: center; background: linear-gradient(100deg, #2FBF71, #3D9BFF); }
.link { color: var(--accent-warm); text-decoration: underline; text-underline-offset: 2px; }
.consent { display: flex; align-items: flex-start; gap: 11px; margin: 16px 0 6px; font-family: var(--font-ui); font-size: 15px; font-weight: 600; color: var(--ink); cursor: pointer; }
.consent input { width: 20px; height: 20px; margin: 1px 0 0; flex-shrink: 0; accent-color: var(--accent); cursor: pointer; }
.wrong-label { display: block; margin: 18px 0 7px; font-family: var(--font-ui); font-size: 14px; font-weight: 600; color: var(--ink-soft); }
.wrong-label .hint { font-weight: 400; color: var(--ink-muted); }
textarea {
  width: 100%; font-family: var(--font-ui); font-size: 15px; line-height: 1.5; color: var(--ink);
  background: var(--raised); border: 1px solid var(--line); border-radius: 12px; padding: 11px 13px; resize: vertical;
}
textarea:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
.err { margin: 12px 0 0; font-size: 13.5px; color: #FF6B6B; }
.cta {
  width: 100%; height: 52px; margin-top: 18px; border: none; border-radius: 14px; cursor: pointer;
  font-family: var(--font-button, var(--font-heading)); font-weight: 700; font-size: 16px; color: var(--bg);
  background: linear-gradient(100deg, #2FBF71, #3D9BFF);
}
.cta:disabled { opacity: 0.45; cursor: not-allowed; }
.approve-foot { text-align: center; padding: 8px 0 4px; font-family: var(--font-ui); font-size: 12px; color: var(--ink-faint); }
</style>
