# Character art sources

The customer cast is cut from **Humorous Advertising Cuts of the 1940s**
(Dover, 1998): 369 stock advertising cartoons drawn by Stivers Studio between
the 1930s and 1950s, selected by Dan X. Solo.

- Scan: Internet Archive item `stiverstudiodover`,
  <https://archive.org/details/stiverstudiodover>, marked
  [Public Domain Mark 1.0](https://creativecommons.org/publicdomain/mark/1.0/).
- The cuts were sold as copyright-free clip art, and the original 1930s–50s
  ad cuts carry no renewed copyright.

`stivers/<id>.png` are the figures as cut from the scan's pages at 200 dpi.
The id is `s-<book page>-<figure number>`, numbered in reading order across the
book, so `s-25-266` is the 266th figure, on page 25.

## Cast

`src/ui/cast.ts` is the manifest. It groups poses of the same drawn person
(`character`), marks the wacky poses held back for weird tier-3 orders, and
marks the Finger-Counter poses (`fingers: 1–5`) used only for his special order.

## Processing

`node tools/process-art.mjs [id ...]` turns each scan into
`public/characters/<id>.png` using the algorithm in `tools/cutout-core.mjs`:
the background is the paper a round brush can reach from the scan's edge
without touching ink, so it can't slip through small breaks in an outline and
faces stay cream. The paper is split into regions, each wholly see-through or
solid; small pockets the brush couldn't fit into are cleared automatically.
Ink is recolored charcoal and the result is trimmed and scaled to 256px tall.

Per-figure fixes live in `cutout-fixes.json`: brush size, invisible closing
lines across open outlines (`seals`), and points whose region is forced
see-through (`clear`) or solid (`fill`), polygons painted solid (`paint`) for shapes the scan leaves open, and freehand brush strokes (`strokes`) applied last. They're made in the Cut-out Fixer
page, which runs the same core in the browser; `CUTOUT_EXPORT=<file> node
tools/process-art.mjs` writes the scan data it loads.

`s-29-311` and `s-29-314` had a neighbouring figure's hand painted out of the
cut by hand.

To add a pose, cut it from the scan into `stivers/`, add it to `cast.ts`, and
run the script for its id.

## Earlier art

The previous AI-generated cast (Recraft v3) and its tools were removed; they
remain in git history before the vintage-cast change.

## Edited art

`s-17-180` (man in the water) had its whirlpool replaced with a hand-drawn
wooden washtub by `tools/draw-tub.py`; the unedited cut is in `originals/`.
