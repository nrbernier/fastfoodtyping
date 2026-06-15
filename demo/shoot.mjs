// Verify the self-contained demo renders a busy frozen state.
// Usage: node demo/shoot.mjs
import puppeteer from 'puppeteer-core';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const fileUrl = `file://${path.join(here, 'game-state-phone.html')}`;
const out = '/tmp/claude-1000/demo-shot.png';

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/chromium',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--allow-file-access-from-files'],
  defaultViewport: { width: 470, height: 900, deviceScaleFactor: 2 },
});
const page = await browser.newPage();
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));

await page.goto(fileUrl, { waitUntil: 'networkidle2' });
await new Promise((r) => setTimeout(r, 3000)); // boot + fonts + seed + intro tweens
await page.screenshot({ path: out });

console.log('shot:', out);
console.log('page errors:', errors.length ? errors : 'none');
await browser.close();
