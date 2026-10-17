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
`public/characters/<id>.png`. The paper outside the figure becomes transparent,
paper enclosed by the outline stays cream, ink is recolored charcoal, and the
result is trimmed and scaled to 256px tall. Thin-line figures whose head
outlines have gaps get a wider outline close (`CLOSE_OVERRIDES` in the script).

To add a pose, cut it from the scan into `stivers/`, add it to `cast.ts`, and
run the script for its id.

## Earlier art

The previous AI-generated cast (Recraft v3, styled on the *Food Chain Magnate*
box art) is still in this folder and `public/characters/` under its old names
(`housewife.png`, `robot.png`, ...) along with its tools (`tools/recraft-*.mjs`,
`tools/fix-*.py`, `tools/clean-corners.py`). The game no longer loads it. The
standalone demo (`demo/gen-assets.mjs`) still inlines those files.
