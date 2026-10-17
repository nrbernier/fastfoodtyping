// Usage: node tools/process-art.mjs [id ...]
// Converts clip-art scans in assets-src/characters/stivers/<id>.png into
// uniform cut-out PNGs at public/characters/<id>.png:
// greyscale -> the paper *outside* the figure becomes transparent, while paper
// enclosed by the ink outline (faces, shirts) stays opaque cream, so the diner
// wall never shows through a face. Ink is recolored to the UI's charcoal tone,
// then the figure is trimmed and scaled to 256px height.
import { mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const SRC = 'assets-src/characters/stivers';
const OUT = 'public/characters';
const INK = [0x26, 0x22, 0x1e];
const CREAM = [0xf4, 0xe8, 0xcf];
const HEIGHT = 256;
const DARK = 128; // grey level below which a pixel counts as ink
// Pixels the outline is closed by before the background fill, so a figure
// whose outline has small breaks doesn't leak the fill inside.
const CLOSE_RADIUS = 2;
// Thin-line scans whose head outlines have breaks wide enough to leak the
// background fill into the face; a wider close seals them. Applying this to
// every scan would also fill the gaps between sparkle lines and fingers.
const CLOSE_OVERRIDES = Object.fromEntries(
  ['s-11-112', 's-11-114', 's-13-136', 's-14-141', 's-15-158', 's-16-165',
    's-17-178', 's-19-200', 's-19-205', 's-25-269', 's-29-319', 's-29-321'].map((id) => [id, 10]),
);

/** Square-kernel dilation (or erosion) of a 0/1 mask, separable passes. */
function morph(mask, w, h, r, dilate) {
  const pass = (src, horizontal) => {
    const dst = new Uint8Array(src.length);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let hit = dilate ? 0 : 1;
        for (let k = -r; k <= r; k++) {
          const xx = horizontal ? x + k : x;
          const yy = horizontal ? y : y + k;
          // Out-of-bounds counts as background for both operations.
          const v = xx < 0 || yy < 0 || xx >= w || yy >= h ? 0 : src[yy * w + xx];
          if (dilate ? v : !v) { hit = dilate ? 1 : 0; break; }
        }
        dst[y * w + x] = hit;
      }
    }
    return dst;
  };
  return pass(pass(mask, true), false);
}

/** Label 4-connected regions of `mask`; returns [labels, sizes]. */
function label(mask, w, h) {
  const labels = new Int32Array(mask.length);
  const sizes = [0];
  const stack = [];
  for (let i = 0; i < mask.length; i++) {
    if (!mask[i] || labels[i]) continue;
    const id = sizes.length;
    let size = 0;
    stack.push(i);
    labels[i] = id;
    while (stack.length) {
      const p = stack.pop();
      size++;
      const x = p % w;
      const y = (p - x) / w;
      for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1]) {
        if (q >= 0 && mask[q] && !labels[q]) { labels[q] = id; stack.push(q); }
      }
    }
    sizes.push(size);
  }
  return [labels, sizes];
}

async function processOne(file) {
  const id = path.parse(file).name;
  const { data, info } = await sharp(path.join(SRC, file))
    .flatten({ background: '#ffffff' })
    .greyscale()
    .normalise()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const n = w * h;

  const r = CLOSE_OVERRIDES[id] ?? CLOSE_RADIUS;
  const dark = new Uint8Array(n);
  for (let i = 0; i < n; i++) dark[i] = data[i] < DARK ? 1 : 0;
  const closed = morph(morph(dark, w, h, r, true), w, h, r, false);

  // Background = open paper reachable from the scan's edge.
  const open = closed.map((v) => 1 - v);
  const [openLabels] = label(open, w, h);
  const edgeIds = new Set();
  for (let x = 0; x < w; x++) { edgeIds.add(openLabels[x]); edgeIds.add(openLabels[n - w + x]); }
  for (let y = 0; y < h; y++) { edgeIds.add(openLabels[y * w]); edgeIds.add(openLabels[y * w + w - 1]); }
  edgeIds.delete(0);

  // Figure = everything else, minus specks far smaller than the main body.
  const figure = new Uint8Array(n);
  for (let i = 0; i < n; i++) figure[i] = edgeIds.has(openLabels[i]) ? 0 : 1;
  const [figLabels, sizes] = label(figure, w, h);
  const biggest = Math.max(...sizes);
  for (let i = 0; i < n; i++) if (figure[i] && sizes[figLabels[i]] < biggest * 0.02) figure[i] = 0;

  // Anti-aliased ink just outside the figure keeps its soft edge.
  const halo = morph(figure, w, h, 2, true);
  const out = Buffer.alloc(n * 4);
  for (let i = 0; i < n; i++) {
    const t = data[i] / 255;
    out[i * 4] = Math.round(INK[0] + (CREAM[0] - INK[0]) * t);
    out[i * 4 + 1] = Math.round(INK[1] + (CREAM[1] - INK[1]) * t);
    out[i * 4 + 2] = Math.round(INK[2] + (CREAM[2] - INK[2]) * t);
    out[i * 4 + 3] = figure[i] ? 255 : halo[i] ? 255 - data[i] : 0;
  }

  await sharp(out, { raw: { width: w, height: h, channels: 4 } })
    .trim()
    .resize({ height: HEIGHT })
    .png()
    .toFile(path.join(OUT, `${id}.png`));
  console.log(`processed ${id}`);
}

await mkdir(OUT, { recursive: true });
const wanted = process.argv.slice(2);
const files = (await readdir(SRC)).filter((f) => /\.(png|jpe?g|webp)$/i.test(f));
const targets = wanted.length ? files.filter((f) => wanted.includes(path.parse(f).name)) : files;
if (targets.length === 0) console.log('nothing to process — put scans in', SRC);
for (const f of targets) await processOne(f);
