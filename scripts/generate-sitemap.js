import { writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, '..', 'public', 'sitemap.xml')
const API = 'https://baxterlabs-api.onrender.com/api/public/blog'
const BASE = 'https://baxterlabs.ai'

const staticPages = [
  { loc: `${BASE}/`, changefreq: 'monthly', priority: '0.8' },
  { loc: `${BASE}/about`, changefreq: 'monthly', priority: '0.8' },
  { loc: `${BASE}/services`, changefreq: 'monthly', priority: '0.8' },
  { loc: `${BASE}/get-started`, changefreq: 'monthly', priority: '0.7' },
  { loc: `${BASE}/insights`, changefreq: 'weekly', priority: '0.8' },
  { loc: `${BASE}/partners`, changefreq: 'monthly', priority: '0.6' },
  { loc: `${BASE}/positioning-map`, changefreq: 'monthly', priority: '0.7' },
]

function buildUrl({ loc, changefreq, priority, lastmod }) {
  let xml = `  <url>\n    <loc>${loc}</loc>\n`
  if (lastmod) xml += `    <lastmod>${lastmod}</lastmod>\n`
  xml += `    <changefreq>${changefreq}</changefreq>\n`
  xml += `    <priority>${priority}</priority>\n`
  xml += `  </url>`
  return xml
}

async function main() {
  const entries = [...staticPages]

  try {
    const res = await fetch(API)
    if (!res.ok) throw new Error(`API returned ${res.status}`)
    const posts = await res.json()
    for (const post of posts) {
      if (!post.blog_slug) continue
      const lastmod = post.published_date ? post.published_date.slice(0, 10) : ''
      entries.push({
        loc: `${BASE}/insights/${post.blog_slug}`,
        changefreq: 'never',
        priority: '0.6',
        lastmod,
      })
    }
    console.log(`Sitemap: ${staticPages.length} static + ${posts.length} blog posts`)
  } catch (err) {
    console.warn(`Sitemap: API fetch failed (${err.message}), using static pages only`)
  }

  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    entries.map(buildUrl).join('\n') +
    '\n</urlset>\n'

  writeFileSync(OUT, xml, 'utf-8')
  console.log(`Sitemap: wrote ${entries.length} URLs to public/sitemap.xml`)
}

main()
