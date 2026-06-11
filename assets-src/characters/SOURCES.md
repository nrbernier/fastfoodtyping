# Character art sources

The customer cast is AI-generated via the Recraft v3 API
(`external.api.recraft.ai`), using a custom style trained on cropped,
grayscaled figures from the *Food Chain Magnate* board game box art (a
1950s-advertising pastiche). Output is constrained to grayscale +
halftone (`recraft-style.json` holds the style id), then run through
`tools/process-art.mjs` to extract the ink linework onto a transparent
background and recolor it to the UI's charcoal tone.

To regenerate or extend the cast: `node --env-file=.env tools/recraft-gen.mjs cast`,
then `node --env-file=.env tools/recraft-rmbg.mjs assets-src/characters/candidates/gen-<key>.png`,
then copy the `-rmbg.png` result to `assets-src/characters/<key>.png` and
re-run `node tools/process-art.mjs`. Requires a `RECRAFT_API_KEY` in `.env`
(git-ignored).

| key | prompt summary |
|---|---|
| housewife | cheerful 1950s housewife, polka-dot dress and gloves, handbag |
| businessman | impatient portly businessman, suit and fedora, checking wristwatch |
| kid | 1950s newsboy, flat cap and suspenders, rolled newspaper under arm |
| grandma | sweet grandmother, flowered hat and shawl, leaning on a small umbrella |
| cowboy | lanky cowboy, ten-gallon hat and boots, thumbs in belt |
| teenager | 1950s teenage girl, ponytail, poodle skirt and saddle shoes, chewing gum |
| waiter | off-duty short-order cook, apron and paper hat, towel over shoulder |
| robot | friendly boxy 1950s retro robot with an antenna |
| alien | goofy B-movie alien, bug eyes and antennae, bubble space helmet |
| beatnik | beatnik with beret, dark sunglasses, goatee and turtleneck |
