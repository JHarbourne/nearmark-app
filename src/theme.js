// Branding layer – the visual identity (name, logo mark, colours, fonts).
//
// Rebrand a deployment by editing this file (or the colour/font tokens it imports
// in lib/tokens.js) – no component code needs to change. The name strings come
// from config (env-driven); the palette and fonts are the platform's default
// theme, here in one place so they can be overridden centrally.

import { COLORS, FONTS, HUE, HUE_OPTIONS } from './lib/tokens.js'
import { config } from './config.js'

export const theme = {
  // identity (from config / env)
  appName: config.appName,
  shortName: config.shortName,
  orgName: config.orgName,

  // logo mark: a row of accent bars shown next to the wordmark in-app
  // (override the colours via VITE_BRAND_BARS, or replace the mark entirely)
  brandBars: config.brandBars,

  // palette + type (see lib/tokens.js)
  colors: COLORS,       // bgPrimary, bgCard, bgElevated, textPrimary, textMuted, gpsDot
  fonts: FONTS,         // heading, body, ui
  hue: HUE,             // named accent colours
  hueOptions: HUE_OPTIONS, // ordered list for the admin accent picker
}

// Expose the palette + fonts as CSS custom properties on :root so global styles
// and every component reading var(--…) follow the theme. Call once at startup.
// The keys map 1:1 to the CSS variable names defined in styles/base.css.
const VAR_MAP = {
  '--bg': 'bg', '--bg-deep': 'bgDeep', '--bg-glow': 'bgGlow', '--card': 'card',
  '--raised': 'raised', '--ink': 'ink', '--ink-soft': 'inkSoft', '--ink-muted': 'inkMuted',
  '--ink-faint': 'inkFaint', '--line': 'line', '--accent': 'accent', '--gps': 'gps',
  '--grad-warm': 'gradWarm', '--map-paper': 'mapPaper',
  '--overlay-glass': 'overlayGlass', '--overlay-panel': 'overlayPanel', '--overlay-nav': 'overlayNav',
  '--nav-inactive': 'navInactive', '--accent-warm': 'accentWarm', '--grabber': 'grabber',
  '--toggle-off': 'toggleOff', '--grad-brand': 'gradBrand', '--grad-icon': 'gradIcon',
  '--grad-guided': 'gradGuided', '--grad-discovery': 'gradDiscovery',
}
export function applyTheme(t = theme) {
  if (typeof document === 'undefined') return
  const r = document.documentElement.style
  for (const [cssVar, key] of Object.entries(VAR_MAP)) {
    if (t.colors[key] != null) r.setProperty(cssVar, t.colors[key])
  }
  r.setProperty('--font-heading', t.fonts.heading)
  r.setProperty('--font-body', t.fonts.body)
  r.setProperty('--font-ui', t.fonts.ui)
}
