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
      <h2 style="margin:0 0 6px; font-size:16px;">Editors</h2>
      <p class="muted" style="font-size:13px; line-height:1.6; margin:0 0 16px;">
        Invite editors by email – they set their own password via the link. Self-signup
        stays disabled, so only invited people can reach the backoffice.
      </p>

      <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:flex-end; margin:0 0 14px;">
        <div style="flex:1; min-width:200px;">
          <label for="invite-email">Invite by email</label>
          <input id="invite-email" type="email" v-model="inviteEmail" placeholder="editor@example.org" autocomplete="off" @keyup.enter="invite" />
        </div>
        <button class="btn btn-primary" @click="invite" :disabled="inviting || !inviteEmail">{{ inviting ? 'Sending…' : 'Send invite' }}</button>
      </div>
      <p v-if="userMsg" role="status" :style="{ fontSize:'13px', margin:'0 0 14px', color: userErr ? 'var(--red)' : 'var(--green)' }">{{ userMsg }}</p>

      <p v-if="loadingUsers" class="muted" style="font-size:14px;">Loading editors…</p>
      <p v-else-if="loadError" style="font-size:13px; color:var(--red); line-height:1.6;">
        Couldn't load editors: {{ loadError }}<br>
        <span class="muted" style="font-size:12px;">Has the <code>admin-users</code> Edge Function been deployed?</span>
      </p>
      <table v-else-if="users.length">
        <thead><tr><th>Email</th><th>Last sign-in</th><th class="right">Access</th></tr></thead>
        <tbody>
          <tr v-for="u in users" :key="u.id">
            <td style="font-weight:600;">{{ u.email }}<span v-if="!u.confirmed" class="muted" style="font-weight:400; margin-left:6px;">· invited</span></td>
            <td class="muted">{{ u.lastSignInAt ? new Date(u.lastSignInAt).toLocaleDateString() : '—' }}</td>
            <td class="right">
              <button v-if="u.email !== store.user?.email" class="btn btn-danger btn-sm" @click="remove(u)">Remove</button>
              <span v-else class="muted" style="font-size:13px;">you</span>
            </td>
          </tr>
        </tbody>
      </table>
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
import { adminUsers } from '../../lib/supabase.js'

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

// ── editors (via the admin-users Edge Function) ──
const users = ref([])
const loadingUsers = ref(true)
const loadError = ref('')
const inviteEmail = ref('')
const inviting = ref(false)
const userMsg = ref('')
const userErr = ref(false)

async function loadUsers() {
  loadingUsers.value = true; loadError.value = ''
  try { const r = await adminUsers.list(); users.value = r.users || [] }
  catch (e) { loadError.value = e.message } finally { loadingUsers.value = false }
}
async function invite() {
  const addr = inviteEmail.value.trim()
  if (!addr) return
  inviting.value = true; userMsg.value = ''
  try {
    await adminUsers.invite(addr, window.location.origin + '/admin')
    userErr.value = false; userMsg.value = `Invite sent to ${addr}.`; inviteEmail.value = ''
    await loadUsers()
  } catch (e) { userErr.value = true; userMsg.value = e.message } finally { inviting.value = false }
}
async function remove(u) {
  if (!confirm(`Remove ${u.email}? They’ll lose access immediately.`)) return
  userMsg.value = ''
  try { await adminUsers.remove(u.id); userErr.value = false; userMsg.value = `Removed ${u.email}.`; await loadUsers() }
  catch (e) { userErr.value = true; userMsg.value = e.message }
}
onMounted(loadUsers)

// Supabase dashboard link for the services list below.
const projectRef = (config.supabaseUrl || '').match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]
const supabaseProject = projectRef ? `https://supabase.com/dashboard/project/${projectRef}` : 'https://supabase.com/dashboard'

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
