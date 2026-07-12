<!--
  Map view (BRD §9.1 screen 6, §6.4 steps 1 & 3, §10 "Map View").
  Live MapLibre GL map. The basemap is an offline-capable Protomaps vector tileset
  (a per-deployment .pmtiles file via VITE_MAP_PMTILES_URL); with none set it falls
  back to raster OpenStreetMap. Custom teardrop pin markers reuse the prototype's
  SVG path and hue colours; a GeoJSON route line for guided mode; real GPS "you are
  here" dot fed from navigator.geolocation. All overlay chrome (top bar, next-stop
  card, proximity banner, bottom nav) is kept verbatim from the prototype.
-->
<template>
  <div style="position: absolute; inset: 0;">
    <!-- live map canvas (z-index:0 confines the map's internal panes/controls to
         their own stacking context so the overlay chrome below sits on top) -->
    <div ref="mapEl" style="position: absolute; inset: 0; z-index: 0;"></div>

    <!-- top bar -->
    <div :style="topBar">
      <button @click="$emit('exit')" :style="pill">
        <svg width="9" height="14" viewBox="0 0 10 16" fill="none"><path d="M8.5 1 L2 8 L8.5 15" stroke="var(--ink)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        {{ guided ? 'Exit tour' : 'Home' }}
      </button>
      <span style="display: flex; align-items: center; gap: 10px;">
        <span :style="statusPill">
          <span style="width: 7px; height: 7px; border-radius: 50%;" :style="{ background: gpsLive ? '#2FBF71' : 'var(--accent-warm)' }"></span>
          {{ guided ? 'Guided Tour' : 'Discovery' }}
        </span>
        <button ref="listToggle" @click="toggleList" :style="iconPill"
          :aria-expanded="showList ? 'true' : 'false'" aria-controls="map-loc-list"
          :aria-label="showList ? 'Hide locations list' : 'Show locations list'">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="5" cy="6.5" r="1.6" fill="currentColor"/><circle cx="5" cy="12" r="1.6" fill="currentColor"/><circle cx="5" cy="17.5" r="1.6" fill="currentColor"/><path d="M9 6.5H20 M9 12H20 M9 17.5H20" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
        </button>
      </span>
    </div>

    <!-- keyboard / screen-reader navigable list of the map's locations (accessible alternative to the pins) -->
    <div v-if="showList" id="map-loc-list" :style="listPanel" role="dialog" aria-modal="true"
      :aria-label="guided ? 'Tour stops' : 'Locations'">
      <div :style="listHeader">
        <span>{{ guided ? 'Tour stops' : 'Locations' }}</span>
        <button ref="listCloseRef" @click="closeList" :style="listCloseBtn" aria-label="Close list">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M1 1 L11 11 M11 1 L1 11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
        </button>
      </div>
      <ul :style="listUl">
        <li v-for="loc in locations" :key="loc.id">
          <button @click="selectFromList(loc)" :style="listItem">
            <span :style="listDot(loc)" aria-hidden="true"></span>
            <span style="flex: 1; text-align: left;">
              <span style="display: block; font-weight: 600;">{{ (loc.tourNum && guided) ? loc.tourNum + '. ' : '' }}{{ loc.title }}</span>
              <span style="display: block; font-size: 12px; color: var(--ink-muted);">{{ loc.period }}</span>
            </span>
          </button>
        </li>
      </ul>
    </div>

    <!-- DISCOVERY proximity banner -->
    <button v-if="proximity" @click="$emit('open-banner')" :style="banner">
      <span :style="{ flexShrink: 0, width: '42px', height: '42px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: proximity.hue }">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 21 C 8 16, 5 12.5 5 9 a7 7 0 0 1 14 0 C 19 12.5 16 16 12 21 Z" fill="var(--bg)"/><circle cx="12" cy="9" r="2.4" fill="#fff"/></svg>
      </span>
      <span style="flex: 1; min-width: 0;">
        <span style="display: block; font-size: 11px; font-weight: 700; letter-spacing: 1px; color: var(--ink-muted); text-transform: uppercase;">You're near</span>
        <span style="display: block; font-family: var(--font-heading); font-weight: 600; font-size: 16px; margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{ proximity.title }}</span>
      </span>
      <span style="flex-shrink: 0; font-size: 13px; font-weight: 700; color: var(--accent-warm);">Open</span>
    </button>

    <!-- LOCATION-OFF notice: persistent, fixable cue when GPS isn't available
         (the start-time prompt can be skipped/dismissed, so the map needs its own) -->
    <div v-if="showLocNote" :style="locNote" role="status">
      <span :style="locNoteIcon" aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 21 C 8 16, 5 12.5 5 9 a7 7 0 0 1 14 0 C 19 12.5 16 16 12 21 Z" fill="var(--accent-warm)"/><circle cx="12" cy="9" r="2.4" fill="var(--bg)"/></svg>
      </span>
      <span style="flex: 1; min-width: 0;">
        <span style="display: block; font-size: 11px; font-weight: 700; letter-spacing: 1px; color: var(--accent-warm); text-transform: uppercase;">Location off</span>
        <span style="display: block; font-size: 13px; color: var(--ink-soft); margin-top: 1px;">{{ locNoteText }}</span>
      </span>
      <button v-if="permission !== 'denied'" @click="$emit('enable-location')" :style="locNoteBtn">Turn on</button>
      <button @click="dismissedLocNote = true" :style="locNoteClose" aria-label="Dismiss location notice">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M1 1 L11 11 M11 1 L1 11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
      </button>
    </div>

    <!-- GUIDED next-stop card -->
    <div v-if="showNextCard" :style="nextCard">
      <div style="display: flex; align-items: center; gap: 13px;">
        <span :style="badgeStyle(nextStop.hue)">{{ nextStop.tourNum }}</span>
        <span style="flex: 1; min-width: 0;">
          <span style="display: block; font-size: 11px; font-weight: 700; letter-spacing: 1px; color: var(--ink-muted); text-transform: uppercase;">Next stop · {{ nextStopDistance }}</span>
          <span style="display: block; font-family: var(--font-heading); font-weight: 600; font-size: 16.5px; margin-top: 1px;">{{ nextStop.title }}</span>
        </span>
      </div>
      <button @click="$emit('arrive')" :style="arriveBtn">{{ gpsLive ? 'Open this stop' : 'Simulate arrival' }}</button>
    </div>

    <!-- DISCOVERY simulate button -->
    <button v-if="showDiscoverySim" @click="$emit('simulate')" :style="simBtn">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="2.4" fill="var(--accent-warm)"/><path d="M7.5 7.5 a6 6 0 0 0 0 9 M16.5 7.5 a6 6 0 0 1 0 9" stroke="var(--accent-warm)" stroke-width="2" stroke-linecap="round"/></svg>
      {{ gpsLive ? scanLabel : 'Simulate walking' }}
    </button>

    <!-- bottom nav -->
    <div :style="nav">
      <button @click="$emit('home')" :style="navBtn('var(--nav-inactive)')">
        <svg width="25" height="25" viewBox="0 0 24 24" fill="none"><path d="M4 11 L12 4 L20 11 V20 a1 1 0 0 1-1 1 H5 a1 1 0 0 1-1-1 Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>
        <span style="font-size: 12px; font-weight: 600;">Home</span>
      </button>
      <span :style="navBtn('var(--accent-warm)')">
        <svg width="25" height="25" viewBox="0 0 24 24" fill="none"><path d="M9 3 L3 5.5 V21 L9 18.5 L15 21 L21 18.5 V3 L15 5.5 L9 3Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M9 3 V18.5 M15 5.5 V21" stroke="currentColor" stroke-width="1.8"/></svg>
        <span style="font-size: 12px; font-weight: 700;">Map</span>
      </span>
      <button @click="$emit('tours')" :style="navBtn('var(--nav-inactive)')">
        <svg width="25" height="25" viewBox="0 0 24 24" fill="none"><circle cx="6" cy="6.5" r="2" fill="currentColor"/><circle cx="6" cy="17.5" r="2" fill="currentColor"/><path d="M11 6.5 H20 M11 17.5 H20" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
        <span style="font-size: 12px; font-weight: 600;">Tours</span>
      </button>
      <button @click="$emit('settings')" :style="navBtn('var(--nav-inactive)')">
        <svg width="25" height="25" viewBox="0 0 24 24" fill="none"><path d="M19.4 13a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.6"/></svg>
        <span style="font-size: 12px; font-weight: 600;">Settings</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import maplibregl from 'maplibre-gl'
