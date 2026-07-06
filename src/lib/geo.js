// Geographic helpers for real GPS proximity detection (BRD §10 "Map View").

const R = 6371000 // earth radius, metres

// Great-circle distance between two {lat,lng} points, in metres.
export function distanceMeters(a, b) {
  if (!a || !b) return Infinity
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

// Format a metre distance for the UI, respecting the user's unit preference.
export function formatDistance(meters, units = 'mi') {
  if (!isFinite(meters)) return '–'
  if (units === 'km') {
    if (meters < 1000) return `${Math.round(meters)}m`
    return `${(meters / 1000).toFixed(1)}km`
  }
  // miles / yards
  const yards = meters * 1.09361
  if (yards < 1000) return `${Math.round(yards)}yd`
  return `${(meters / 1609.34).toFixed(1)}mi`
}

// Total walking distance along an ordered list of stops, in metres.
export function routeLength(stops) {
  let total = 0
  for (let i = 1; i < stops.length; i++) {
    total += distanceMeters(stops[i - 1], stops[i])
  }
  return total
}
