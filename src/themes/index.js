// Theme registry — the set of named palettes a deployment can choose from.
// Pick one per deployment with VITE_THEME (e.g. VITE_THEME=tollesbury); the
// default dark palette is used when unset. Add a client by dropping a new
// theme module here (copy default.js) and registering it below.

import defaultTheme from './default.js'
import tollesbury from './tollesbury.js'

export const THEMES = {
  default: defaultTheme,
  tollesbury,
}

export const DEFAULT_THEME = 'default'
