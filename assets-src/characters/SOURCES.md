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
`public/characters/<id>.png`. The background is the paper a round brush can
reach from the scan's edge without touching ink: it traces the outline but
can't slip through small breaks in it, so faces stay cream. Ink is recolored
charcoal and the result is trimmed and scaled to 256px tall. A few figures need
a bigger brush (`BRUSH_OVERRIDES`) or an invisible seam across an outline the
artist left open (`SEALS`).

`s-29-311` and `s-29-314` had a neighbouring figure's hand painted out of the
cut by hand.

To add a pose, cut it from the scan into `stivers/`, add it to `cast.ts`, and
run the script for its id.

## Earlier art

The previous AI-generated cast (Recraft v3) and its tools were removed; they
remain in git history before the vintage-cast change.