import { Protocol } from 'pmtiles'
import { layers, LIGHT } from '@protomaps/basemaps'
import { badgeColors } from '../lib/tokens.js'
import { config } from '../config.js'

// Register the pmtiles:// protocol once so MapLibre can read a single-file vector
// basemap over HTTP range requests (offline-cacheable). Registering again under
// HMR is harmless.
maplibregl.addProtocol('pmtiles', new Protocol().tile)

const props = defineProps({
  guided: { type: Boolean, default: true },
  locations: { type: Array, default: () => [] },   // markers to show in current mode
  tourStops: { type: Array, default: () => [] },    // ordered, for the route line
  routeGeometry: { type: Array, default: () => [] }, // [[lat,lng],…] road-following path; empty → straight lines
  visitedIds: { type: Array, default: () => [] },
  nextStop: { type: Object, default: null },
  nextStopDistance: { type: String, default: '' },
  proximity: { type: Object, default: null },
  userPosition: { type: Object, default: null },
  showNextCard: { type: Boolean, default: false },
  showDiscoverySim: { type: Boolean, default: false },
  gpsLive: { type: Boolean, default: false },
  permission: { type: String, default: 'prompt' }, // geolocation permission state
  center: { type: Object, default: () => ({ lat: 51.5137, lng: -0.1341 }) },
  zoom: { type: Number, default: 15 },
})
const emit = defineEmits(['exit', 'open-story', 'arrive', 'simulate', 'open-banner', 'home', 'tours', 'settings', 'enable-location'])

