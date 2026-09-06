// Minimal, safe Markdown subset for body text: **bold**, *italic*, "- " / "* "
// bullet lists, paragraphs, single line breaks, and auto-linked bare http(s)
// URLs. Deliberately tiny — no headings, images or raw HTML, and links are only
// ever built from an escaped http/https URL — so there are no styles to abuse and
// nothing to sanitise: every line is HTML-escaped first, and we only ever emit
// <p>, <ul>, <li>, <strong>, <em>, <br>, <a>. House-style typography (typo) is
// applied inline.
import { typo } from './typography.js'

function inline(s) {
  return typo(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/&lt;br\s*\/?&gt;/gi, '<br>')            // allow a literal <br> for a manual line break
    // auto-link bare http(s) URLs. The text is already HTML-escaped; we only ever
    // match http/https (no javascript:/data:), disallow quotes/angle brackets in
    // the URL (no attribute breakout), and leave trailing sentence punctuation
    // outside the link — so there is still nothing to sanitise.
    .replace(/\bhttps?:\/\/[^\s<"]+/g, (u) => {
      const tail = (u.match(/[.,!?)\]}]+$/) || [''])[0]
      const url = tail ? u.slice(0, -tail.length) : u
      return `<a href="${url}" target="_blank" rel="noopener nofollow">${url}</a>${tail}`
    })
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') // bold first
    .replace(/\*(.+?)\*/g, '<em>$1</em>')             // then italic
}

// Render Markdown-subset text to safe HTML for v-html. Each non-blank line is its
// own paragraph (matching the plain-text paragraph spacing); consecutive "- "/"* "
// lines become a single bullet list. A line ending in a backslash or two+ spaces
// is a SOFT break — the next line joins the same paragraph with a <br>, so verse
// and quoted text can keep single line breaks without a paragraph gap.
export function renderBody(md) {
  if (!md) return ''
  const out = []
  let items = null
  let para = null // segments of the current paragraph, joined by <br>
  const flushList = () => { if (items) { out.push(`<ul>${items.join('')}</ul>`); items = null } }
  const flushPara = () => { if (para) { out.push(`<p>${para.join('<br>')}</p>`); para = null } }
  for (const raw of String(md).split(/\r?\n/)) {
    const soft = /(?:\\|\s{2,})$/.test(raw)   // trailing "\" or two+ spaces = soft break
    const line = raw.replace(/\\+$/, '').trim()
    if (!line) { flushList(); flushPara(); continue }
    const bullet = /^[-*]\s+(.*)$/.exec(line)
    if (bullet) { flushPara(); (items ||= []).push(`<li>${inline(bullet[1])}</li>`); continue }
    flushList()
    ;(para ||= []).push(inline(line))
    if (!soft) flushPara() // no soft marker → the line ends its paragraph (as before)
  }
  flushList()
  flushPara()
  return out.join('')
}
