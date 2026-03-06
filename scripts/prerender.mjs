import puppeteer from 'puppeteer';
import { createServer } from 'net';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, '../dist');

const routes = ['/', '/about', '/services', '/get-started'];

function findFreePort() {
  return new Promise((resolve) => {
    const srv = createServer();
    srv.listen(0, () => {
      const port = srv.address().port;
      srv.close(() => resolve(port));
    });
  });
}

async function prerender() {
  const port = await findFreePort();

  // Start static file server with SPA fallback
  const server = spawn('npx', ['serve', distDir, '-p', String(port), '--no-clipboard', '--single'], {
    stdio: 'pipe',
  });

  // Wait for server to be ready
  await new Promise((resolve) => setTimeout(resolve, 2000));

  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    for (const route of routes) {
      const page = await browser.newPage();
      await page.goto(`http://localhost:${port}${route}`, {
        waitUntil: 'networkidle0',
        timeout: 30000,
      });

      const html = await page.content();
      const outputDir = route === '/'
        ? distDir
        : path.join(distDir, route);

      fs.mkdirSync(outputDir, { recursive: true });
      fs.writeFileSync(path.join(outputDir, 'index.html'), html);
      console.log(`Pre-rendered: ${route}`);
      await page.close();
    }
  } finally {
    await browser.close();
    server.kill();
  }

  console.log('Pre-rendering complete.');
}

prerender().catch((err) => {
  console.error('Pre-render failed:', err);
  process.exit(1);
});
