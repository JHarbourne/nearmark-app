// A media credit line shown on a card. If the contributor has already given it
// their own label (e.g. "Artist: …", "Illustration: …", "Map: …"), show it
// verbatim; otherwise default to a "Photo:" prefix. This avoids a doubled
// "Photo: Artist: …" when the work isn't a photograph.
export function creditText(credit) {
  const c = (credit || '').trim()
  if (!c) return ''
  return /^\s*[a-z]+\s*:/i.test(c) ? c : `Photo: ${c}`
}
