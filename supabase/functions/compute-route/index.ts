// Supabase Edge Function: compute a road/path-following walking route.
//
// Takes the ordered stop coordinates of a tour and asks OpenRouteService for the
// real foot-walking geometry, returning it as [lat, lng] points (Leaflet order)
// for the admin to store on the tour. The ORS key lives here as a secret, never
// in the browser bundle.
//
//   supabase secrets set ORS_KEY=<your-openrouteservice-key> --project-ref <ref>
//   supabase functions deploy compute-route --project-ref <ref>
//
// The gateway verifies the caller's Supabase JWT by default, so only a signed-in
// admin can invoke it.

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)

  try {
    const { coordinates } = await req.json()
    // coordinates: ordered [[lng, lat], ...] (ORS order), one per stop
    if (!Array.isArray(coordinates) || coordinates.length < 2) {
      return json({ error: 'Need at least two stops with coordinates.' }, 400)
    }

    const key = Deno.env.get('ORS_KEY')
    if (!key) return json({ error: 'ORS_KEY secret is not set on this project.' }, 500)

    const ors = await fetch('https://api.openrouteservice.org/v2/directions/foot-walking/geojson', {
      method: 'POST',
      headers: { Authorization: key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ coordinates }),
    })

    if (!ors.ok) {
      const detail = await ors.text()
      return json({ error: `OpenRouteService ${ors.status}: ${detail.slice(0, 300)}` }, 502)
    }

    const data = await ors.json()
    const line = data?.features?.[0]?.geometry?.coordinates
    if (!Array.isArray(line) || !line.length) return json({ error: 'No route returned.' }, 502)

    // ORS returns [lng, lat]; the app draws in Leaflet [lat, lng] order.
    const geometry = line.map(([lng, lat]: [number, number]) => [lat, lng])
    return json({ geometry })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
