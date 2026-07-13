// robots.txt — allow crawling and point at the (live-generated) sitemap. The
// admin backoffice is disallowed. Served at /robots.txt via a rewrite.
import { siteOrigin } from './_seo.js'

export default function handler(req, res) {
  const origin = siteOrigin(req)
  const body = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /admin.html
Disallow: /ingest/

Sitemap: ${origin}/sitemap.xml
`
  res.setHeader('content-type', 'text/plain; charset=utf-8')
  res.setHeader('cache-control', 'public, s-maxage=86400')
  return res.status(200).send(body)
}
