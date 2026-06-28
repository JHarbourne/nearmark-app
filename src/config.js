// Single source of truth for deployment-specific configuration.
//
// Every value is overridable via a VITE_* environment variable (set in .env),
// and every default here is generic to the Nearmark platform — the open-source
// codebase contains no organisation-specific values. A deployment supplies its
// own identity, copy, content source and integrations through .env.
//
// Copy strings may contain a "{city}" placeholder, replaced at render time with
// the active city name.

const env = import.meta.env
const pick = (val, fallback) => (val === undefined || val === '' ? fallback : val)
// neutral mono-violet placeholder mark; a deployment overrides via VITE_BRAND_BARS
const DEFAULT_BRAND_BARS = '#B79BFF,#A98AFF,#9B6DFF,#8A5CF0,#7A4BE0,#6B3FD6'
// "\n" in an env value is a literal backslash-n; turn it into a real newline so
// copy can carry intentional line breaks (rendered with white-space: pre-line).
const nl = (val, fallback) => String(pick(val, fallback)).replaceAll('\\n', '\n')

export const config = {
  // ── identity ──
  appName: pick(env.VITE_APP_NAME, 'Nearmark'),            // product name (page title)
  shortName: pick(env.VITE_APP_SHORT_NAME, 'Nearmark'),    // home-screen / manifest short name
  orgName: pick(env.VITE_ORG_NAME, 'Nearmark'),            // wordmark shown in-app
  brandBars: pick(env.VITE_BRAND_BARS, DEFAULT_BRAND_BARS).split(',').map((s) => s.trim()).filter(Boolean), // logo mark colours
  description: pick(env.VITE_APP_DESCRIPTION, 'A walking guide to the history hidden in your city’s streets.'),

  // ── copy ({city} is substituted with the active city; \n becomes a line break) ──
  coverHeadline: nl(env.VITE_COVER_HEADLINE, 'Hidden {city}'),
  coverIntro: nl(env.VITE_COVER_INTRO, 'Centuries of hidden history, in the streets of {city}.'),
  splashTitle: nl(env.VITE_SPLASH_TITLE, 'History, where it actually happened'),
  splashBody: nl(env.VITE_SPLASH_BODY, 'We use your location only to surface history near you. Nothing is stored or shared — it never leaves your device.'),
  discoveryPrompt: nl(env.VITE_DISCOVERY_PROMPT, 'Discovery Mode alerts you when you’re near a site. Enable location to unlock stories as you walk — it never leaves your device.'),
  completionMessage: nl(env.VITE_COMPLETION_MESSAGE, 'You’ve walked the route. The stories don’t end here — keep exploring in Discovery Mode any time.'),

  // ── content source / attribution ──
  contentSourceLabel: pick(env.VITE_CONTENT_SOURCE_LABEL, ''), // e.g. 'example.org' — blank hides the credit line
  platformName: pick(env.VITE_PLATFORM_NAME, 'Nearmark'),       // "Powered by …" attribution
  platformUrl: pick(env.VITE_PLATFORM_URL, ''),                 // link for the platform name (blank = plain text)
  contentSourceNote: pick(env.VITE_CONTENT_SOURCE_NOTE, ''),   // Settings sourcing paragraph — blank hides it
  wikiBaseUrl: pick(env.VITE_WIKI_BASE_URL, ''),               // base for article links + admin URL validation
  repoUrl: pick(env.VITE_REPO_URL, ''),                        // admin "source code" link — blank hides it

  // ── integrations ──
  supabaseUrl: pick(env.VITE_SUPABASE_URL, ''),
  supabaseAnonKey: pick(env.VITE_SUPABASE_ANON_KEY, ''),
  posthogKey: pick(env.VITE_POSTHOG_KEY, ''),
  posthogHost: pick(env.VITE_POSTHOG_HOST, 'https://eu.i.posthog.com'),

  // ── map defaults ──
  mapCenter: {
    lat: Number(pick(env.VITE_MAP_CENTER_LAT, 51.5072)),
    lng: Number(pick(env.VITE_MAP_CENTER_LNG, -0.1276)),
  },
  mapZoom: Number(pick(env.VITE_MAP_ZOOM, 15)),
}

// Domain of the configured content wiki, used to validate article URLs in the
// admin. Empty when no wiki base is set (validation is then skipped).
export const wikiDomain = (() => {
  try { return config.wikiBaseUrl ? new URL(config.wikiBaseUrl).hostname : '' } catch { return '' }
})()

// Replace the {city} placeholder in a copy string.
export const withCity = (str, city) => (str || '').replaceAll('{city}', city || '')
