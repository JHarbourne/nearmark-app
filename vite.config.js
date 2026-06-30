import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import { resolve } from 'path'

// Two entry points share one codebase:
//   index.html  → public mobile web app
//   admin.html  → admin backoffice (served at /admin.html or an admin.* subdomain)
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const pick = (v, d) => (v === undefined || v === '' ? d : v)
  const appName = pick(env.VITE_APP_NAME, 'Nearmark')
  const themeColor = pick(env.VITE_THEME_COLOR, '#17111f')
  // Optional per-deployment install icon (square PNG, ~512px, ideally maskable-
  // safe). Drives the PWA manifest + favicon + apple-touch icon. Blank = the
  // bundled neutral Nearmark placeholders, so no deployment ships another's logo.
  const iconUrl = pick(env.VITE_ICON_URL, '')

  return {
    plugins: [
      vue({
        // <img-comparison-slider> is a web component, not a Vue component
        template: { compilerOptions: { isCustomElement: (tag) => tag === 'img-comparison-slider' } },
      }),
      // Per-deployment install icon: point the favicon + apple-touch links at
      // VITE_ICON_URL when set, else leave the bundled neutral icons in place.
      {
        name: 'nearmark-env-icons',
        transformIndexHtml(html) {
          return iconUrl
            ? html.split('/favicon-48.png').join(iconUrl).split('/apple-touch-icon.png').join(iconUrl)
            : html
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
          description: pick(env.VITE_APP_DESCRIPTION, 'A walking guide to the history hidden in your city’s streets.'),
          start_url: '/',
          scope: '/',
          display: 'standalone',
          orientation: 'portrait',
          background_color: '#ffffff',
          theme_color: themeColor,
          icons: iconUrl
            ? [
                { src: iconUrl, sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
                { src: iconUrl, sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
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
                expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
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
