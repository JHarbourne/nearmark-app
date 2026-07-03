<!--
  Public mobile app root – single state-driven component (one component with
  screen state). Orchestrates every screen; data comes from Supabase (seed
  fallback), GPS from the real Web Geolocation API, audio from real HTML5 Audio.
-->
<template>
  <div class="app-stage">
    <main class="phone-frame">
      <!-- loading -->
      <div v-if="loading" :style="loadingWrap">
        <span style="display:flex;gap:3px;">
          <span v-for="c in bars" :key="c" :style="{ width:'5px', height:'22px', borderRadius:'2px', background:c, animation:'barflow 1.1s ease-in-out infinite' }"></span>
        </span>
        <h1 style="font-family:var(--font-body);font-size:16px;font-weight:400;color:var(--ink-muted);margin-top:18px;">Loading {{ cityName }}…</h1>
      </div>

      <template v-else>
        <SplashScreen v-if="screen==='splash'" @grant="grantLocation" @skip="goCity" />

        <CityScreen v-else-if="screen==='city'" :cities="cities" @select="selectCity" />

        <CoverScreen
          v-else-if="screen==='cover'"
          :city-name="cityName"
          :location-count="locations.length"
          :tour-count="tours.length"
          @guided="track('mode_selected', { mode: 'guided' }); screen='tourList'"
          @discovery="startDiscovery"
          @settings="settingsOpen=true"
        />

        <TourListScreen
          v-else-if="screen==='tourList'"
          :city="cityName"
          :tours="tourCards"
          @open="openTour"
          @back="screen='cover'"
        />

        <TourDetailScreen
          v-else-if="screen==='tourDetail'"
          :tour="activeTour"
          :stops="tourStops"
          :duration-label="durationLabel"
          :distance-label="distanceLabel"
          @start="startTour"
          @open-stop="openStory"
          @back="screen='tourList'"
        />

        <MapView
          v-else-if="isMap"
          :guided="mapMode==='guided'"
          :locations="mapMarkers"
          :tour-stops="tourStops"
          :route-geometry="activeTour?.routeGeometry || []"
          :visited-ids="visited"
          :next-stop="nextStop"
          :next-stop-distance="nextStopDistance"
          :proximity="proximityLoc"
          :user-position="geo.position.value"
          :show-next-card="showNextCard"
          :show-discovery-sim="showDiscoverySim"
          :gps-live="gpsLive"
          :permission="geo.permission.value"
          :center="mapCenter"
          :zoom="mapZoom"
          @enable-location="geo.start()"
          @exit="exitMap"
          @open-story="openStory"
          @arrive="arriveNext"
          @simulate="simulate"
          @open-banner="openFromBanner"
          @home="goCover"
          @tours="goTours"
          @settings="settingsOpen=true"
        />

        <CompletionScreen
          v-else-if="screen==='completion'"
          :visited-count="visited.length || tourStops.length"
          :time-label="timeTaken"
          @keep="startDiscovery"
          @home="goCover"
        />

        <!-- overlays -->
        <StoryCard
          v-if="openLoc"
          :loc="openLoc"
          :related="relatedFor(openLoc)"
          :audio-on="settings.audioOn"
          :show-continue="showContinue"
          :continue-label="continueLabel"
          @close="closeStory"
          @open-related="openStory"
          @continue="continueStop"
        />

        <SettingsSheet
          v-if="settingsOpen"
          :audio-on="settings.audioOn"
          :units="settings.units"
          :permission="geo.permission.value"
          @close="settingsOpen=false"
          @toggle-audio="settings.audioOn = !settings.audioOn"
          @toggle-units="settings.units = settings.units==='mi' ? 'km' : 'mi'"
          @enable-location="geo.start()"
        />

        <!-- location re-prompt when starting a mode without permission granted -->
        <LocationPrompt
          v-if="pendingMode"
          :mode="pendingMode"
          :permission="geo.permission.value"
          @enable="onEnableLocation"
          @continue="onContinueWithout"
          @close="pendingMode=null"
        />
      </template>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import SplashScreen from './components/SplashScreen.vue'
