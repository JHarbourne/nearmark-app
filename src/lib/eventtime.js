// Human date/time for an announcement's window. Collapses a same-day range so it
// reads "Sat 21 November, 10:00 – 17:00" rather than repeating the date at both ends.
const DATE = { weekday: 'short', day: 'numeric', month: 'long' }
const TIME = { hour: '2-digit', minute: '2-digit' }

export function eventWhen(startIso, endIso) {
  if (!startIso) return ''
  const start = new Date(startIso)
  const date = start.toLocaleDateString(undefined, DATE)
  const startTime = start.toLocaleTimeString(undefined, TIME)
  if (!endIso || endIso === startIso) return `${date}, ${startTime}`
  const end = new Date(endIso)
  const endTime = end.toLocaleTimeString(undefined, TIME)
  if (start.toDateString() === end.toDateString()) return `${date}, ${startTime} – ${endTime}`
  return `${date}, ${startTime} – ${end.toLocaleDateString(undefined, DATE)}, ${endTime}`
}

// Compact form for tight spaces (the "What's on" strip): date + start time only.
export function eventWhenShort(startIso) {
  if (!startIso) return ''
  const d = new Date(startIso)
  return `${d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}, ${d.toLocaleTimeString(undefined, TIME)}`
}

// A dateless notice/advert (no start) that still has an expiry — shown in the admin
// so you can see when it will drop off. Not shown publicly (the expiry just hides it).
export function expiresLabel(endIso) {
  if (!endIso) return ''
  return `Until ${new Date(endIso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`
}
