// Design tokens — copied verbatim from the Claude Design prototype (BRD §6.3).
// DO NOT CHANGE these values. The handoff instruction (BRD §6.4) requires the
// production build to preserve every hex value, font choice and radius.

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

export const COLORS = {
  bgPrimary: '#17111f',
  bgCard: '#1c1526',
  bgElevated: '#241a2e',
  textPrimary: '#F6EFE6',
  textMuted: '#A99BB8',
  gpsDot: '#2E7CF6',
}

export const FONTS = {
  heading: "'Bricolage Grotesque', sans-serif",
  body: "'Newsreader', serif",
  ui: "'Hanken Grotesk', sans-serif",
}