const scanLabel = config.discoveryScanLabel // themeable Discovery "scan" button copy

const mapEl = ref(null)

// ── "location off" notice: shown until permission is granted (or the user
// dismisses it), so people who skipped the prompt know why they get no alerts ──
const dismissedLocNote = ref(false)
const showLocNote = computed(() =>
  props.permission !== 'granted' && props.permission !== 'unsupported' &&
  !dismissedLocNote.value && !props.proximity && !showList.value
)
const locNoteText = computed(() => {
  if (props.permission === 'denied') return 'Blocked for this site – turn it back on in your browser or device settings.'
  return props.guided
    ? 'Turn it on to see your position along the route.'
    : 'Turn it on to get alerts as you reach each site.'
})

// ── accessible locations list (keyboard / screen-reader alternative to the pins) ──
const showList = ref(false)
const listToggle = ref(null)
const listCloseRef = ref(null)
function toggleList() {
  showList.value = !showList.value
  if (showList.value) nextTick(() => listCloseRef.value?.focus?.({ preventScroll: true }))
}
function closeList() {
  showList.value = false
  nextTick(() => listToggle.value?.focus?.())
}
function onDocKeydown(e) { if (e.key === 'Escape' && showList.value) closeList() }
function selectFromList(loc) {
  showList.value = false
  emit('open-story', loc.id)
}
function listDot(loc) {
  return {
    flexShrink: 0, width: '14px', height: '14px', borderRadius: '4px',
    background: props.visitedIds.includes(loc.id) ? '#9a93a3' : loc.hue, marginTop: '3px',
  }
}

let map = null
let mapLoaded = false
let markers = []
let userMarker = null
let didFit = false

// The public map is a light basemap under the app's dark chrome (matching the
// previous OSM look). A deployment supplies its own offline vector tiles via
// VITE_MAP_PMTILES_URL; without one we fall back to raster OpenStreetMap (online).
function buildStyle() {
  const url = config.mapPmtilesUrl
  if (url) {
    return {
      version: 8,
      glyphs: 'https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf',
      sprite: 'https://protomaps.github.io/basemaps-assets/sprites/v4/light',
      sources: {
        protomaps: { type: 'vector', url: `pmtiles://${url}`, attribution: '© OpenStreetMap' },
      },
      layers: layers('protomaps', LIGHT, { lang: 'en' }),
    }
  }
  return {
    version: 8,
    sources: {
      osm: {
        type: 'raster',
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256, maxzoom: 19, attribution: '© OpenStreetMap contributors',
      },
    },
    layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
  }
}

