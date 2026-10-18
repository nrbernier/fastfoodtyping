// Cut-out algorithm shared by tools/process-art.mjs (Node) and the cut-out
// editor page (browser). Pure JS, no dependencies.
//
// Input is a normalised greyscale scan (0 = ink, 255 = paper). The background
// is the paper a round brush of radius `brush` can reach from the scan edge
// without touching ink (an opening by reconstruction): it traces the outline
// but can't slip through small breaks in it, so faces stay solid. The paper is
// then split into regions, each wholly see-through or wholly solid:
// background pieces start see-through, pieces the brush missed start solid,
// and small missed pieces opening straight onto the background (corners,
// armpits the brush couldn't fit into) start see-through.
//
// Per-figure fixes (`fix`), all in unpadded scan pixels:
//   brush:  brush radius (default BRUSH)
//   seals:  [[[x, y], [x, y]], ...] invisible lines that block the brush,
//           closing outlines the artist left open
//   clear:  [[x, y], ...] points whose region is made see-through
//   fill:   [[x, y], ...] points whose region is made solid
//   paint:  [[[x, y], ...], ...] polygons whose paper is made solid, for
//           shapes left open by the scan (planks running off the edge)

export const INK = [0x26, 0x22, 0x1e];
export const CREAM = [0xf4, 0xe8, 0xcf];
// Grey level below which a pixel blocks the brush. Set high so faint, thin
// pen lines still count as outline.
export const OUTLINE = 190;
export const BRUSH = 5;
// A missed piece touching the background this small (share of the figure's
// area) is a corner the brush couldn't reach.
export const POCKET = 0.015;
// Isolated ink specks smaller than this many pixels are scan dust.
export const SPECK = 25;

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
      if (x > 0 && mask[p - 1] && !labels[p - 1]) { labels[p - 1] = id; stack.push(p - 1); }
      if (x < w - 1 && mask[p + 1] && !labels[p + 1]) { labels[p + 1] = id; stack.push(p + 1); }
      if (y > 0 && mask[p - w] && !labels[p - w]) { labels[p - w] = id; stack.push(p - w); }
      if (y < h - 1 && mask[p + w] && !labels[p + w]) { labels[p + w] = id; stack.push(p + w); }
    }
    sizes.push(size);
  }
  return [labels, sizes];
}

