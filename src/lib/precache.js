// Guided-tour media pre-caching, so a tour works offline / on poor signal in the
// field. The service worker (see vite.config.js → VitePWA workbox) runtime-caches
// Supabase Storage objects CacheFirst — but only AFTER each file is first
// requested, so a stop the walker hasn't opened yet has nothing cached. When a
// user opens a tour we proactively fetch every stop's images + audio through the
// SW, filling the 'supabase-media' cache ahead of the walk.
//
// Deliberately best-effort: it never throws, never blocks the UI, only touches
// Supabase Storage URLs (the ones the SW caches — anything else would spend the
// user's data on files that won't be cached), skips when offline, and honours the
// browser's Data Saver preference.

// The SW only runtime-caches Supabase Storage public objects; this marker is how
// we tell those apart from external image URLs an editor may have pasted in.
const STORAGE_MARKER = '/storage/v1/object/public/'
const isCacheable = (u) => typeof u === 'string' && u.includes(STORAGE_MARKER)

// Fields worth pre-loading per stop: both slider images, the in-body portrait, the
// thumbnail and the audio narration. Video is intentionally excluded — it's large
// and streamed, and pre-downloading it would be an unwelcome data hit.
const mediaUrlsForStop = (s) => [s.heroImageUrl, s.historicImageUrl, s.portraitUrl, s.thumbnailUrl, s.audioUrl]

// Tours already warmed this session, so re-opening a tour detail is a no-op.
const warmed = new Set()

// Fetch a few at a time so we don't saturate the connection or the main thread.
async function fetchAll(urls, concurrency = 4) {
  let i = 0
  const worker = async () => {
    while (i < urls.length) {
      const url = urls[i++]
      try {
        // no-cors: we never read the body, we only want the SW to cache it. The
        // resulting opaque response (status 0) is allowed by the workbox route's
        // cacheableResponse ({ statuses: [0, 200] }), and serves fine to <img>/audio.
        await fetch(url, { mode: 'no-cors', credentials: 'omit' })
      } catch { /* offline or blocked mid-run — best-effort, ignore */ }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, urls.length) }, worker))
}

// Warm the media cache for one tour. Fire-and-forget — callers don't await it.
export function precacheTourMedia(tour, stops) {
  if (!tour || warmed.has(tour.id)) return
  if (typeof navigator !== 'undefined') {
    // No point while offline — the SW will cache on first real view once back
    // online — and honour Data Saver rather than pulling media over metered data.
    if (navigator.onLine === false) return
    if (navigator.connection?.saveData === true) return
  }
  warmed.add(tour.id)
  const urls = [...new Set(
    [tour.coverImageUrl, ...(stops || []).flatMap(mediaUrlsForStop)].filter(isCacheable),
  )]
  if (urls.length) fetchAll(urls)
}
