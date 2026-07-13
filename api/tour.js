// Crawlable HTML page for one tour: description + ordered list of stops (each
// linking to its /place/<slug> page), plus JSON-LD. Served at /tour/<slug>.
import { cfg, sb, esc, renderText, page, siteOrigin, configured, notFound } from './_seo.js'

export default async function handler(req, res) {
  try {
    if (!configured) return res.status(503).send('Not configured')
    const slug = String(req.query.slug || '')
    if (!slug) return notFound(res)

    const tours = await sb(`tours?slug=eq.${encodeURIComponent(slug)}&select=*&limit=1`)
    const tour = tours[0]
    if (!tour) return notFound(res)

    const stopSlugs = Array.isArray(tour.stop_ids) ? tour.stop_ids : []
    // Fetch the stops (RLS hides any that aren't publicly visible), keep tour order.
    let stops = []
    if (stopSlugs.length) {
      const list = stopSlugs.map((s) => encodeURIComponent(s)).join(',')
      const rows = await sb(`locations?slug=in.(${list})&select=slug,title,city,stories(period,status,sort_order)`)
      const bySlug = Object.fromEntries(rows.map((r) => [r.slug, r]))
      stops = stopSlugs.map((s) => bySlug[s]).filter(Boolean)
    }

    const origin = siteOrigin(req)
    const canonical = `${origin}/tour/${encodeURIComponent(slug)}`
    const appLink = `${origin}/?tour=${encodeURIComponent(slug)}`
    const title = `${tour.title}${tour.city && tour.city !== cfg.appName ? ' · ' + tour.city : ''} — ${cfg.appName}`
    const description = String(tour.description || `${tour.title}, a walking tour`)
      .replace(/\s+/g, ' ')
      .slice(0, 160)
    const image = tour.cover_image_url || cfg.iconUrl || ''

    const period = (loc) =>
      (loc.stories || []).filter((s) => s.status !== 'draft').sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))[0]
        ?.period || ''

    const stopsHtml = stops
      .map(
        (s, i) =>
          `<li><span class="n">${i + 1}</span> <a href="${esc(origin)}/place/${encodeURIComponent(s.slug)}">${esc(s.title)}</a>${period(s) ? ` <span class="meta" style="display:inline">· ${esc(period(s))}</span>` : ''}</li>`,
      )
      .join('')

    const jsonld = {
      '@context': 'https://schema.org',
      '@type': 'TouristTrip',
      name: tour.title,
      description,
      url: canonical,
      ...(image ? { image } : {}),
      ...(stops.length
        ? {
            itinerary: {
              '@type': 'ItemList',
              numberOfItems: stops.length,
              itemListElement: stops.map((s, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                item: { '@type': 'TouristAttraction', name: s.title, url: `${origin}/place/${encodeURIComponent(s.slug)}` },
              })),
            },
          }
        : {}),
      isPartOf: { '@type': 'WebSite', name: cfg.appName, url: origin },
    }

    const body = `<main>
${tour.cover_image_url ? `<div class="hero-img" style="background-image:url('${esc(tour.cover_image_url)}')"></div>` : ''}
<div class="wrap">
<p class="kicker">${esc(tour.city || cfg.appName)} · Walking tour</p>
<h1>${esc(tour.title)}</h1>
<a class="cta" href="${esc(appLink)}">Start in ${esc(cfg.appName)} →</a>
${renderText(tour.description)}
${stops.length ? `<h2>${stops.length} stops</h2><ul class="stops">${stopsHtml}</ul>` : ''}
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
