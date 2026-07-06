// Minimal, safe Markdown subset for story body text: **bold**, *italic*, and
// "- " / "* " bullet lists, plus paragraphs. Deliberately tiny — no headings,
// links, images or raw HTML — so there are no styles to abuse and nothing to
// sanitise: every line is HTML-escaped first, and we only ever emit <p>, <ul>,
// <li>, <strong>, <em>. House-style typography (typo) is applied inline.
import { typo } from './typography.js'

function inline(s) {
  return typo(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') // bold first
    .replace(/\*(.+?)\*/g, '<em>$1</em>')             // then italic
}

// Render Markdown-subset text to safe HTML for v-html. Each non-blank line is its
// own paragraph (matching the plain-text paragraph spacing); consecutive "- "/"* "
// lines become a single bullet list.
export function renderBody(md) {
  if (!md) return ''
  const out = []
  let items = null
  const flush = () => { if (items) { out.push(`<ul>${items.join('')}</ul>`); items = null } }
  for (const raw of String(md).split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) { flush(); continue }
    const bullet = /^[-*]\s+(.*)$/.exec(line)
    if (bullet) { (items ||= []).push(`<li>${inline(bullet[1])}</li>`); continue }
    flush()
    out.push(`<p>${inline(line)}</p>`)
  }
  flush()
  return out.join('')
}