/** Mark a 3px-wide segment from a to b in `mask`. */
function drawSeam(mask, w, h, [ax, ay], [bx, by]) {
  const steps = Math.ceil(Math.hypot(bx - ax, by - ay) * 2) || 1;
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

/**
 * Cut out one scan. `grey` is w*h normalised greyscale. Returns the padded
 * size, the RGBA cut-out (`rgba`, padded) and the region map with each
 * region's state, which the editor uses for hit-testing.
 */
export function cutout(grey, sw, sh, fix = {}) {
  const r = fix.brush ?? BRUSH;
  // Pad with paper so the brush can travel all the way around the figure.
  const pad = r + 2;
  const w = sw + 2 * pad;
  const h = sh + 2 * pad;
  const n = w * h;
  const data = new Uint8Array(n).fill(255);
  for (let y = 0; y < sh; y++) data.set(grey.subarray(y * sw, y * sw + sw), (y + pad) * w + pad);

  const outline = new Uint8Array(n);
  for (let i = 0; i < n; i++) outline[i] = data[i] < OUTLINE ? 1 : 0;
  for (const [a, b] of fix.seals ?? []) drawSeam(outline, w, h, [a[0] + pad, a[1] + pad], [b[0] + pad, b[1] + pad]);

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

  // Regions: 0 = ink, 1..nb = background pieces, nb+1.. = missed pieces.
  const bg = new Uint8Array(n);
  const missed = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    if (outline[i]) continue;
    if (toReach[i] <= r * r) bg[i] = 1;
    else missed[i] = 1;
  }
  const [bgLabels, bgSizes] = label(bg, w, h);
  const [inLabels, inSizes] = label(missed, w, h);
  const nb = bgSizes.length - 1;
  const regions = new Int32Array(n);
  for (let i = 0; i < n; i++) regions[i] = bgLabels[i] || (inLabels[i] ? nb + inLabels[i] : 0);
  const solid = new Uint8Array(nb + inSizes.length);
  solid[0] = 1;
  for (let k = 1; k < inSizes.length; k++) solid[nb + k] = 1;

  let body = 0;
  for (let i = 0; i < n; i++) if (!bg[i]) body++;
  const touchesBg = new Uint8Array(inSizes.length);
  for (let i = 0; i < n; i++) {
    if (!inLabels[i]) continue;
    const x = i % w;
    if ((x > 0 && bg[i - 1]) || (x < w - 1 && bg[i + 1]) || (i >= w && bg[i - w]) || (i < n - w && bg[i + w])) {
      touchesBg[inLabels[i]] = 1;
    }
  }
  for (let k = 1; k < inSizes.length; k++) if (touchesBg[k] && inSizes[k] < body * POCKET) solid[nb + k] = 0;

  const regionAt = (x, y) => {
    for (let d = 0; d <= 4; d++) {
      for (let dy = -d; dy <= d; dy++) {
        for (let dx = -d; dx <= d; dx++) {
          const xx = x + pad + dx;
          const yy = y + pad + dy;
          if (xx >= 0 && yy >= 0 && xx < w && yy < h && regions[yy * w + xx]) return regions[yy * w + xx];
        }
      }
    }
    return 0;
  };
  for (const [x, y] of fix.clear ?? []) { const k = regionAt(x, y); if (k) solid[k] = 0; }
  for (const [x, y] of fix.fill ?? []) { const k = regionAt(x, y); if (k) solid[k] = 1; }

  // Figure = ink + solid regions, minus scan dust.
  const figure = new Uint8Array(n);
  for (let i = 0; i < n; i++) figure[i] = solid[regions[i]];
  for (const poly of fix.paint ?? []) {
    const ys = poly.map((q) => q[1]);
    const ya = Math.max(0, Math.floor(Math.min(...ys))), yb = Math.min(sh - 1, Math.ceil(Math.max(...ys)));
    for (let y = ya; y <= yb; y++) {
      // Scanline fill: x crossings of the polygon's edges at this row.
      const xs = [];
      for (let j = 0, k = poly.length - 1; j < poly.length; k = j++) {
        const [x1, y1] = poly[k], [x2, y2] = poly[j];
        if ((y1 > y) !== (y2 > y)) xs.push(x1 + ((y - y1) * (x2 - x1)) / (y2 - y1));
      }
      xs.sort((u, v) => u - v);
      for (let m = 0; m + 1 < xs.length; m += 2) {
        for (let x = Math.max(0, Math.ceil(xs[m])); x <= Math.min(sw - 1, Math.floor(xs[m + 1])); x++) {
          figure[(y + pad) * w + x + pad] = 1;
        }
      }
    }
  }
  const [figLabels, sizes] = label(figure, w, h);
  for (let i = 0; i < n; i++) if (figure[i] && sizes[figLabels[i]] < SPECK) figure[i] = 0;

  // Anti-aliased ink just outside the figure keeps its soft edge.
  const toFigure = distanceSq(figure, w, h);
  const rgba = new Uint8ClampedArray(n * 4);
  for (let i = 0; i < n; i++) {
    const t = data[i] / 255;
    rgba[i * 4] = Math.round(INK[0] + (CREAM[0] - INK[0]) * t);
    rgba[i * 4 + 1] = Math.round(INK[1] + (CREAM[1] - INK[1]) * t);
    rgba[i * 4 + 2] = Math.round(INK[2] + (CREAM[2] - INK[2]) * t);
    rgba[i * 4 + 3] = figure[i] ? 255 : toFigure[i] <= 4 ? 255 - data[i] : 0;
  }
  return { w, h, pad, rgba, regions, solid, regionAt };
}
