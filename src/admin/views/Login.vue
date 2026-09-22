<!-- A1 Login (BRD §11.1) – Supabase email/password. No self-registration;
     admin accounts are created in the Supabase dashboard by a Super Admin. -->
<template>
  <div class="login-stage">
    <form class="card login-card" @submit.prevent="submit">
      <div class="brand" style="margin:0 0 6px;">
        <span class="rainbow"><i v-for="c in bars" :key="c" :style="{ background: c }"></i></span>
        {{ orgName }}
      </div>
      <h1 style="font-size:22px; margin:0 0 4px;">Admin sign in</h1>

      <!-- step 1: email + password -->
      <template v-if="!store.mfaPending">
        <p class="muted" style="font-size:13px; margin:0 0 18px;">Authorised editors only. Accounts are provisioned by a Super Admin.</p>

        <label for="login-email">Email</label>
        <input id="login-email" type="email" v-model="email" placeholder="you@example.org" autocomplete="username" required />

        <label for="login-password">Password</label>
        <div style="position:relative;">
          <input id="login-password" :type="showPassword ? 'text' : 'password'" v-model="password" placeholder="••••••••" autocomplete="current-password" required style="padding-right:44px;" />
          <button type="button" @click="showPassword = !showPassword"
                  :aria-label="showPassword ? 'Hide password' : 'Show password'" :aria-pressed="showPassword"
                  style="position:absolute; right:4px; top:0; height:42px; width:40px; display:flex; align-items:center; justify-content:center; background:none; border:0; padding:0; cursor:pointer; color:var(--muted);">
            <svg v-if="!showPassword" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>
            <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20C5 20 1 12 1 12a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
          </button>
        </div>

        <p v-if="error" style="color:var(--red); font-size:13px; margin:14px 0 0;">{{ error }}</p>
        <p v-if="notice" style="color:var(--green); font-size:13px; margin:14px 0 0;">{{ notice }}</p>

        <button class="btn btn-primary" style="width:100%; margin-top:18px;" type="submit" :disabled="busy">
          {{ busy ? 'Signing in…' : 'Sign in' }}
        </button>
        <button type="button" class="muted linklike" @click="forgot">Forgot password?</button>
      </template>

      <!-- step 2: authenticator code (only if the account has 2FA enabled) -->
      <template v-else>
        <p class="muted" style="font-size:13px; margin:0 0 18px;">Enter the 6-digit code from your authenticator app.</p>

        <label for="mfa-code">Authentication code</label>
        <input id="mfa-code" type="text" v-model="code" inputmode="numeric" autocomplete="one-time-code" placeholder="123456" maxlength="6" required />

        <p v-if="error" style="color:var(--red); font-size:13px; margin:14px 0 0;">{{ error }}</p>

        <button class="btn btn-primary" style="width:100%; margin-top:18px;" type="submit" :disabled="busy">
          {{ busy ? 'Verifying…' : 'Verify' }}
        </button>
        <button type="button" class="muted linklike" @click="store.signOut()">Cancel</button>
      </template>
    </form>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { store } from '../store.js'
import { theme } from '../../theme.js'

const bars = theme.brandBars
const orgName = theme.orgName
const email = ref('')
const password = ref('')
const showPassword = ref(false)
const code = ref('')
const error = ref('')
const notice = ref('')
const busy = ref(false)

async function submit() {
  error.value = ''; notice.value = ''; busy.value = true
  const res = store.mfaPending
    ? await store.verifyMfa(code.value.trim())
    : await store.signIn(email.value, password.value)
  busy.value = false
  if (!res.ok) error.value = res.message
}
async function forgot() {
  error.value = ''; notice.value = ''
  if (!email.value) { error.value = 'Enter your email above first, then tap “Forgot password?”.'; return }
  const { error: e } = await store.resetPassword(email.value)
  notice.value = e ? '' : 'Password reset email sent – check your inbox.'
  if (e) error.value = e.message
}
</script>
