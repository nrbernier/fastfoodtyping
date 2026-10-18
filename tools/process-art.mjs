// Usage: node tools/process-art.mjs [id ...]
// Converts clip-art scans in assets-src/characters/stivers/<id>.png into
// uniform cut-out PNGs at public/characters/<id>.png: the paper outside the
// figure becomes transparent, paper enclosed by the ink outline (faces,
// shirts) stays opaque cream, ink is recolored charcoal, and the figure is
// trimmed and scaled to 256px height. The algorithm lives in cutout-core.mjs,
// shared with the cut-out editor page.
//
// Per-figure fixes come from assets-src/characters/cutout-fixes.json, which
// the cut-out editor exports (see cutout-core.mjs for the format).
// Set CUTOUT_EXPORT=<file> to also write the normalised scans and fixes the
// editor page loads, as one JSON file.
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { cutout } from './cutout-core.mjs';

const SRC = 'assets-src/characters/stivers';
const OUT = 'public/characters';
const FIXES = 'assets-src/characters/cutout-fixes.json';
const HEIGHT = 256;
const EXPORT = process.env.CUTOUT_EXPORT;

const fixes = JSON.parse(await readFile(FIXES, 'utf8'));
const exported = {};

async function processOne(file) {
  const id = path.parse(file).name;
  const { data, info } = await sharp(path.join(SRC, file))
    .flatten({ background: '#ffffff' })
    .greyscale()
    .normalise()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: sw, height: sh } = info;
  const { w, h, rgba } = cutout(data, sw, sh, fixes[id]);

  await sharp(Buffer.from(rgba.buffer), { raw: { width: w, height: h, channels: 4 } })
    .trim()
    .resize({ height: HEIGHT })
    .png()
    .toFile(path.join(OUT, `${id}.png`));
  if (EXPORT) {
    const webp = await sharp(data, { raw: { width: sw, height: sh, channels: 1 } }).webp({ lossless: true, effort: 6 }).toBuffer();
    exported[id] = { w: sw, h: sh, grey: `data:image/webp;base64,${webp.toString('base64')}` };
  }
  console.log(`processed ${id}`);
}

await mkdir(OUT, { recursive: true });
const wanted = process.argv.slice(2);
const files = (await readdir(SRC)).filter((f) => /\.(png|jpe?g|webp)$/i.test(f));
const targets = wanted.length ? files.filter((f) => wanted.includes(path.parse(f).name)) : files;
if (targets.length === 0) console.log('nothing to process — put scans in', SRC);
for (const f of targets) await processOne(f);
if (EXPORT) await writeFile(EXPORT, JSON.stringify({ scans: exported, fixes }));
