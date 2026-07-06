// House style for displayed text: proper (curly) apostrophes and quotes, and
// spaced en-dashes — so content reads consistently whatever an editor typed
// (straight quotes, hyphens-as-dashes, em-dashes). Display-only; never mutates
// what's stored. Deliberately conservative: compound hyphens (self-guided) and
// number ranges (1890-1900) are left alone; only spaced/loose dashes convert.
export function typo(input) {
  if (input == null) return input
  return String(input)
    // em-dash, or a spaced single/double hyphen used as a dash → spaced en-dash
    .replace(/\s*—\s*/g, ' – ')
    .replace(/\s+--?\s+/g, ' – ')
    // decade/year apostrophes first (the ’90s) so they don't become opening quotes
    .replace(/'(?=\d)/g, '’')
    // curly double quotes: opening after start/space/bracket, closing otherwise
    .replace(/(^|[\s([{<])"/g, '$1“')
    .replace(/"/g, '”')
    // curly single quotes / apostrophes
    .replace(/(^|[\s([{<])'/g, '$1‘')
    .replace(/'/g, '’')
}