import CityScreen from './components/CityScreen.vue'
import CoverScreen from './components/CoverScreen.vue'
import TourListScreen from './components/TourListScreen.vue'
import TourDetailScreen from './components/TourDetailScreen.vue'
import MapView from './components/MapView.vue'
import LocationPrompt from './components/LocationPrompt.vue'
import StoryCard from './components/StoryCard.vue'
import CompletionScreen from './components/CompletionScreen.vue'
import SettingsSheet from './components/SettingsSheet.vue'

import { fetchLocations, fetchTours } from './lib/supabase.js'
import { config } from './config.js'
import { theme } from './theme.js'
import { track } from './lib/analytics.js'
import { distanceMeters, formatDistance, routeLength } from './lib/geo.js'
import { useGeolocation } from './composables/useGeolocation.js'
import { settings } from './composables/useSettings.js'
import { SEED_CITIES } from './data/seed.js'

const bars = theme.brandBars

// ── data ──
const loading = ref(true)
const locations = ref([])
const tours = ref([])
const byId = computed(() => Object.fromEntries(locations.value.map((l) => [l.id, l])))

// Single-city deployments set the active city via env (VITE_CITY_NAME + map
// centre); this fully overrides the bundled generic SEED_CITIES. With no
// cityName configured we fall back to the seed (and its multi-city picker).
const configCity = config.cityName
  ? { id: 'primary', name: config.cityName, area: config.cityArea, lat: config.mapCenter.lat, lng: config.mapCenter.lng, live: true }
  : null
const cities = configCity ? [configCity] : SEED_CITIES
const activeCity = ref(cities[0])
const cityName = computed(() => activeCity.value?.name || 'London')

// ── screen state ──
const screen = ref('splash')          // splash | city | cover | tourList | tourDetail | map | completion
const mapMode = ref('guided')         // guided | discovery
const isMap = computed(() => screen.value === 'map')

const activeTour = ref(null)
const visited = ref([])
const nextIdx = ref(0)
const openId = ref(null)
const proximityId = ref(null)
const shownDiscovery = ref([])
const settingsOpen = ref(false)
let tourStart = 0

// ── GPS ──
const geo = useGeolocation()
const gpsLive = computed(() => geo.permission.value === 'granted' && !!geo.position.value && !geo.position.value.simulated)

const mapCenter = computed(() => ({ lat: activeCity.value.lat, lng: activeCity.value.lng }))
const mapZoom = ref(config.mapZoom)

onMounted(async () => {
  geo.refreshPermission()
  try {
    const [locs, trs] = await Promise.all([fetchLocations(true), fetchTours(true)])
    locations.value = locs
    tours.value = trs
    activeTour.value = trs[0] || null
  } catch (e) {
    console.error('Data load failed:', e)
  } finally {
    loading.value = false
  }
  // Deep links – power the admin "Preview" buttons and make URLs shareable; drafts
  // resolve too when an admin is signed in in the same browser (shared session →
  // RLS):  /?story=<slug> opens that story · /?tour=<slug> opens that tour detail.
  const params = new URLSearchParams(window.location.search)
  const storyId = params.get('story')
  const tourId = params.get('tour')
  if (storyId && byId.value[storyId]) { screen.value = 'cover'; openId.value = storyId }
  else if (tourId) { const t = tours.value.find((x) => x.id === tourId); if (t) { activeTour.value = t; screen.value = 'tourDetail' } }
})

// ── derived: tour stops in order ──
const tourStops = computed(() => {
  if (!activeTour.value) return []
  const ov = activeTour.value.stopOverrides || {}
  return activeTour.value.stopIds
    .map((id, i) => {
      const l = byId.value[id]
      if (!l) return null
      const o = ov[id] // per-tour title/blurb; fall back to the location's own
      return { ...l, tourNum: i + 1, title: o?.title || l.title, summary: o?.blurb || l.summary }
    })
    .filter(Boolean)
})

