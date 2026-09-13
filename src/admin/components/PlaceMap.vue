<!--
  Click-to-place map (BRD §11.4 core principle). The admin never types
  coordinates: clicking the map drops a draggable pin and emits {lat,lng}.
  Also used (read-only route preview) by the Tour Editor.

  Uses MapLibre GL (same engine as the public map) so the app ships one map
  library, not two. Basemap here is raster OpenStreetMap (the admin doesn't need
  the offline vector basemap the public app uses).
-->
<template>
  <div>
    <div ref="el" class="place-map"></div>
    <div class="coords" v-if="!routeOnly">
      📍 {{ model ? `${model.lat.toFixed(5)}, ${model.lng.toFixed(5)}` : 'Click the map to drop a pin' }}
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import maplibregl from 'maplibre-gl'
import { badgeColors } from '../../lib/tokens.js'

const props = defineProps({
  modelValue: { type: Object, default: null },     // { lat, lng }
  hue: { type: String, default: '#6b46e5' },
  routeOnly: { type: Boolean, default: false },
  routePoints: { type: Array, default: () => [] },  // [{lat,lng,hue,num}]
  routeGeometry: { type: Array, default: () => [] }, // [[lat,lng],…] road-following path; empty → straight
  center: { type: Object, default: () => ({ lat: 51.5137, lng: -0.1341 }) },
})
const emit = defineEmits(['update:modelValue'])
const model = ref(props.modelValue)

const el = ref(null)
let map = null
let mapReady = false
let marker = null
let routeMarkers = []

const rasterStyle = {
  version: 8,
  sources: { osm: { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256, attribution: '© OpenStreetMap' } },
  layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
}

// Build the teardrop pin as a DOM element for a MapLibre marker (num → route badge).
function pinEl(hue, num) {
  const c = badgeColors(hue)
  const w = num != null ? 26 : 22
  const h = num != null ? 34 : 30
  const label = num != null
    ? `<text x="15" y="14.5" text-anchor="middle" dominant-baseline="central" font-family="Bricolage Grotesque, sans-serif" font-weight="700" font-size="13" fill="${c.ink}">${num}</text>`
    : ''
  const div = document.createElement('div')
  div.style.cssText = `width:${w}px;height:${h}px;filter:drop-shadow(0 3px 4px rgba(0,0,0,0.3));cursor:${num != null ? 'default' : 'grab'};`
  div.innerHTML = `<svg viewBox="0 0 30 40" width="${w}" height="${h}" style="display:block"><path d="M15 38.5 C15 38.5 27 22 27 13.5 A12 12 0 1 0 3 13.5 C3 22 15 38.5 15 38.5 Z" fill="${c.bg}" stroke="#fff" stroke-width="2.5"/>${label}</svg>`
  return div
}

function placeMarker(lng, lat) {
  model.value = { lat, lng }
  emit('update:modelValue', model.value)
  if (marker) marker.setLngLat([lng, lat])
  else {
    marker = new maplibregl.Marker({ element: pinEl(props.hue), draggable: true, anchor: 'bottom' }).setLngLat([lng, lat]).addTo(map)
    marker.on('dragend', () => { const p = marker.getLngLat(); placeMarker(p.lng, p.lat) })
  }
}

function drawRoute() {
  if (!map || !mapReady) return
  routeMarkers.forEach((m) => m.remove())
  routeMarkers = []
  const pts = props.routePoints.filter((p) => p.lat != null)
  const line = (props.routeGeometry && props.routeGeometry.length > 1)
    ? props.routeGeometry.map(([la, ln]) => [ln, la])      // stored [lat,lng] → [lng,lat]
    : pts.map((p) => [p.lng, p.lat])
  const src = map.getSource('route')
  if (src) src.setData({ type: 'Feature', geometry: { type: 'LineString', coordinates: pts.length > 1 ? line : [] } })
  pts.forEach((p) => routeMarkers.push(
    new maplibregl.Marker({ element: pinEl(p.hue || '#6b46e5', p.num), anchor: 'bottom' }).setLngLat([p.lng, p.lat]).addTo(map),
  ))
  if (pts.length) {
    const b = new maplibregl.LngLatBounds()
    pts.forEach((p) => b.extend([p.lng, p.lat]))
    map.fitBounds(b, { padding: 50, animate: false, maxZoom: 16 })
  }
}

onMounted(() => {
  const c = props.modelValue || props.center
  map = new maplibregl.Map({ container: el.value, style: rasterStyle, center: [c.lng, c.lat], zoom: 16, attributionControl: false })
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
  map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right')
  map.on('load', () => {
    mapReady = true
    if (props.routeOnly) {
      map.addSource('route', { type: 'geojson', data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [] } } })
      map.addLayer({ id: 'route-line', type: 'line', source: 'route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#2E7CF6', 'line-width': 4, 'line-opacity': 0.85 } })
      drawRoute()
    } else {
      map.on('click', (e) => placeMarker(e.lngLat.lng, e.lngLat.lat))
      if (props.modelValue) placeMarker(props.modelValue.lng, props.modelValue.lat)
    }
  })
})
onUnmounted(() => { if (map) map.remove() })

watch(() => [props.routePoints, props.routeGeometry], () => { if (props.routeOnly) drawRoute() }, { deep: true })

// react to coordinates set from outside (e.g. pasting lat/lng): drop/move the
// pin and recentre. Guarded so it ignores our own click/drag emits.
watch(() => props.modelValue, (v) => {
  if (props.routeOnly || !map || !v) return
  if (model.value && v.lat === model.value.lat && v.lng === model.value.lng) return
  placeMarker(v.lng, v.lat)
  map.setCenter([v.lng, v.lat])
  map.setZoom(16)
})
</script>
