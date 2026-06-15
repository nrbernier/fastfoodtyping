# Phone game-state preview

A **self-contained, single-file** HTML snapshot of the game frozen in a busy
mid-shift, sized to a phone with the iOS keyboard up. Shareable with Claude
Design for visual tweaks — animations keep running (neon flicker, customer bob,
patience jitter, tip floats), only the shift **clock is paused**.

The shippable artifact is **`game-state-phone.html`** (~2 MB; Phaser, fonts and
all character art inlined, so it opens straight from `file://`).

## Regenerate

```bash
node demo/gen-assets.mjs                          # 1. inline art+fonts -> demo/assets.generated.ts
npx vite build --config demo/vite.config.ts       # 2. bundle -> dist-demo/index.html
cp dist-demo/index.html demo/game-state-phone.html  # 3. copy out the deliverable
node demo/shoot.mjs                               # 4. (optional) headless screenshot to verify
```

## How it works

- `main.ts` boots a `DemoBoot` scene (loads the cast from inlined data URIs)
  then starts the real `GameScene` with `{ demo: true }`.
- `GameScene` demo mode (`seedDemo()`): drives the real, seeded engine into a
  full counter with one order locked + half-typed, sets a score, impales a
  couple of receipts, and shows one broken strike plate — then freezes the
  clock while leaving every tween alive.
- `index.html` is the device frame: a 390×520 playfield (#app) above a
  CSS-drawn iOS portrait keyboard. The short playfield is what triggers the
  game's own keyboard-up downscaling.

## Knobs

| What | Where |
| --- | --- |
| Shift / menu | `DEMO_SHIFT` in `main.ts` (`SHIFTS[2]` = Wednesday) |
| Which customers/orders | `DEMO_SEED` in `main.ts` |
| Patience-bar levels | `fracs` in `GameScene.seedDemo()` |
| Score / strikes | `setScore` / `setStrikes` in `GameScene.seedDemo()` |
| Keyboard look, playfield split | `.kbd` / `#app` CSS in `index.html` |

`assets.generated.ts` and `dist-demo/` are build artifacts (git-ignored);
run step 1 before building on a fresh checkout.
