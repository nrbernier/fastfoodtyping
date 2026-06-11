// Visual tour: screenshots of title, shift select, and mid-game scenes.
// Usage: node tests/screenshot-tour.mjs
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const URL = 'http://localhost:5199/fastfoodtyping/';
const OUT = '/tmp/claude-1000/shots';
fs.mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/chromium',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
  defaultViewport: { width: 1280, height: 800 },
});
const page = await browser.newPage();
await page.goto(URL, { waitUntil: 'networkidle2' });
await new Promise((r) => setTimeout(r, 2500)); // fonts + boot scene

await page.screenshot({ path: `${OUT}/1-title.png` });

// START SHIFT button sits at ~(w/2, h*0.52)
await page.mouse.click(640, 800 * 0.52);
await new Promise((r) => setTimeout(r, 800));
await page.screenshot({ path: `${OUT}/2-shiftselect.png` });

// Monday button on the shift-select board
await page.mouse.click(640, 224);
await new Promise((r) => setTimeout(r, 1500));
await page.screenshot({ path: `${OUT}/3-game-early.png` });

// type the first customer's order ("toast" on Monday seed) partway
await page.keyboard.type('toas', { delay: 60 });
await page.screenshot({ path: `${OUT}/4-game-typing.png` });
await page.keyboard.type('t', { delay: 60 });

await new Promise((r) => setTimeout(r, 6000));
await page.screenshot({ path: `${OUT}/5-game-later.png` });

await browser.close();
console.log('done', fs.readdirSync(OUT));
