import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import { resolve } from 'path'
import { createRequire } from 'module'

// package.json is the single source of truth for the app version; it's baked in
// at build time via the __APP_VERSION__ define below and shown in the footer.
const pkg = createRequire(import.meta.url)('./package.json')

// Two entry points share one codebase:
//   index.html  → public mobile web app
//   admin.html  → admin backoffice (served at /admin.html or an admin.* subdomain)
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const pick = (v, d) => (v === undefined || v === '' ? d : v)
  const appName = pick(env.VITE_APP_NAME, pick(env.VITE_CITY_NAME, 'Nearmark'))
  const themeColor = pick(env.VITE_THEME_COLOR, '#17111f')
  // Optional per-deployment install icon (square PNG, ~512px, ideally maskable-
  // safe). Drives the PWA manifest + favicon + apple-touch icon. Blank = the
  // bundled neutral Nearmark placeholders, so no deployment ships another's logo.
  const iconUrl = pick(env.VITE_ICON_URL, '')
  // Share-card / meta description. The manifest AND the static <meta> tags use
  // this — link-preview scrapers (WhatsApp, iMessage, etc.) read the STATIC html
  // and never run JS, so the runtime update in main.js can't reach them; it has
  // to be baked in here.
  const description = pick(env.VITE_APP_DESCRIPTION, 'A walking guide to the history hidden in your area’s streets.')
  // Canonical public URL, used for the social-card og:url when set.
  const publicUrl = pick(env.VITE_PUBLIC_URL, '')

  return {
    // Bake the package.json version in at build time so the footer can show it
    // without a manual version string living anywhere in the source.
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
    },
    plugins: [
      vue({
        // <img-comparison-slider> is a web component, not a Vue component
        template: { compilerOptions: { isCustomElement: (tag) => tag === 'img-comparison-slider' } },
      }),
      // Per-deployment HTML branding: the page <title> follows the app name, and
      // the favicon + apple-touch links point at VITE_ICON_URL when set (else the
      // bundled neutral icons stay in place). Applies to both index.html (public)
      // and admin.html (backoffice), so no deployment ships another's branding.
      {
        name: 'nearmark-env-html',
        transformIndexHtml(html, ctx) {
          let out = html
            .split('<title>Nearmark</title>').join(`<title>${appName}</title>`)
            .split('<title>Admin · Nearmark</title>').join(`<title>Admin · ${appName}</title>`)
          if (iconUrl) {
            out = out.split('/favicon-48.png').join(iconUrl).split('/apple-touch-icon.png').join(iconUrl)
          }
          // Public app only: bake the per-deployment social-card + first-paint
          // branding into the STATIC html. Link-preview scrapers don't run JS (so
          // main.js can't reach them), and the very first paint happens before the
          // app's CSS loads — on a light theme over a slow connection that first
          // paint was the hardcoded dark theme-colour, i.e. a black flash.
          const path = ctx?.path || ctx?.filename || ''
          const isPublic = /(^|\/)index\.html$/.test(path) || path === ''
          if (isPublic) {
            const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            out = out
              .replace(/<meta name="theme-color" content="[^"]*"\s*\/>/, `<meta name="theme-color" content="${themeColor}" />`)
              .replace(/<meta name="description" content="[^"]*"\s*\/>/, `<meta name="description" content="${esc(description)}" />`)
            const tags = [
              `<meta property="og:type" content="website" />`,
              `<meta property="og:site_name" content="${esc(appName)}" />`,
              `<meta property="og:title" content="${esc(appName)}" />`,
              `<meta property="og:description" content="${esc(description)}" />`,
              publicUrl ? `<meta property="og:url" content="${esc(publicUrl)}" />` : '',
              iconUrl ? `<meta property="og:image" content="${esc(iconUrl)}" />` : '',
              `<meta name="twitter:card" content="summary" />`,
              `<meta name="twitter:title" content="${esc(appName)}" />`,
              `<meta name="twitter:description" content="${esc(description)}" />`,
              iconUrl ? `<meta name="twitter:image" content="${esc(iconUrl)}" />` : '',
              // match the first pre-JS paint to the theme so the boot isn't a dark flash
              `<style>html,body{background:${themeColor};}</style>`,
            ].filter(Boolean).join('\n  ')
            out = out.replace('</head>', `  ${tags}\n</head>`)
          }
          return out
        },
      },
      // Emit /version.json (the package.json version). The running app fetches it
      // fresh (it's not in the SW precache globs) to detect when a newer release
      // has been deployed, and prompt the user to refresh.
      {
        name: 'nearmark-version-json',
        generateBundle() {
          this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ version: pkg.version }) })
        },
      },
      // PWA service worker + web manifest. The manifest is generated from env so
      // the codebase carries no organisation-specific branding; a deployment sets
      // its identity in .env. The SW makes the app installable and work offline.
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        includeAssets: ['favicon-48.png', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png'],
        manifest: {
          name: appName,
          short_name: pick(env.VITE_APP_SHORT_NAME, appName),
          description,
          start_url: '/',
          scope: '/',
          display: 'standalone',
          orientation: 'portrait',
          background_color: '#ffffff',
          theme_color: themeColor,
          icons: iconUrl
            // client logo: purpose 'any' (not maskable) so Android shows it whole
            // rather than cropping a circle out of it
            ? [
                { src: iconUrl, sizes: '192x192', type: 'image/png', purpose: 'any' },
                { src: iconUrl, sizes: '512x512', type: 'image/png', purpose: 'any' },
              ]
            : [
                { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
                { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
              ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2}'],
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/admin/], // admin is online-only, not the public shell
          runtimeCaching: [
            {
              // Offline vector basemap: the per-deployment .pmtiles file. MapLibre
              // reads it via HTTP range requests, so lib/precache.js pre-fetches the
              // WHOLE file (a plain GET) and rangeRequests slices byte-ranges out of
              // that cached full response — the map then works with no network. Must
              // come before the generic Supabase-storage rule so it wins the match.
              urlPattern: /\.pmtiles(\?|$)/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'map-basemap',
                rangeRequests: true,
                expiration: { maxEntries: 2, maxAgeSeconds: 60 * 60 * 24 * 30 },
                cacheableResponse: { statuses: [200] }, // must be a readable 200 to slice
              },
            },
            {
              // Protomaps basemap font glyphs + sprite — cached on first use, so map
              // labels render offline once the map has been viewed online.
              urlPattern: /^https:\/\/protomaps\.github\.io\/basemaps-assets\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'map-fonts',
                expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 365 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              // OpenStreetMap tiles — cache tiles the user has already panned over
              urlPattern: /^https:\/\/tile\.openstreetmap\.org\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'osm-tiles',
                expiration: { maxEntries: 600, maxAgeSeconds: 60 * 60 * 24 * 30 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              // Supabase content (locations/tours) — fresh when online, cached offline
              urlPattern: /\/rest\/v1\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'supabase-data',
                networkTimeoutSeconds: 5,
                expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              // Supabase Storage media (photos/audio) — cache after first view
              urlPattern: /\/storage\/v1\/object\/public\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'supabase-media',
                expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 30 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'StaleWhileRevalidate',
              options: { cacheName: 'google-fonts-stylesheets' },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-webfonts',
                expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
        devOptions: { enabled: false }, // don't run the SW in dev (keeps HMR clean)
      }),
    ],
    build: {
      rollupOptions: {
        input: {
          app: resolve(__dirname, 'index.html'),
          admin: resolve(__dirname, 'admin.html'),
        },
      },
    },
    server: {
      host: true,
      port: 5173,
    },
  }
})
