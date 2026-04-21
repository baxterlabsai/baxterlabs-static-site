import { chromium } from 'playwright'
import { createServer } from 'http'
import { readFileSync, existsSync, writeFileSync, mkdirSync, statSync } from 'fs'
import { join, dirname, resolve, extname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DIST = resolve(__dirname, '..', 'dist')
const PORT = 4323
const BLOG_API = 'https://baxterlabs-api.onrender.com/api/public/blog'

const STATIC_ROUTES = [
  '/',
  '/about',
  '/services',
  '/get-started',
  '/insights',
  '/partners',
  '/positioning-map',
  '/alfonso-onboarding',
]

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.xml': 'application/xml',
  '.txt': 'text/plain',
  '.json': 'application/json',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json',
}

function mimeFor(path) {
  return MIME[extname(path).toLowerCase()] || 'application/octet-stream'
}

function startStaticServer() {
  return new Promise((resolveFn) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url, `http://localhost:${PORT}`)
      const pathname = decodeURIComponent(url.pathname)
      const direct = join(DIST, pathname)
      if (
        existsSync(direct) &&
        statSync(direct).isFile()
      ) {
        res.writeHead(200, { 'Content-Type': mimeFor(direct) })
        res.end(readFileSync(direct))
        return
      }
      // SPA fallback
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end(readFileSync(join(DIST, 'index.html')))
    })
    server.on('error', (err) => {
      console.error('[prerender] static server error:', err)
      process.exit(1)
    })
    server.listen(PORT, () => resolveFn(server))
  })
}

async function fetchBlogSlugs() {
  try {
    const res = await fetch(BLOG_API)
    if (!res.ok) {
      console.warn(`[prerender] blog API returned ${res.status}; skipping blog routes`)
      return []
    }
    const posts = await res.json()
    return posts
      .filter((p) => p && typeof p.blog_slug === 'string' && p.blog_slug.length > 0)
      .map((p) => `/insights/${p.blog_slug}`)
  } catch (err) {
    console.warn(`[prerender] blog API fetch failed (${err.message}); skipping blog routes`)
    return []
  }
}

function routeToOutputPath(route) {
  if (route === '/') return join(DIST, 'index.html')
  return join(DIST, route.replace(/^\//, ''), 'index.html')
}

async function renderRoute(page, route) {
  const url = `http://localhost:${PORT}${route}`
  await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 })
  // Let any trailing microtasks settle (SEO useEffect, etc.)
  await page.waitForTimeout(150)
  return await page.content()
}

async function main() {
  if (!existsSync(join(DIST, 'index.html'))) {
    console.error('[prerender] dist/index.html missing — run `vite build` first')
    process.exit(1)
  }
  const server = await startStaticServer()
  const browser = await chromium.launch()
  const failed = []

  try {
    const blogRoutes = await fetchBlogSlugs()
    const routes = [...STATIC_ROUTES, ...blogRoutes]
    console.log(`[prerender] rendering ${routes.length} routes`)
    const ctx = await browser.newContext()

    for (const route of routes) {
      const page = await ctx.newPage()
      try {
        const html = await renderRoute(page, route)
        const outPath = routeToOutputPath(route)
        mkdirSync(dirname(outPath), { recursive: true })
        writeFileSync(outPath, html, 'utf-8')
        console.log(`  ✓ ${route}`)
      } catch (err) {
        failed.push({ route, error: err.message })
        console.error(`  ✗ ${route} — ${err.message}`)
      } finally {
        await page.close()
      }
    }
    await ctx.close()
  } finally {
    await browser.close()
    server.close()
  }

  if (failed.length > 0) {
    console.error(`\n[prerender] ${failed.length} route(s) failed`)
    process.exit(1)
  }
  console.log('\n[prerender] done')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
