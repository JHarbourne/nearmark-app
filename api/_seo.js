// Shared server-side helpers for the crawlable SEO pages + sitemap.
// These run as Vercel serverless functions (Node), reading each deployment's own
// Supabase (via env) so every white-label app renders its OWN content. RLS on the
// anon key returns only publicly-visible, published rows — exactly what should be
// indexed. The `_` filename prefix keeps Vercel from treating this as a route.

const SUPABASE_URL = (process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '')
const ANON = process.env.VITE_SUPABASE_ANON_KEY || ''

export const configured = Boolean(SUPABASE_URL && ANON)

// Per-deployment branding, from the same env the client build uses.
export const cfg = {
  appName: process.env.VITE_APP_NAME || process.env.VITE_CITY_NAME || 'Nearmark',
  themeColor: process.env.VITE_THEME_COLOR || '#6b46e5',
  iconUrl: process.env.VITE_ICON_URL || '',
}

// The site's own origin — prefer the request host (works on any domain the app is
// served from: tollesbury.app, lgbt.nearmark.app, staging, …), else VITE_PUBLIC_URL.
export function siteOrigin(req) {
  const host = req.headers['x-forwarded-host'] || req.headers.host
  if (host) return `https://${host}`
  return (process.env.VITE_PUBLIC_URL || '').replace(/\/$/, '')
}

export async function sb(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}` },
  })
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${(await res.text()).slice(0, 200)}`)
  return res.json()
}

export const esc = (s) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// Minimal Markdown-subset → safe HTML for the body (bold/italic + paragraphs).
// The raw text is what Google indexes; keep it simple and escaped.
export function renderText(md) {
  if (!md) return ''
  return String(md)
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map(
      (l) =>
        `<p>${esc(l)
          .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.+?)\*/g, '<em>$1</em>')}</p>`,
    )
    .join('')
}

// JSON embedded in a <script> tag — neutralise any "</script>".
const jsonScript = (o) => JSON.stringify(o).replace(/</g, '\\u003c')

export function page({ title, description, image, canonical, jsonld, body }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(canonical)}">
<meta name="theme-color" content="${esc(cfg.themeColor)}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="${esc(cfg.appName)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(canonical)}">
${image ? `<meta property="og:image" content="${esc(image)}">` : ''}
<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}">
${cfg.iconUrl ? `<link rel="icon" href="${esc(cfg.iconUrl)}">` : ''}
${jsonld ? `<script type="application/ld+json">${jsonScript(jsonld)}</script>` : ''}
<style>${css()}</style>
</head>
<body>${body}</body>
</html>`
}

function css() {
  return `
:root{--accent:${cfg.themeColor}}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:#1b1b1f;background:#fff;line-height:1.65}
a{color:var(--accent)}
.hero-img{width:100%;height:min(46vh,420px);min-height:200px;background:#eee var(--bg) center/cover no-repeat}
.wrap{max-width:680px;margin:0 auto;padding:24px 20px 64px}
.kicker{text-transform:uppercase;letter-spacing:.08em;font-size:12px;font-weight:700;color:var(--accent);margin:22px 0 4px}
h1{font-size:clamp(26px,6vw,38px);line-height:1.1;letter-spacing:-.02em;margin:0 0 8px}
.meta{color:#666;font-weight:600;font-size:14px;margin:0 0 2px}
.lede{font-size:18px;color:#333;margin:6px 0 18px}
article{margin:0 0 34px;padding:0 0 6px}
article img{width:100%;border-radius:14px;margin:8px 0 14px;display:block}
article h2{font-size:22px;line-height:1.2;margin:26px 0 4px}
p{margin:0 0 14px}
.cta{display:inline-block;background:var(--accent);color:#fff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:12px;margin:6px 0 26px}
.cta:hover{filter:brightness(.94)}
ul.stops{list-style:none;padding:0;margin:18px 0}
ul.stops li{padding:12px 0;border-bottom:1px solid #eee}
ul.stops a{font-weight:600;text-decoration:none}
ul.stops .n{display:inline-block;min-width:26px;color:#999;font-variant-numeric:tabular-nums}
.foot{margin-top:40px;padding-top:18px;border-top:1px solid #eee;color:#888;font-size:14px}
.foot a{text-decoration:none;font-weight:600}
`
}

export function notFound(res) {
  res.setHeader('content-type', 'text/html; charset=utf-8')
  return res.status(404).send('<!doctype html><meta charset="utf-8"><title>Not found</title><h1>Not found</h1>')
}
