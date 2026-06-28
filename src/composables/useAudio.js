// Real HTML5 Audio playback (BRD §6.4 step 4, §10 "Story Card").
// Replaces the prototype's setInterval timer simulation. When a location has no
// audioUrl we fall back to a silent timer so the player still demonstrates the
// scrub UI against the recorded audioDuration (seed data has durations but no
// files yet).

import { ref, onUnmounted } from 'vue'

export function useAudio() {
  const playing = ref(false)
  const currentTime = ref(0)
  const duration = ref(0)
  const hasFile = ref(false)

  let el = null
  let simTimer = null
  let simDuration = 0

  function clearSim() {
    if (simTimer) { clearInterval(simTimer); simTimer = null }
  }

  function load(url, fallbackDuration = 0) {
    teardown()
    currentTime.value = 0
    playing.value = false
    if (url) {
      hasFile.value = true
      el = new Audio(url)
      el.preload = 'metadata'
      el.addEventListener('timeupdate', () => (currentTime.value = el.currentTime))
      el.addEventListener('loadedmetadata', () => (duration.value = el.duration || fallbackDuration))
      el.addEventListener('ended', () => { playing.value = false; currentTime.value = duration.value })
      duration.value = fallbackDuration
    } else {
      hasFile.value = false
      simDuration = fallbackDuration
      duration.value = fallbackDuration
    }
  }

  function toggle() {
    if (hasFile.value && el) {
      if (playing.value) { el.pause(); playing.value = false }
      else { el.play(); playing.value = true }
      return
    }
    // simulated playback
    if (playing.value) { clearSim(); playing.value = false }
    else {
      playing.value = true
      simTimer = setInterval(() => {
        currentTime.value += 1
        if (currentTime.value >= simDuration) { clearSim(); playing.value = false; currentTime.value = simDuration }
      }, 1000)
    }
  }

  function seek(fraction) {
    const f = Math.max(0, Math.min(1, fraction))
    const t = Math.round(f * duration.value)
    currentTime.value = t
    if (hasFile.value && el) el.currentTime = t
  }

  function teardown() {
    clearSim()
    if (el) { el.pause(); el.src = ''; el = null }
    playing.value = false
  }

  onUnmounted(teardown)

  return { playing, currentTime, duration, hasFile, load, toggle, seek, teardown }
}