const tourCards = computed(() =>
  tours.value.map((t) => {
    const stops = t.stopIds.map((id) => byId.value[id]).filter(Boolean)
    const mins = estimateMins(t, stops)
    return { ...t, durationLabel: fmtDuration(mins), distanceLabel: fmtRouteDistance(stops) }
  })
)

const durationLabel = computed(() => fmtDuration(estimateMins(activeTour.value, tourStops.value)))
const distanceLabel = computed(() => fmtRouteDistance(tourStops.value))

function estimateMins(tour, stops) {
  if (tour?.durationOverrideMins) return tour.durationOverrideMins
  const dwell = stops.length * 12 // avg dwell per stop
  const walk = Math.round(routeLength(stops) / 80) // ~80 m/min walking
  return dwell + walk
}
function fmtDuration(mins) {
  if (!mins) return '—'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h ? `~${h}h ${m}m` : `~${m}m`
}
function fmtRouteDistance(stops) {
  return formatDistance(routeLength(stops), settings.units)
}

// ── map markers for current mode ──
// Discovery mode omits locations flagged "guided tour only" — they only make
// sense inside a narrated tour sequence. Guided tours still include every stop.
const discoverableLocations = computed(() => locations.value.filter((l) => !l.guidedTourOnly))
const mapMarkers = computed(() =>
  mapMode.value === 'guided'
    ? tourStops.value
    : discoverableLocations.value
)

// ── next stop ──
const nextStop = computed(() => tourStops.value[nextIdx.value] || null)
const nextStopDistance = computed(() => {
  if (!nextStop.value) return ''
  if (gpsLive.value) {
    return formatDistance(distanceMeters(geo.position.value, nextStop.value), settings.units)
  }
  return '—'
})

// ── story ──
const openLoc = computed(() => {
  if (!openId.value) return null
  const l = byId.value[openId.value]
  if (!l) return null
  // within a guided tour, apply that tour's per-stop title/blurb override
  const o = mapMode.value === 'guided' && activeTour.value && activeTour.value.stopOverrides?.[l.id]
  return o ? { ...l, title: o.title || l.title, summary: o.blurb || l.summary } : l
})
const showContinue = computed(
  () =>
    !!openLoc.value &&
    mapMode.value === 'guided' &&
    isMap.value &&
    nextStop.value &&
    openLoc.value.id === nextStop.value.id &&
    !visited.value.includes(openLoc.value.id)
)
const continueLabel = computed(() =>
  nextIdx.value >= tourStops.value.length - 1 ? 'Finish tour' : 'Mark visited · next stop'
)
function relatedFor(loc) {
  return (loc.relatedIds || [])
    .map((id) => byId.value[id])
    .filter(Boolean)
    .map((r) => ({ id: r.id, title: r.title, period: r.period, hue: r.hue }))
}

// ── discovery proximity ──
const proximityLoc = computed(() => (proximityId.value ? byId.value[proximityId.value] : null))
const showNextCard = computed(() => isMap.value && mapMode.value === 'guided' && nextStop.value && !openId.value)
const showDiscoverySim = computed(() => isMap.value && mapMode.value === 'discovery' && !proximityId.value && !openId.value)
const timeTaken = ref('—')

// Real-GPS proximity detection (BRD §10): auto-unlock on arrival within radius.
watch(
  () => geo.position.value,
  (pos) => {
    if (!pos || !isMap.value) return
    if (mapMode.value === 'guided') {
      const s = nextStop.value
      if (s && !openId.value && !visited.value.includes(s.id)) {
        if (distanceMeters(pos, s) <= (s.triggerRadius || 80)) openStory(s.id)
      }
    } else {
      if (openId.value || proximityId.value) return
      const near = discoverableLocations.value.find(
        (l) => l.lat != null && !shownDiscovery.value.includes(l.id) && distanceMeters(pos, l) <= (l.triggerRadius || 80)
      )
      if (near) {
        proximityId.value = near.id
        shownDiscovery.value = [...new Set([...shownDiscovery.value, near.id])]
      }
    }
  },
  { deep: true }
)

