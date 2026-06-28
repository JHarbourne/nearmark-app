<!--
  Click-to-place Leaflet map (BRD §11.4 core principle). The admin never types
  coordinates: clicking the map drops a draggable pin and emits {lat,lng}.
  Also used (read-only route preview) by the Tour Editor.
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
import L from 'leaflet'

const props = defineProps({
  modelValue: { type: Object, default: null },     // { lat, lng }
  hue: { type: String, default: '#6b46e5' },
  routeOnly: { type: Boolean, default: false },
  routePoints: { type: Array, default: () => [] },  // [{lat,lng,hue,num}]
  center: { type: Object, default: () => ({ lat: 51.5137, lng: -0.1341 }) },
})
const emit = defineEmits(['update:modelValue'])
const model = ref(props.modelValue)

const el = ref(null)
let map = null
let marker = null
let routeLayer = null

function dot(hue) {
  return L.divIcon({
    className: 'marker-pin',
    html: `<span style="display:block;width:22px;height:30px;filter:drop-shadow(0 3px 4px rgba(0,0,0,0.3));"><svg viewBox="0 0 30 40" width="22" height="30"><path d="M15 38.5 C15 38.5 27 22 27 13.5 A12 12 0 1 0 3 13.5 C3 22 15 38.5 15 38.5 Z" fill="${hue}" stroke="#fff" stroke-width="2.5"/></svg></span>`,
    iconSize: [22, 30], iconAnchor: [11, 30],
  })
}

function placeMarker(latlng) {
  model.value = { lat: latlng.lat, lng: latlng.lng }
  emit('update:modelValue', model.value)
  if (marker) marker.setLatLng(latlng)
  else {
    marker = L.marker(latlng, { icon: dot(props.hue), draggable: true }).addTo(map)
    marker.on('dragend', () => placeMarker(marker.getLatLng()))
  }
}

function drawRoute() {
  if (routeLayer) { routeLayer.remove(); routeLayer = null }
  const pts = props.routePoints.filter((p) => p.lat != null)
  if (!pts.length) return
  routeLayer = L.layerGroup().addTo(map)
  if (pts.length > 1) {
    L.polyline(pts.map((p) => [p.lat, p.lng]), { color: '#2E7CF6', weight: 4, opacity: 0.85 }).addTo(routeLayer)
  }
  pts.forEach((p) => L.marker([p.lat, p.lng], { icon: dot(p.hue || '#6b46e5') }).addTo(routeLayer))
  map.fitBounds(L.latLngBounds(pts.map((p) => [p.lat, p.lng])).pad(0.4), { animate: false })
}

onMounted(() => {
  const c = props.modelValue || props.center
  map = L.map(el.value, { zoomControl: true }).setView([c.lat, c.lng], 16)
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map)
  if (props.routeOnly) drawRoute()
  else {
    map.on('click', (e) => placeMarker(e.latlng))
    if (props.modelValue) placeMarker(props.modelValue)
  }
})
onUnmounted(() => { if (map) map.remove() })

watch(() => props.routePoints, () => { if (props.routeOnly && map) drawRoute() }, { deep: true })
</script>
