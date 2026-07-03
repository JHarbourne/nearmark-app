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
      <div class="pw-wrap">
        <input id="np-new" :type="reveal ? 'text' : 'password'" v-model="password" autocomplete="new-password" placeholder="••••••••" minlength="8" required />
        <button type="button" class="pw-eye" :aria-label="reveal ? 'Hide password' : 'Show password'" :aria-pressed="reveal" @click="reveal = !reveal">{{ reveal ? '🙈' : '👁' }}</button>
      </div>

      <label for="np-confirm">Confirm password</label>
      <div class="pw-wrap">
        <input id="np-confirm" :type="reveal ? 'text' : 'password'" v-model="confirm" autocomplete="new-password" placeholder="••••••••" minlength="8" required />
        <button type="button" class="pw-eye" :aria-label="reveal ? 'Hide password' : 'Show password'" :aria-pressed="reveal" @click="reveal = !reveal">{{ reveal ? '🙈' : '👁' }}</button>
      </div>

      <p v-if="confirm" role="status" style="font-size:12.5px; margin:8px 0 0; font-weight:600;" :style="{ color: match ? 'var(--green)' : 'var(--amber)' }">
        {{ match ? '✓ Passwords match' : '✗ Passwords don’t match yet' }}
      </p>

      <template v-if="store.recoveryNeedsMfa">
        <label for="np-code" style="margin-top:16px;">Authenticator code <span class="hint">from your 2FA app</span></label>
        <input id="np-code" v-model="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="123456" />
        <p class="muted" style="font-size:12px; margin:6px 0 0;">Your account has two-factor turned on, so enter your current authenticator code to confirm this change.</p>
      </template>

      <p v-if="error" style="color:var(--red); font-size:13px; margin:14px 0 0;">{{ error }}</p>

      <button class="btn btn-primary" style="width:100%; margin-top:18px;" type="submit" :disabled="busy || !match || password.length < 8 || (store.recoveryNeedsMfa && code.trim().length < 6)">
        {{ busy ? 'Saving…' : 'Set password & sign in' }}
      </button>
    </form>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { store } from '../store.js'
import { theme } from '../../theme.js'

const bars = theme.brandBars
const orgName = theme.orgName
const password = ref('')
const confirm = ref('')
const code = ref('')
const error = ref('')
const busy = ref(false)
const reveal = ref(false)
const match = computed(() => password.value.length > 0 && password.value === confirm.value)

// Find out if this account needs a 2FA code before the password can be changed.
onMounted(() => store.checkRecoveryMfa())

async function submit() {
  error.value = ''
  if (password.value.length < 8) { error.value = 'Use at least 8 characters.'; return }
  if (password.value !== confirm.value) { error.value = 'Passwords don’t match.'; return }
  if (store.recoveryNeedsMfa && code.value.trim().length < 6) { error.value = 'Enter your 6-digit authenticator code.'; return }
  busy.value = true
  const res = await store.setNewPassword(password.value, code.value.trim())
  busy.value = false
  if (!res.ok) error.value = res.message
}
</script>

<style scoped>
.pw-wrap { position: relative; }
.pw-wrap input { padding-right: 44px; }
.pw-eye {
  position: absolute; right: 6px; top: 50%; transform: translateY(-50%);
  background: none; border: none; cursor: pointer; font-size: 17px; line-height: 1;
  padding: 6px 8px; border-radius: 6px; color: var(--muted);
}
.pw-eye:hover { background: var(--bg); }
.pw-eye:focus-visible { outline: 2px solid var(--violet); outline-offset: 1px; }
</style>