// ── navigation ──
function grantLocation() { geo.start(); goCity() }
function goCity() { screen.value = cities.length > 1 ? 'city' : 'cover' }
function selectCity(c) { activeCity.value = c; screen.value = 'cover' }

function openTour(t) { activeTour.value = tours.value.find((x) => x.id === t.id) || t; screen.value = 'tourDetail' }

// Both modes lean on GPS (Discovery requires it; Guided uses it to track the
// route). If location hasn't been granted, ask at the moment it matters rather
// than dead-ending – the splash "Not now" no longer leaves the user stuck.
const pendingMode = ref(null) // 'guided' | 'discovery' while the prompt is open
function startTour() { gateStart('guided') }
function startDiscovery() { gateStart('discovery') }
function gateStart(mode) {
  if (geo.permission.value === 'granted' || geo.permission.value === 'unsupported') return doStart(mode)
  pendingMode.value = mode
}
function doStart(mode) {
  pendingMode.value = null
  if (mode === 'guided') beginTour()
  else beginDiscovery()
}
function onEnableLocation() { const m = pendingMode.value; geo.start(); doStart(m) }
function onContinueWithout() { doStart(pendingMode.value) }

function beginTour() {
  visited.value = []
  nextIdx.value = 0
  mapMode.value = 'guided'
  tourStart = Date.now()
  screen.value = 'map'
  track('tour_started', { tour_id: activeTour.value?.id, title: activeTour.value?.title })
}
function beginDiscovery() {
  mapMode.value = 'discovery'
  proximityId.value = null
  shownDiscovery.value = []
  openId.value = null
  screen.value = 'map'
  track('mode_selected', { mode: 'discovery' })
}
function exitMap() {
  openId.value = null
  screen.value = mapMode.value === 'guided' ? 'tourDetail' : 'cover'
}
function goCover() { resetSession(); screen.value = 'cover' }
function goTours() { openId.value = null; screen.value = 'tourList' }
function resetSession() {
  openId.value = null; visited.value = []; nextIdx.value = 0
  proximityId.value = null; shownDiscovery.value = []; settingsOpen.value = false
}

function openStory(id) {
  openId.value = id
  if (proximityId.value === id) proximityId.value = null
  const l = byId.value[id]
  track('story_viewed', { location_id: id, title: l?.title, mode: mapMode.value })
}
function closeStory() { openId.value = null }
function arriveNext() { if (nextStop.value) openStory(nextStop.value.id) }
function continueStop() {
  const s = nextStop.value
  if (!s) return
  if (!visited.value.includes(s.id)) visited.value = [...visited.value, s.id]
  nextIdx.value += 1
  openId.value = null
  if (nextIdx.value >= tourStops.value.length) {
    const mins = Math.max(1, Math.round((Date.now() - tourStart) / 60000))
    timeTaken.value = fmtDuration(mins).replace('~', '')
    screen.value = 'completion'
    track('tour_completed', { tour_id: activeTour.value?.id, stops: visited.value.length, minutes: mins })
  }
}
function openFromBanner() { if (proximityId.value) openStory(proximityId.value) }

// Simulate affordances (kept from prototype) – drive a fake GPS fix so the
// experience is demonstrable at a desk. With real GPS these become "Open this
// stop" / "Scan for nearby history".
function simulate() {
  if (mapMode.value === 'guided') {
    arriveNext()
  } else {
    const pool = discoverableLocations.value
    const remaining = pool.filter((l) => !shownDiscovery.value.includes(l.id))
    const src = remaining.length ? remaining : pool
    const pick = src[Math.floor(Math.random() * src.length)]
    if (pick) {
      proximityId.value = pick.id
      shownDiscovery.value = [...new Set([...shownDiscovery.value, pick.id])]
    }
  }
}

const loadingWrap = { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }
</script>
