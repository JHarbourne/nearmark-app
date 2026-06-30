<!-- Shown after following a password-reset link (store.recoveryMode). Sets a new
     password on the recovery session, then drops the user into the dashboard. -->
<template>
  <div class="login-stage">
    <form class="card login-card" @submit.prevent="submit">
      <div class="brand" style="margin:0 0 6px;">
        <span class="rainbow"><i v-for="c in bars" :key="c" :style="{ background: c }"></i></span>
        {{ orgName }}
      </div>
      <h1 style="font-size:22px; margin:0 0 4px;">Set a new password</h1>
      <p class="muted" style="font-size:13px; margin:0 0 18px;">Choose a new password for your admin account.</p>

      <label for="np-new">New password</label>
      <input id="np-new" type="password" v-model="password" autocomplete="new-password" placeholder="••••••••" minlength="8" required />

      <label for="np-confirm">Confirm password</label>
      <input id="np-confirm" type="password" v-model="confirm" autocomplete="new-password" placeholder="••••••••" minlength="8" required />

      <p v-if="error" style="color:var(--red); font-size:13px; margin:14px 0 0;">{{ error }}</p>

      <button class="btn btn-primary" style="width:100%; margin-top:18px;" type="submit" :disabled="busy">
        {{ busy ? 'Saving…' : 'Set password & sign in' }}
      </button>
    </form>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { store } from '../store.js'
import { theme } from '../../theme.js'

const bars = theme.brandBars
const orgName = theme.orgName
const password = ref('')
const confirm = ref('')
const error = ref('')
const busy = ref(false)

async function submit() {
  error.value = ''
  if (password.value.length < 8) { error.value = 'Use at least 8 characters.'; return }
  if (password.value !== confirm.value) { error.value = 'Passwords don’t match.'; return }
  busy.value = true
  const res = await store.setNewPassword(password.value)
  busy.value = false
  if (!res.ok) error.value = res.message
}
</script>
