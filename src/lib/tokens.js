// Design tokens – the visual contract. COLORS/FONTS feed the CSS variables (via
// theme.js → applyTheme) that every component reads, so a deployment can be light
// or dark without touching components. The active palette is the theme named by
// VITE_THEME (see themes/index.js); HUE below is the theme-independent accent set.

import { THEMES, DEFAULT_THEME } from '../themes/index.js'
import { config } from '../config.js'

export const HUE = {
  red: '#FF4D5E',
  orange: '#FF8C42',
  amber: '#FFC53D',
  green: '#2FBF71',
  blue: '#3D9BFF',
  violet: '#9B6DFF',
  magenta: '#FF5CA8',
}

// Ordered list of accent options offered in the admin colour picker (BRD §11.4)
export const HUE_OPTIONS = [
  { name: 'violet', value: HUE.violet },
  { name: 'red', value: HUE.red },
  { name: 'orange', value: HUE.orange },
  { name: 'amber', value: HUE.amber },
  { name: 'green', value: HUE.green },
  { name: 'blue', value: HUE.blue },
  { name: 'magenta', value: HUE.magenta },
]

// Dark text used on light/bright accents (clears AA on all seven HUEs).
export const ON_ACCENT_INK = '#1c1526'

// Pick the WCAG-best text colour for a number/label sitting ON a given colour:
// dark ink on light/bright hues (where dark far out-scores white – e.g. amber
// 11:1, green 7:1, blue 6:1), white on genuinely dark hues (navy, custom darks)
// where dark would fail. Works for any hue, so custom colours stay readable too.
const _lin = (v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
const _lum = (hex) => {
  let h = String(hex).replace('#', '')
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  const [r, g, b] = [0, 2, 4].map((i) => _lin(parseInt(h.slice(i, i + 2), 16) / 255))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const _ratio = (a, b) => { const hi = Math.max(a, b), lo = Math.min(a, b); return (hi + 0.05) / (lo + 0.05) }
export function readableInk(hex) {
  try {
    const L = _lum(hex)
    return _ratio(L, 1) > _ratio(L, _lum(ON_ACCENT_INK)) ? '#ffffff' : ON_ACCENT_INK
  } catch { return ON_ACCENT_INK }
}

// Active palette + fonts → CSS variables (see styles/base.css :root for the var
// names). These are the selected theme's, re-exported so theme.js and every
// importer keep working unchanged; switch the whole palette with VITE_THEME.
const active = THEMES[config.themeName] || THEMES[DEFAULT_THEME]
export const COLORS = active.colors
export const FONTS = active.fonts
