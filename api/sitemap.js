// sitemap.xml — generated live from Supabase, so it self-updates as content is
// added (no rebuild). Lists the home page, every publicly-visible location that
// has at least one published story (avoids thin/empty pages), and every tour.
import { sb, esc, siteOrigin, configured } from './_seo.js'

export default async function handler(req, res) {
  try {
    const origin = siteOrigin(req)
    const urls = [{ loc: `${origin}/`, priority: '1.0' }]

    if (configured) {
      const [locs, tours] = await Promise.all([
        sb('locations?select=slug,updated_at,stories(id,status)'),
        sb('tours?select=slug,updated_at'),
      ])
      for (const l of locs) {
        const hasPublished = (l.stories || []).some((s) => s.status !== 'draft')
        if (hasPublished) urls.push({ loc: `${origin}/place/${encodeURIComponent(l.slug)}`, lastmod: l.updated_at, priority: '0.8' })
      }
      for (const t of tours) urls.push({ loc: `${origin}/tour/${encodeURIComponent(t.slug)}`, lastmod: t.updated_at, priority: '0.9' })
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) =>
      `  <url><loc>${esc(u.loc)}</loc>${u.lastmod ? `<lastmod>${esc(String(u.lastmod).slice(0, 10))}</lastmod>` : ''}<priority>${u.priority}</priority></url>`,
  )
  .join('\n')}
</urlset>`

    res.setHeader('content-type', 'application/xml; charset=utf-8')
    res.setHeader('cache-control', 'public, s-maxage=3600, stale-while-revalidate=86400')
    return res.status(200).send(xml)
  } catch (e) {
    res.setHeader('content-type', 'text/plain; charset=utf-8')
    return res.status(500).send('Error: ' + (e?.message || e))
  }
}
