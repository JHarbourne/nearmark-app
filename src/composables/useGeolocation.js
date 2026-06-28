// Real Web Geolocation API wrapper (BRD §6.4 step 3, §10 "Map View").
// Replaces the prototype's hardcoded simulated position with navigator.geolocation.

import { ref, onUnmounted } from 'vue'

export function useGeolocation() {
  const position = ref(null) // { lat, lng, accuracy }
  const error = ref(null)
  const permission = ref('prompt') // 'granted' | 'denied' | 'prompt' | 'unsupported'
  const watching = ref(false)
  let watchId = null

  async function refreshPermission() {
    if (!('geolocation' in navigator)) {
      permission.value = 'unsupported'
      return
    }
    if (navigator.permissions?.query) {
      try {
        const status = await navigator.permissions.query({ name: 'geolocation' })
        permission.value = status.state
        status.onchange = () => (permission.value = status.state)
      } catch {
        /* Safari may not support permissions.query for geolocation */
      }
    }
  }

  function start() {
    if (!('geolocation' in navigator)) {
      permission.value = 'unsupported'
      error.value = 'Geolocation is not supported on this device.'
      return
    }
    if (watching.value) return
    watching.value = true
    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        position.value = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }
        permission.value = 'granted'
        error.value = null
      },
      (err) => {
        error.value = err.message
        if (err.code === err.PERMISSION_DENIED) permission.value = 'denied'
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
    )
  }

  function stop() {
    if (watchId != null) navigator.geolocation.clearWatch(watchId)
    watchId = null
    watching.value = false
  }

  // Manual override used by the "Simulate" affordances so the experience can be
  // demonstrated at a desk where the device isn't physically on location.
  function setSimulated(lat, lng) {
    position.value = { lat, lng, accuracy: 5, simulated: true }
  }

  onUnmounted(stop)

  return { position, error, permission, watching, start, stop, refreshPermission, setSimulated }
}
