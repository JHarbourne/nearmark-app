// Single source of truth for deployment-specific configuration.
//
// Every value is overridable via a VITE_* environment variable (set in .env),
// and every default here is generic to the Nearmark platform – the open-source
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
// Active city + the list a location/tour can belong to. A single-city deployment
// just sets VITE_CITY_NAME; VITE_CITIES (comma-separated) is only needed for a
// multi-city site. Both feed the admin city selects and the public city source.
const cityNameVal = pick(env.VITE_CITY_NAME, '')
const cityList = pick(env.VITE_CITIES, '').split(',').map((s) => s.trim()).filter(Boolean)

// PostHog project analytics. The project key is PUBLIC + write-only (safe to ship
// in the bundle), so the Nearmark-hosted apps fall back to a baked-in default
// rather than a per-deployment env var — but ONLY on our own production domains.
// A fork on any other host sends nothing unless it sets its own VITE_POSTHOG_KEY.
// VITE_POSTHOG_KEY always overrides this default.
const NEARMARK_POSTHOG_KEY = 'phc_mLQNDrwid32CesrU5pD59XEDF5RHzpNNHJzmyK3wWY5E'
const NEARMARK_ANALYTICS_URL = 'https://eu.posthog.com/project/209983'
const analyticsHostname = typeof window !== 'undefined' ? window.location.hostname : ''
const onNearmarkHost = /(^|\.)(nearmark\.app|tollesbury\.app|lgbthistoryuk\.org)$/.test(analyticsHostname)
const posthogKey = pick(env.VITE_POSTHOG_KEY, onNearmarkHost ? NEARMARK_POSTHOG_KEY : '')
const posthogHost = pick(env.VITE_POSTHOG_HOST, 'https://eu.i.posthog.com')

export const config = {
  // ── identity ──
  appName: pick(env.VITE_APP_NAME, 'Nearmark'),            // product name (page title)
  shortName: pick(env.VITE_APP_SHORT_NAME, 'Nearmark'),    // home-screen / manifest short name
  orgName: pick(env.VITE_ORG_NAME, 'Nearmark'),            // wordmark shown in-app
  brandBars: pick(env.VITE_BRAND_BARS, DEFAULT_BRAND_BARS).split(',').map((s) => s.trim()).filter(Boolean), // logo mark colours
  logoUrl: pick(env.VITE_LOGO_URL, ''),                    // optional in-app logo image; blank = wordmark + the bar mark
  description: pick(env.VITE_APP_DESCRIPTION, 'A walking guide to the history hidden in your city’s streets.'),
  themeName: pick(env.VITE_THEME, 'default'),               // named palette in src/themes (e.g. 'tollesbury')
  publicUrl: pick(env.VITE_PUBLIC_URL, ''),                 // canonical URL for the "Share" feature; blank → window.location.origin

  // ── copy ({city} is substituted with the active city; \n becomes a line break) ──
  coverHeadline: nl(env.VITE_COVER_HEADLINE, 'Hidden {city}'),
  coverIntro: nl(env.VITE_COVER_INTRO, 'Centuries of hidden history, in the streets of {city}.'),
  splashTitle: nl(env.VITE_SPLASH_TITLE, 'History, where it actually happened'),
  splashBody: nl(env.VITE_SPLASH_BODY, 'We use your location only to surface history near you. Nothing is stored or shared – it never leaves your device.'),
  discoveryPrompt: nl(env.VITE_DISCOVERY_PROMPT, 'Discovery Mode alerts you when you’re near a site. Enable location to unlock stories as you walk – it never leaves your device.'),
  discoveryScanLabel: pick(env.VITE_DISCOVERY_SCAN_LABEL, 'Scan for nearby stories'), // Discovery "scan" button (e.g. "…nearby history" / "…places of interest")
  completionMessage: nl(env.VITE_COMPLETION_MESSAGE, 'You’ve walked the route. The stories don’t end here – keep exploring in Discovery Mode any time.'),
  storyLinkLabel: pick(env.VITE_STORY_LINK_LABEL, 'Read the full article'), // label for a location's external link (e.g. "Visit the artist’s website")
  consentNoticeVersion: pick(env.VITE_CONSENT_NOTICE_VERSION, '1.0'), // privacy-notice version recorded when an admin logs a resident's consent

  // ── content source / attribution ──
  contentSourceLabel: pick(env.VITE_CONTENT_SOURCE_LABEL, ''), // e.g. 'example.org' – blank hides the credit line
  contentSourceUrl: pick(env.VITE_CONTENT_SOURCE_URL, ''),     // optional link on the content-source label
  feedbackUrl: pick(env.VITE_FEEDBACK_URL, 'https://nearmark.co.uk/feedback'), // admin "Suggest an improvement" link; override or set '' to hide
  platformName: pick(env.VITE_PLATFORM_NAME, 'Nearmark'),       // "Powered by …" attribution
  // link for the "Powered by …" name. Defaults to nearmark.app for the default brand;
  // a white-label deploy (custom VITE_PLATFORM_NAME) stays plain text unless it sets a URL.
  platformUrl: pick(env.VITE_PLATFORM_URL, env.VITE_PLATFORM_NAME ? '' : 'https://nearmark.app'),
  contentSourceNote: pick(env.VITE_CONTENT_SOURCE_NOTE, ''),   // Settings sourcing paragraph – blank hides it
  wikiBaseUrl: pick(env.VITE_WIKI_BASE_URL, ''),               // base for article links + admin URL validation
  repoUrl: pick(env.VITE_REPO_URL, ''),                        // admin "source code" link – blank hides it
  // "What's new" / release-notes link shown in the admin. Defaults to the core
  // repo's GitHub Releases (every deployment runs this codebase); a fork can set
  // VITE_RELEASES_URL, or VITE_REPO_URL (its releases are then repo/releases).
  releasesUrl: pick(env.VITE_RELEASES_URL, pick(env.VITE_REPO_URL, 'https://github.com/JHarbourne/nearmark-app').replace(/\/$/, '') + '/releases'),

  // ── integrations ──
  supabaseUrl: pick(env.VITE_SUPABASE_URL, ''),
  supabaseAnonKey: pick(env.VITE_SUPABASE_ANON_KEY, ''),
  posthogKey,
  posthogHost,
  // "View analytics" link on the admin Dashboard/Analytics screen → the PostHog
  // dashboard. Prefer an explicit project URL (VITE_ANALYTICS_URL); on our own
  // hosts fall back to the Nearmark project; otherwise derive the PostHog app host.
  analyticsUrl: pick(
    env.VITE_ANALYTICS_URL,
    posthogKey ? (onNearmarkHost ? NEARMARK_ANALYTICS_URL : posthogHost.replace('i.posthog.com', 'posthog.com')) : '',
  ),
  // Optional: a PostHog shared-dashboard EMBED url (Dashboard → Share → Embed) to
  // show analytics inside the admin Analytics screen. Blank → the screen just
  // links out to PostHog instead.
  analyticsEmbedUrl: pick(env.VITE_ANALYTICS_EMBED_URL, ''),

  // ── active city (single-city deployments; multi-city still uses the bundled
  //    SEED_CITIES + city picker). Blank cityName → fall back to the seed. ──
  cityName: cityNameVal,                    // active city label (e.g. 'Tollesbury')
  cityArea: pick(env.VITE_CITY_AREA, ''),   // sub-label (e.g. 'Essex')
  cities: cityList.length ? cityList : (cityNameVal ? [cityNameVal] : ['London']), // admin city options + picker source

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