// teardrop pin matching the prototype SVG (markup reused verbatim; rendered into a
// DOM element for a MapLibre marker rather than a Leaflet divIcon)
function pinHtml(loc) {
  const isVisited = props.visitedIds.includes(loc.id)
  const isNext = props.guided && props.nextStop && props.nextStop.id === loc.id
  const isTour = !!loc.tourNum && props.guided
  const w = isTour ? (isNext ? 42 : 34) : 24
  const h = (w * 4) / 3
  const pin = badgeColors(isVisited ? '#9a93a3' : loc.hue)
  const fill = pin.bg
  const badge = isTour ? (isVisited ? '✓' : String(loc.tourNum)) : ''
  const fontSize = isNext ? 15 : 13
  const ring = isNext
    ? `<span style="position:absolute;left:50%;top:${h * 0.34}px;width:${w * 0.82}px;height:${w * 0.82}px;border-radius:50%;border:2px solid ${loc.hue};transform:translate(-50%,-50%);animation:pulsering 1.9s ease-out infinite;"></span>`
    : ''
  const label = isTour
    ? `<span style="position:absolute;top:100%;left:50%;transform:translateX(-50%);margin-top:1px;padding:2px 7px;border-radius:7px;background:#fff;color:#1c1526;font-size:10px;font-weight:700;white-space:nowrap;max-width:120px;overflow:hidden;text-overflow:ellipsis;box-shadow:0 1px 3px rgba(0,0,0,0.28);font-family:var(--font-ui),sans-serif;">${loc.title}</span>`
    : ''
  return `
    <span style="position:relative;width:${w}px;height:${h}px;display:block;">
      ${ring}
      <svg viewBox="0 0 30 40" style="display:block;width:${w}px;height:${h}px;filter:drop-shadow(0 4px 5px rgba(0,0,0,0.35));">
        <path d="M15 38.5 C15 38.5 27 22 27 13.5 A12 12 0 1 0 3 13.5 C3 22 15 38.5 15 38.5 Z" fill="${fill}" stroke="#fff" stroke-width="2.5"></path>
        <text x="15" y="14.5" text-anchor="middle" dominant-baseline="central" font-family="Bricolage Grotesque, sans-serif" font-weight="700" font-size="${fontSize}" fill="${pin.ink}">${badge}</text>
      </svg>
      ${label}
    </span>`
}

function pinEl(loc) {
  const el = document.createElement('div')
  el.className = 'marker-pin'
  el.style.cursor = 'pointer'
  el.innerHTML = pinHtml(loc)
  const open = () => emit('open-story', loc.id)
  el.addEventListener('click', open)
  // keep the pins keyboard-reachable (parity with Leaflet's keyboard markers; the
  // accessible list panel is the primary path, this is the secondary one)
  el.tabIndex = 0
  el.setAttribute('role', 'button')
  el.setAttribute('aria-label', (loc.tourNum && props.guided ? `Stop ${loc.tourNum}: ` : '') + loc.title)
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open() }
  })
  return el
}

function userEl() {
  const el = document.createElement('div')
  el.className = 'marker-pin'
  el.style.pointerEvents = 'none'
  el.innerHTML = `
    <span style="position:relative;display:block;">
      <span style="position:absolute;left:50%;top:50%;width:62px;height:62px;border-radius:50%;background:rgba(46,124,246,0.15);transform:translate(-50%,-50%);"></span>
      <span style="position:absolute;left:50%;top:50%;width:24px;height:24px;border-radius:50%;background:#2E7CF6;transform:translate(-50%,-50%);animation:pulsedot 2.2s ease-out infinite;"></span>
      <span style="position:relative;display:block;width:17px;height:17px;border-radius:50%;background:#2E7CF6;border:3px solid #fff;box-shadow:0 1px 5px rgba(0,0,0,0.35);"></span>
    </span>`
  return el
}

