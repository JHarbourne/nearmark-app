// Branding layer — the visual identity (name, logo mark, colours, fonts).
//
// Rebrand a deployment by editing this file (or the colour/font tokens it imports
// in lib/tokens.js) — no component code needs to change. The name strings come
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

// Expose the core palette + fonts as CSS custom properties on :root so global
// styles — and any component using var(--brand-*) / var(--font-*) — follow the
// theme. Call once at startup.
export function applyTheme(t = theme) {
  if (typeof document === 'undefined') return
  const r = document.documentElement.style
  r.setProperty('--brand-bg', t.colors.bgPrimary)
  r.setProperty('--brand-card', t.colors.bgCard)
  r.setProperty('--brand-elevated', t.colors.bgElevated)
  r.setProperty('--brand-text', t.colors.textPrimary)
  r.setProperty('--brand-muted', t.colors.textMuted)
  r.setProperty('--font-heading', t.fonts.heading)
  r.setProperty('--font-body', t.fonts.body)
  r.setProperty('--font-ui', t.fonts.ui)
}
