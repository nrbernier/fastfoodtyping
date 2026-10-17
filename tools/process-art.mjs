// Usage: node tools/process-art.mjs [id ...]
// Converts clip-art scans in assets-src/characters/stivers/<id>.png into
// uniform cut-out PNGs at public/characters/<id>.png:
// greyscale -> the paper *outside* the figure becomes transparent, while paper
// enclosed by the ink outline (faces, shirts) stays opaque cream, so the diner
// wall never shows through a face. Ink is recolored to the UI's charcoal tone,
// then the figure is trimmed and scaled to 256px height.
//
// "Outside" is the paper a round brush of radius BRUSH can reach from the scan
// edge without touching ink (an opening by reconstruction). The brush can't
// squeeze through small breaks in an outline, yet it traces the true outline
// everywhere else; only channels narrower than the brush fill in cream.
import { mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const SRC = 'assets-src/characters/stivers';
const OUT = 'public/characters';
const INK = [0x26, 0x22, 0x1e];
const CREAM = [0xf4, 0xe8, 0xcf];
const HEIGHT = 256;
// Grey level below which a pixel blocks the brush. Set high so faint, thin
// pen lines still count as outline.
const OUTLINE = 190;
const BRUSH = 5;
// Scans with wider breaks in a head outline.
const BRUSH_OVERRIDES = { 's-11-112': 8, 's-29-321': 8 };
// Outline the artist left open: invisible seam lines (scan pixel coords) that
// block the brush but aren't drawn.
const SEALS = {
  's-17-178': [[[118, 46], [146, 74]]], // back of the head, hair tip to brow
};

/**
 * Squared Euclidean distance from each pixel to the nearest pixel where
 * `feature` is set (Felzenszwalb & Huttenlocher, separable 1-D passes).
 */
function distanceSq(feature, w, h) {
  const INF = 1e20;
  const d = new Float64Array(w * h);
  for (let i = 0; i < d.length; i++) d[i] = feature[i] ? 0 : INF;
  const n = Math.max(w, h);
  const f = new Float64Array(n);
  const out = new Float64Array(n);
  const v = new Int32Array(n);
  const z = new Float64Array(n + 1);
  const pass1d = (len) => {
    let k = 0;
    v[0] = 0;
    z[0] = -INF;
    z[1] = INF;
    for (let q = 1; q < len; q++) {
      let s;
      do {
        const p = v[k];
        s = (f[q] + q * q - (f[p] + p * p)) / (2 * q - 2 * p);
      } while (s <= z[k] && --k >= 0);
      k++;
      v[k] = q;
      z[k] = s;
      z[k + 1] = INF;
    }
    k = 0;
    for (let q = 0; q < len; q++) {
      while (z[k + 1] < q) k++;
      const p = v[k];
      out[q] = (q - p) * (q - p) + f[p];
    }
  };
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) f[y] = d[y * w + x];
    pass1d(h);
    for (let y = 0; y < h; y++) d[y * w + x] = out[y];
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) f[x] = d[y * w + x];
    pass1d(w);
    for (let x = 0; x < w; x++) d[y * w + x] = out[x];
  }
  return d;
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

/** Mark a 3px-wide segment from a to b in `mask`. */
function drawSeam(mask, w, h, [ax, ay], [bx, by]) {
  const steps = Math.ceil(Math.hypot(bx - ax, by - ay) * 2);
  for (let s = 0; s <= steps; s++) {
    const x = Math.round(ax + ((bx - ax) * s) / steps);
    const y = Math.round(ay + ((by - ay) * s) / steps);
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx;
        const yy = y + dy;
        if (xx >= 0 && yy >= 0 && xx < w && yy < h) mask[yy * w + xx] = 1;
      }
    }
  }
}

async function processOne(file) {
  const id = path.parse(file).name;
  const r = BRUSH_OVERRIDES[id] ?? BRUSH;
  // Pad with paper so the brush can travel all the way around the figure.
  const pad = r + 2;
  const { data, info } = await sharp(path.join(SRC, file))
    .flatten({ background: '#ffffff' })
    .greyscale()
    .normalise()
    .extend({ top: pad, bottom: pad, left: pad, right: pad, background: '#ffffff' })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const n = w * h;

  const outline = new Uint8Array(n);
  for (let i = 0; i < n; i++) outline[i] = data[i] < OUTLINE ? 1 : 0;
  for (const [a, b] of SEALS[id] ?? []) drawSeam(outline, w, h, [a[0] + pad, a[1] + pad], [b[0] + pad, b[1] + pad]);

  // Where the brush centre fits: paper at least r from any outline pixel.
  const toOutline = distanceSq(outline, w, h);
  const fits = new Uint8Array(n);
  for (let i = 0; i < n; i++) fits[i] = toOutline[i] > r * r ? 1 : 0;
  // Keep only the placements reachable from the scan edge...
  const [fitLabels] = label(fits, w, h);
  const edgeIds = new Set();
  for (let x = 0; x < w; x++) { edgeIds.add(fitLabels[x]); edgeIds.add(fitLabels[n - w + x]); }
  for (let y = 0; y < h; y++) { edgeIds.add(fitLabels[y * w]); edgeIds.add(fitLabels[y * w + w - 1]); }
  edgeIds.delete(0);
  const reach = new Uint8Array(n);
  for (let i = 0; i < n; i++) reach[i] = edgeIds.has(fitLabels[i]) ? 1 : 0;
  // ...and sweep the brush over them: everything it paints is background.
  const toReach = distanceSq(reach, w, h);

  // Figure = everything else, minus specks far smaller than the main body.
  const figure = new Uint8Array(n);
  for (let i = 0; i < n; i++) figure[i] = toReach[i] <= r * r && !outline[i] ? 0 : 1;
  const [figLabels, sizes] = label(figure, w, h);
  const biggest = Math.max(...sizes);
  for (let i = 0; i < n; i++) if (figure[i] && sizes[figLabels[i]] < biggest * 0.02) figure[i] = 0;

  // Anti-aliased ink just outside the figure keeps its soft edge.
  const toFigure = distanceSq(figure, w, h);
  const out = Buffer.alloc(n * 4);
  for (let i = 0; i < n; i++) {
    const t = data[i] / 255;
    out[i * 4] = Math.round(INK[0] + (CREAM[0] - INK[0]) * t);
    out[i * 4 + 1] = Math.round(INK[1] + (CREAM[1] - INK[1]) * t);
    out[i * 4 + 2] = Math.round(INK[2] + (CREAM[2] - INK[2]) * t);
    out[i * 4 + 3] = figure[i] ? 255 : toFigure[i] <= 4 ? 255 - data[i] : 0;
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