// guided route: a GeoJSON line drawn as a halo + line pair beneath the markers
function renderRoute() {
  if (!map || !mapLoaded) return
  for (const id of ['route-line', 'route-halo']) if (map.getLayer(id)) map.removeLayer(id)
  if (map.getSource('route')) map.removeSource('route')
  if (!(props.guided && props.tourStops.length > 1)) return
  // prefer the stored road-following geometry; fall back to straight lines
  const latlng = (props.routeGeometry && props.routeGeometry.length > 1)
    ? props.routeGeometry
    : props.tourStops.filter((s) => s.lat != null).map((s) => [s.lat, s.lng])
  const coordinates = latlng.map(([lat, lng]) => [lng, lat]) // GeoJSON is [lng, lat]
  map.addSource('route', { type: 'geojson', data: { type: 'Feature', geometry: { type: 'LineString', coordinates } } })
  map.addLayer({ id: 'route-halo', type: 'line', source: 'route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#1f6fe0', 'line-width': 8, 'line-opacity': 0.18 } })
  map.addLayer({ id: 'route-line', type: 'line', source: 'route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#2E7CF6', 'line-width': 4.5, 'line-opacity': 0.9 } })
}

function renderMarkers() {
  if (!map || !mapLoaded) return
  renderRoute()
  markers.forEach((m) => m.remove())
  markers = []
  const pts = []
  props.locations.forEach((loc) => {
    if (loc.lat == null || loc.lng == null) return
    const m = new maplibregl.Marker({ element: pinEl(loc), anchor: 'bottom' })
      .setLngLat([loc.lng, loc.lat]).addTo(map)
    markers.push(m)
    pts.push([loc.lng, loc.lat])
  })
  if (!didFit && pts.length) {
    const b = new maplibregl.LngLatBounds()
    pts.forEach((p) => b.extend(p))
    map.fitBounds(b, { padding: 64, maxZoom: 17, animate: false })
    didFit = true
  }
}

function renderUser() {
  if (!map || !mapLoaded) return
  if (!props.userPosition) { if (userMarker) { userMarker.remove(); userMarker = null } return }
  const ll = [props.userPosition.lng, props.userPosition.lat]
  if (userMarker) userMarker.setLngLat(ll)
  else userMarker = new maplibregl.Marker({ element: userEl(), anchor: 'center' }).setLngLat(ll).addTo(map)
}

