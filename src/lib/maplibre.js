// Shared maplibre-gl entry that fixes the v6 + Vite worker-loading gap.
//
// maplibre-gl v6 runs its renderer in a separate ES-module worker, whose URL it
// builds at runtime from its own script location:
//   new URL(`./maplibre-gl-worker.mjs`, import.meta.url)   // maplibre-gl.mjs
// When Vite bundles maplibre into a hashed chunk, that URL resolves to
// /assets/maplibre-gl-worker.mjs – a file Vite never emits, because the path is
// built from variables and so escapes static analysis. In production it 404s and
// the map stays a blank grey box (no worker → no tiles). It "worked" in dev only
// because the dev server serves the file straight from node_modules.
//
// Fix: let Vite build the worker itself (?worker&url → a hashed, self-contained
// module-worker bundle) and hand maplibre that URL via setWorkerUrl. worker.format
// is 'es' in vite.config so it's a module worker, which is how maplibre loads it.
//
// Import maplibre from THIS module everywhere instead of 'maplibre-gl', so the URL
// is set once before any Map is constructed.
import * as maplibregl from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'

maplibregl.setWorkerUrl(workerUrl)

export default maplibregl
