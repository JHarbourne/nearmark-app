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
        <input id="login-password" type="password" v-model="password" placeholder="••••••••" autocomplete="current-password" required />

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