onMounted(() => {
  map = new maplibregl.Map({
    container: mapEl.value,
    style: buildStyle(),
    center: [props.center.lng, props.center.lat],
    zoom: props.zoom,
    maxZoom: 19,
    attributionControl: false,
    dragRotate: false, // a walking map doesn't rotate
  })
  map.touchZoomRotate.disableRotation()
  map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right')
  map.addControl(new maplibregl.NavigationControl({ showCompass: false, visualizePitch: false }), 'bottom-right')
  map.on('load', () => {
    mapLoaded = true
    renderMarkers()
    renderUser()
  })
  document.addEventListener('keydown', onDocKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', onDocKeydown)
  if (map) { map.remove(); map = null }
})

watch(() => [props.locations, props.guided, props.nextStop, props.visitedIds], renderMarkers, { deep: true })
watch(() => props.userPosition, renderUser, { deep: true })

// styles (overlay chrome – verbatim from prototype)
const topBar = { position: 'absolute', top: '52px', left: '16px', right: '16px', zIndex: 30, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }
const pill = { display: 'flex', alignItems: 'center', gap: '7px', height: '38px', padding: '0 15px 0 12px', borderRadius: '19px', background: 'var(--overlay-glass)', backdropFilter: 'blur(10px)', border: '1px solid var(--line)', cursor: 'pointer', color: 'var(--ink)', fontSize: '13px', fontWeight: 600 }
const statusPill = { height: '38px', padding: '0 16px', display: 'flex', alignItems: 'center', gap: '8px', borderRadius: '19px', background: 'var(--overlay-glass)', backdropFilter: 'blur(10px)', border: '1px solid var(--line)', fontSize: '12.5px', fontWeight: 700, letterSpacing: '0.3px' }
const iconPill = { width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '19px', background: 'var(--overlay-glass)', backdropFilter: 'blur(10px)', border: '1px solid var(--line)', color: 'var(--ink)', cursor: 'pointer' }
const listPanel = { position: 'absolute', top: '100px', left: '16px', right: '16px', zIndex: 50, maxHeight: '62%', display: 'flex', flexDirection: 'column', background: 'var(--overlay-panel)', backdropFilter: 'blur(14px)', border: '1px solid var(--line)', borderRadius: '18px', boxShadow: '0 14px 40px rgba(0,0,0,0.5)', overflow: 'hidden', color: 'var(--ink)' }
const listHeader = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid var(--line)', fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: '15px' }
const listCloseBtn = { width: '30px', height: '30px', borderRadius: '50%', border: 'none', background: 'var(--line)', color: 'var(--ink)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }
const listUl = { listStyle: 'none', margin: 0, padding: '6px', overflowY: 'auto' }
const listItem = { width: '100%', display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '11px 12px', borderRadius: '11px', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', font: 'inherit', fontSize: '14.5px' }
const banner = { position: 'absolute', top: '100px', left: '16px', right: '16px', zIndex: 40, display: 'flex', alignItems: 'center', gap: '13px', textAlign: 'left', padding: '13px 15px', borderRadius: '17px', background: 'var(--overlay-panel)', backdropFilter: 'blur(14px)', border: '1px solid var(--line)', boxShadow: '0 14px 40px rgba(0,0,0,0.5)', cursor: 'pointer', color: 'inherit', animation: 'bannerDown .35s ease' }
const nextCard = { position: 'absolute', bottom: '92px', left: '16px', right: '16px', zIndex: 30, padding: '15px 16px', borderRadius: '19px', background: 'var(--overlay-panel)', backdropFilter: 'blur(14px)', border: '1px solid var(--line)', boxShadow: '0 14px 40px rgba(0,0,0,0.5)' }
const locNote = { position: 'absolute', top: '100px', left: '16px', right: '16px', zIndex: 40, display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: '16px', background: 'var(--overlay-panel)', backdropFilter: 'blur(14px)', border: '1px solid rgba(255,197,61,0.4)', boxShadow: '0 14px 40px rgba(0,0,0,0.5)', color: 'var(--ink)', animation: 'bannerDown .35s ease' }
const locNoteIcon = { flexShrink: 0, width: '38px', height: '38px', borderRadius: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,197,61,0.14)' }
const locNoteBtn = { flexShrink: 0, height: '34px', padding: '0 14px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontFamily: "var(--font-button)", fontWeight: 700, fontSize: '13px', color: 'var(--bg)', background: 'var(--grad-warm)' }
const locNoteClose = { flexShrink: 0, width: '28px', height: '28px', borderRadius: '50%', border: 'none', background: 'var(--line)', color: 'var(--ink)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }
const arriveBtn = { width: '100%', height: '46px', marginTop: '13px', border: 'none', borderRadius: '13px', cursor: 'pointer', fontFamily: "var(--font-button)", fontWeight: 700, fontSize: '15px', color: 'var(--bg)', background: 'var(--grad-warm)' }
const simBtn = { position: 'absolute', bottom: 'calc(86px + max(18px, env(safe-area-inset-bottom)))', left: '50%', transform: 'translateX(-50%)', zIndex: 30, height: '48px', padding: '0 22px', display: 'flex', alignItems: 'center', gap: '10px', borderRadius: '24px', background: 'var(--overlay-panel)', backdropFilter: 'blur(14px)', border: '1px solid var(--line)', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', cursor: 'pointer', color: 'var(--ink)', fontFamily: "var(--font-button)", fontWeight: 600, fontSize: '15px', whiteSpace: 'nowrap' }
const nav = { position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 35, height: 'calc(66px + max(18px, env(safe-area-inset-bottom)))', paddingBottom: 'max(18px, env(safe-area-inset-bottom))', display: 'flex', alignItems: 'center', background: 'var(--overlay-nav)', backdropFilter: 'blur(16px)', borderTop: '1px solid var(--line)' }
function navBtn(color) {
  return { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', color, background: 'none', border: 'none', cursor: 'pointer' }
}
function badgeStyle(hue) {
  const c = badgeColors(hue)
  return {
    flexShrink: 0, width: '40px', height: '40px', borderRadius: '12px', display: 'flex',
    alignItems: 'center', justifyContent: 'center', fontFamily: "var(--font-heading)",
    fontWeight: 700, fontSize: '17px', color: c.ink, background: c.bg,
  }
}
</script>
