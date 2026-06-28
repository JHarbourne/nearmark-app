<!-- A8 User management (BRD §11.8).
     Admin accounts are Supabase Auth users. Inviting/deactivating users requires
     elevated (service-role) privileges that must not live in the browser, so for
     the pilot this is done in the Supabase dashboard. This screen explains how and
     links straight there. (A future server endpoint could surface it in-app.) -->
<template>
  <div>
    <div class="pagehead"><h1>User management</h1></div>

    <div class="card" style="padding:22px; max-width:640px;">
      <p style="margin:0 0 14px;">You're signed in as <strong>{{ store.user?.email }}</strong>.</p>
      <p class="muted" style="font-size:14px; line-height:1.6; margin:0 0 18px;">
        Admin accounts are managed securely in Supabase (the operations that create,
        invite or deactivate users need privileges that should never be exposed in the
        browser). To add a new editor, deactivate someone, or trigger a password reset,
        use the Supabase dashboard:
      </p>
      <ol style="font-size:14px; line-height:1.8; margin:0 0 18px; padding-left:20px;">
        <li><strong>Authentication → Users → Add user</strong> – create an editor with their email and a temporary password.</li>
        <li>Keep <strong>“Allow new users to sign up” turned off</strong> so only invited admins can access the backoffice.</li>
        <li>To remove access, delete or ban the user under the same screen.</li>
      </ol>
      <a class="btn btn-primary" :href="usersUrl" target="_blank" rel="noopener" style="text-decoration:none;">Open Supabase → Users ↗</a>
    </div>

    <!-- Two-factor authentication (TOTP authenticator app) -->
    <div class="card" style="padding:22px; max-width:640px; margin-top:18px;">
      <h2 style="margin:0 0 6px; font-size:16px;">Two-factor authentication</h2>
      <p class="muted" style="font-size:13px; line-height:1.6; margin:0 0 16px;">
        Add a second step at sign-in with an authenticator app (Google Authenticator, 1Password, Authy…). Strongly recommended.
      </p>

      <p v-if="mfaLoading" class="muted" style="font-size:14px;">Checking…</p>

      <!-- enrolled / on -->
      <template v-else-if="activeFactor && !enroll">
        <p style="font-size:14px; margin:0 0 12px;">
          <span style="color:var(--green); font-weight:700;">● On</span> – “{{ activeFactor.friendly_name || 'Authenticator app' }}”
        </p>
        <button class="btn btn-danger btn-sm" @click="turnOff" :disabled="mfaBusy">Turn off two-factor</button>
      </template>

      <!-- enrolling: QR + secret + code -->
      <template v-else-if="enroll">
        <p style="font-size:14px; margin:0 0 12px;">Scan this with your authenticator app, then enter the 6-digit code it shows.</p>
        <img v-if="qrSrc" :src="qrSrc" alt="QR code – scan with your authenticator app" width="180" height="180" style="border:1px solid var(--line); border-radius:10px; background:#fff;" />
        <p class="muted" style="font-size:12.5px; margin:10px 0 0;">Can't scan? Enter this key manually:</p>
        <div><code style="display:inline-block; font-size:13px; background:var(--bg); padding:6px 10px; border-radius:8px; margin:4px 0 14px; word-break:break-all;">{{ enroll.totp && enroll.totp.secret }}</code></div>
        <label for="mfa-enroll-code">6-digit code</label>
        <input id="mfa-enroll-code" type="text" v-model="enrollCode" inputmode="numeric" autocomplete="one-time-code" placeholder="123456" maxlength="6" style="max-width:160px;" />
        <p v-if="mfaError" style="color:var(--red); font-size:13px; margin:10px 0 0;">{{ mfaError }}</p>
        <div style="display:flex; gap:10px; margin-top:14px;">
          <button class="btn btn-primary btn-sm" @click="confirmEnroll" :disabled="mfaBusy">{{ mfaBusy ? 'Verifying…' : 'Verify and turn on' }}</button>
          <button class="btn btn-ghost btn-sm" @click="cancelEnroll" :disabled="mfaBusy">Cancel</button>
        </div>
      </template>

      <!-- off -->
      <template v-else>
        <p style="font-size:14px; margin:0 0 12px;"><span class="muted" style="font-weight:700;">○ Off</span></p>
        <p v-if="mfaError" style="color:var(--red); font-size:13px; margin:0 0 10px;">{{ mfaError }}</p>
        <button class="btn btn-primary btn-sm" @click="startEnroll" :disabled="mfaBusy">{{ mfaBusy ? 'Starting…' : 'Set up authenticator app' }}</button>
      </template>

      <p class="muted" style="font-size:12px; line-height:1.6; margin:16px 0 0;">
        Lost your phone? An admin can remove your authenticator from <strong>Supabase → Authentication → Users</strong> to restore access.
      </p>
    </div>

    <div class="card" style="padding:22px; max-width:640px; margin-top:18px;">
      <h2 style="margin:0 0 6px; font-size:16px;">Service dashboards</h2>
      <p class="muted" style="font-size:13px; line-height:1.6; margin:0 0 16px;">
        The third-party services this app runs on – open in a new tab.
      </p>
      <ul style="list-style:none; margin:0; padding:0; display:grid; gap:10px;">
        <li v-for="s in services" :key="s.name" style="display:flex; align-items:baseline; gap:12px; flex-wrap:wrap;">
          <a :href="s.url" target="_blank" rel="noopener" class="btn btn-ghost btn-sm" style="text-decoration:none; min-width:128px; text-align:left;">{{ s.name }} ↗</a>
          <span class="muted" style="font-size:13px;">{{ s.what }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { store } from '../store.js'
import { config } from '../../config.js'

// ── two-factor (TOTP) enrolment ──
const mfaLoading = ref(true)
const mfaBusy = ref(false)
const mfaError = ref('')
const activeFactor = ref(null)
const enroll = ref(null)       // enrol payload while a setup is in progress
const enrollCode = ref('')

const qrSrc = computed(() => {
  const q = enroll.value?.totp?.qr_code || ''
  if (!q) return ''
  return q.startsWith('data:') ? q : 'data:image/svg+xml;utf8,' + encodeURIComponent(q)
})

async function loadFactors() {
  mfaLoading.value = true
  try {
    const { data } = await store.listMfaFactors()
    activeFactor.value = (data?.totp || []).find((f) => f.status === 'verified') || null
  } catch { activeFactor.value = null } finally { mfaLoading.value = false }
}
async function startEnroll() {
  mfaError.value = ''; mfaBusy.value = true
  try { enroll.value = await store.enrollMfa('Authenticator app') } catch (e) { mfaError.value = e.message } finally { mfaBusy.value = false }
}
async function confirmEnroll() {
  mfaError.value = ''; mfaBusy.value = true
  try {
    await store.confirmMfa(enroll.value.id, enrollCode.value.trim())
    enroll.value = null; enrollCode.value = ''
    await loadFactors()
  } catch (e) { mfaError.value = e.message } finally { mfaBusy.value = false }
}
function cancelEnroll() {
  if (enroll.value?.id) store.removeMfa(enroll.value.id).catch(() => {}) // drop the unverified factor
  enroll.value = null; enrollCode.value = ''; mfaError.value = ''
}
async function turnOff() {
  if (!confirm('Turn off two-factor authentication for your account?')) return
  mfaBusy.value = true
  try { await store.removeMfa(activeFactor.value.id); await loadFactors() } catch (e) { mfaError.value = e.message } finally { mfaBusy.value = false }
}
onMounted(loadFactors)

// Link to this project's Authentication → Users page.
const projectRef = (config.supabaseUrl || '').match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]
const supabaseProject = projectRef ? `https://supabase.com/dashboard/project/${projectRef}` : 'https://supabase.com/dashboard'
const usersUrl = `${supabaseProject}/auth/users`

// Every third-party service the app depends on, for quick access. Entries with no
// URL (e.g. the source repo when VITE_REPO_URL isn't set) are dropped.
const services = [
  { name: 'Supabase', url: supabaseProject, what: 'Database, authentication and file storage' },
  { name: 'Vercel', url: 'https://vercel.com/dashboard', what: 'Hosting and deployments (auto-deploys on push to main)' },
  { name: 'PostHog (EU)', url: 'https://eu.posthog.com', what: 'Usage analytics (cookie-free)' },
  { name: 'Brevo', url: 'https://app.brevo.com', what: 'Transactional email (sign-in and password-reset)' },
  { name: 'Source code', url: config.repoUrl, what: 'Code repository' },
].filter((s) => s.url)
</script>
