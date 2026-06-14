// Repro/verification for mobile crowding + keyboard-up layout.
// Usage: node tests/mobile-repro.mjs   (dev server must be on :5199)
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const URL = 'http://localhost:5199/fastfoodtyping/';
const OUT = '/tmp/claude-1000/shots';
fs.mkdirSync(OUT, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/chromium',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

// Unlock every shift so we can stress-test the densest ones.
async function newGamePage(w, h) {
  const page = await browser.newPage();
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('short-order-hero-save', JSON.stringify({ version: 1, unlockedShift: 9, highScores: {} }));
  });
  await page.setViewport({ width: w, height: h });
  return page;
}

// ShiftSelect button row: y = h*0.28 + i*min(76, h*0.12)
const shiftY = (h, i) => h * 0.28 + i * Math.min(76, h * 0.12);

async function shot(label, shiftIndex, settle) {
  const W = 390;
  const TALL = 820;
  const page = await newGamePage(W, TALL);
  await page.goto(URL, { waitUntil: 'networkidle2' });
  await wait(2200); // fonts + boot
  await page.mouse.click(W / 2, TALL * 0.52); // START SHIFT
  await wait(700);
  await page.mouse.click(W / 2, shiftY(TALL, shiftIndex)); // chosen shift
  await wait(1000);
  await page.setViewport({ width: W, height: 440 }); // keyboard opens (shrink)
  await wait(settle); // let customers accumulate at the shrunk height
  await page.screenshot({ path: `${OUT}/${label}.png` });
  await page.close();
}

await shot('crowd-monday', 0, 6200); // 2 customers (the reported case)
await shot('crowd-friday', 4, 7200); // 3-4 customers (densest)

await browser.close();
console.log('done', fs.readdirSync(OUT).filter((f) => f.startsWith('crowd')));
