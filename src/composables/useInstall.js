// Add-to-home-screen helper. Captures the (Android/desktop Chrome/Edge)
// `beforeinstallprompt` event at module load so we can offer a custom Install
// button, and detects the iOS-Safari case where install is manual only.

import { ref } from 'vue'

const deferred = ref(null)   // the saved beforeinstallprompt event (Chrome/Edge/Android)
const installed = ref(false)

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()       // stop Chrome's mini-infobar; we show our own button
    deferred.value = e
  })
  window.addEventListener('appinstalled', () => {
    installed.value = true
    deferred.value = null
  })
}

const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
const isIOS = /iphone|ipad|ipod/i.test(ua) ||
  // iPadOS 13+ reports as Mac; detect by touch
  (/macintosh/i.test(ua) && typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1)
const isSafari = /^((?!chrome|crios|fxios|android|edg).)*safari/i.test(ua)
const isStandalone = typeof window !== 'undefined' &&
  (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true)

export function useInstall() {
  async function promptInstall() {
    if (!deferred.value) return 'unavailable'
    deferred.value.prompt()
    const { outcome } = await deferred.value.userChoice
    deferred.value = null
    return outcome // 'accepted' | 'dismissed'
  }
  return { deferred, installed, isIOS, isSafari, isStandalone, promptInstall }
}
