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

// Text colour for a number/label sitting ON a HUE badge (map pins, tour-stop
// numbers). White fails WCAG on most accents (amber ~1.6:1); this dark ink clears
// AA (≥5:1) on every HUE and on the grey "visited" state, in light or dark themes.
export const ON_ACCENT_INK = '#1c1526'

// Active palette + fonts → CSS variables (see styles/base.css :root for the var
// names). These are the selected theme's, re-exported so theme.js and every
// importer keep working unchanged; switch the whole palette with VITE_THEME.
const active = THEMES[config.themeName] || THEMES[DEFAULT_THEME]
export const COLORS = active.colors
export const FONTS = active.fonts
