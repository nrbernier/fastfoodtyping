// Usage: node tools/process-art.mjs [key ...]
// Converts scans in assets-src/characters/<key>.(png|jpg|jpeg|webp) into
// uniform ink-on-transparent PNGs at public/characters/<key>.png:
// greyscale -> luminance becomes alpha (dark ink opaque, paper transparent),
// pixels recolored to charcoal ink, trimmed, scaled to 256px height.
import { mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const SRC = 'assets-src/characters';
const OUT = 'public/characters';
const INK = { r: 0x26, g: 0x22, b: 0x1e };
const HEIGHT = 256;
const NOISE_FLOOR = 18; // alpha below this becomes fully transparent (paper speckle)

async function processOne(file) {
  const key = path.parse(file).name;
  const { data, info } = await sharp(path.join(SRC, file))
    .flatten({ background: '#ffffff' })
    .greyscale()
    .normalise()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const out = Buffer.alloc(info.width * info.height * 4);
  for (let i = 0; i < info.width * info.height; i++) {
    const alpha = 255 - data[i];
    out[i * 4] = INK.r;
    out[i * 4 + 1] = INK.g;
    out[i * 4 + 2] = INK.b;
    out[i * 4 + 3] = alpha < NOISE_FLOOR ? 0 : alpha;
  }

  await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
    .trim()
    .resize({ height: HEIGHT })
    .png()
    .toFile(path.join(OUT, `${key}.png`));
  console.log(`processed ${key}`);
}

await mkdir(OUT, { recursive: true });
const wanted = process.argv.slice(2);
const files = (await readdir(SRC)).filter((f) => /\.(png|jpe?g|webp)$/i.test(f));
const targets = wanted.length ? files.filter((f) => wanted.includes(path.parse(f).name)) : files;
if (targets.length === 0) console.log('nothing to process — put scans in', SRC);
for (const f of targets) await processOne(f);
