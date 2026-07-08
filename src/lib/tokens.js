// Design tokens – the visual contract. COLORS/FONTS feed the CSS variables (via
// theme.js → applyTheme) that every component reads, so a deployment can be light
// or dark without touching components. The active palette is the theme named by
// VITE_THEME (see themes/index.js); HUE below is the theme-independent accent set.

import { THEMES, DEFAULT_THEME } from '../themes/index.js'
import { config } from '../config.js'

export const HUE = {
  red: '#FF4D5E',
  orange: '#FF8C42',
  amber: '#FFD60A', // pure bright yellow – dark ink now sits on it, so no need to mute it (black-on-yellow ≈ 12.6:1)
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

// Numbered location badges (route lists, detail sheet, map pins, admin chips).
// Product rule: numerals are WHITE everywhere, with DARK ink kept only on the
// yellow/amber box (white on yellow is unreadable – ~1.4:1). White only clears
// WCAG AA (4.5:1) on a dark-enough field, so every non-yellow hue is deepened
// toward black just until white passes: the box keeps its colour identity but
// the number reads cleanly. Returns { bg, ink } for background + text colour.
const _hueAngle = (hex) => {
  let h = String(hex).replace('#', '')
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min
  if (d === 0) return 0
  let H = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  H *= 60
  return H < 0 ? H + 360 : H
}
const _isYellow = (hex) => { const H = _hueAngle(hex); return H >= 40 && H <= 75 && _lum(hex) > 0.45 }
const _deepenForWhite = (hex) => {
  let h = String(hex).replace('#', '')
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  const rgb = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16))
  for (let t = 0; t <= 1.0001; t += 0.04) {
    const c = '#' + rgb.map((v) => Math.round(v * (1 - t)).toString(16).padStart(2, '0')).join('')
    if (_ratio(_lum(c), 1) >= 4.6) return c // 4.6 leaves a little headroom over the 4.5 AA floor
  }
  return '#111111'
}
export function badgeColors(hue) {
  try {
    const h = hue || '#8a7d97'
    if (_isYellow(h)) return { bg: h, ink: ON_ACCENT_INK }
    return { bg: _deepenForWhite(h), ink: '#ffffff' }
  } catch { return { bg: '#8a7d97', ink: '#ffffff' } }
}

// Active palette + fonts → CSS variables (see styles/base.css :root for the var
// names). These are the selected theme's, re-exported so theme.js and every
// importer keep working unchanged; switch the whole palette with VITE_THEME.
const active = THEMES[config.themeName] || THEMES[DEFAULT_THEME]
export const COLORS = active.colors
export const FONTS = active.fonts
