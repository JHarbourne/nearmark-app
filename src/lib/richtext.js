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
    // auto-link bare http(s) URLs, bare "www." web addresses, and email addresses.
    // The text is already HTML-escaped; we only ever build an href of http/https (web)
    // or mailto (email) — never javascript:/data: — disallow quotes/angle brackets/
    // spaces in it (no attribute breakout), and leave trailing sentence punctuation
    // outside the link, so there is still nothing to sanitise.
    .replace(/\bhttps?:\/\/[^\s<"]+|\bwww\.[^\s<"]+|\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, (m) => {
      const kind = /^https?:\/\//.test(m) ? 'http' : /^www\./i.test(m) ? 'www' : 'email'
      const tail = kind === 'email' ? '' : (m.match(/[.,!?)\]}]+$/) || [''])[0]
      const token = tail ? m.slice(0, -tail.length) : m
      const href = kind === 'http' ? token : kind === 'www' ? `https://${token}` : `mailto:${token}`
      const attrs = kind === 'email' ? 'rel="noopener"' : 'target="_blank" rel="noopener nofollow"'
      return `<a href="${href}" ${attrs}>${token}</a>${tail}`
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
