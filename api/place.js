// Crawlable HTML page for one location (all its published stories), for SEO.
// Human visitors get the content + an "Open in the app" deep link; search engines
// get real indexable text + JSON-LD. Served at /place/<slug> via a rewrite.
import { cfg, sb, esc, renderText, page, siteOrigin, configured, notFound } from './_seo.js'

export default async function handler(req, res) {
  try {
    if (!configured) return res.status(503).send('Not configured')
    const slug = String(req.query.slug || '')
    if (!slug) return notFound(res)

    const rows = await sb(`locations?slug=eq.${encodeURIComponent(slug)}&select=*,stories(*)&limit=1`)
    const loc = rows[0]
    if (!loc) return notFound(res)

    const stories = (loc.stories || [])
      .filter((s) => s.status !== 'draft')
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))

    const origin = siteOrigin(req)
    const canonical = `${origin}/place/${encodeURIComponent(slug)}`
    const appLink = `${origin}/?story=${encodeURIComponent(slug)}`
    const primary = stories[0]
    const title = `${loc.title}${loc.city && loc.city !== cfg.appName ? ' · ' + loc.city : ''} — ${cfg.appName}`
    const description = String(primary?.significance || primary?.summary || `${loc.title}, ${loc.city || ''}`)
      .replace(/\s+/g, ' ')
      .slice(0, 160)
    const image = primary?.hero_image_url || cfg.iconUrl || ''

    const storiesHtml =
      stories
        .map(
          (s) => `<article>
${s.hero_image_url ? `<img src="${esc(s.hero_image_url)}" alt="${esc(s.image_alt || s.heading || loc.title)}" loading="lazy">` : ''}
<h2>${esc(s.heading || loc.title)}</h2>
${s.period ? `<p class="meta">${esc(s.period)}</p>` : ''}
${s.significance ? `<p class="lede">${esc(s.significance)}</p>` : ''}
${renderText(s.summary)}
${s.wiki_url ? `<p><a href="${esc(s.wiki_url)}" target="_blank" rel="noopener">Read more →</a></p>` : ''}
</article>`,
        )
        .join('') || `<article><p>${esc(loc.title)}</p></article>`

    const jsonld = {
      '@context': 'https://schema.org',
      '@type': 'TouristAttraction',
      name: loc.title,
      description,
      url: canonical,
      ...(image ? { image } : {}),
      ...(loc.address ? { address: loc.address } : {}),
      ...(loc.lat && loc.lng
        ? { geo: { '@type': 'GeoCoordinates', latitude: loc.lat, longitude: loc.lng } }
        : {}),
      isPartOf: { '@type': 'WebSite', name: cfg.appName, url: origin },
    }

    const heroImg = primary?.hero_image_url
    const body = `<main>
${heroImg ? `<div class="hero-img" style="background-image:url('${esc(heroImg)}')"></div>` : ''}
<div class="wrap">
<p class="kicker">${esc(loc.city || cfg.appName)}</p>
<h1>${esc(loc.title)}</h1>
<a class="cta" href="${esc(appLink)}">Open in ${esc(cfg.appName)} →</a>
${storiesHtml}
<p class="foot">Part of <a href="${esc(origin)}/">${esc(cfg.appName)}</a></p>
</div>
</main>`

    res.setHeader('content-type', 'text/html; charset=utf-8')
    res.setHeader('cache-control', 'public, s-maxage=3600, stale-while-revalidate=86400')
    return res.status(200).send(page({ title, description, image, canonical, jsonld, body }))
  } catch (e) {
    res.setHeader('content-type', 'text/plain; charset=utf-8')
    return res.status(500).send('Error: ' + (e?.message || e))
  }
}
