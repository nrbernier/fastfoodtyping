# Visual Polish Plan — "Make it look impressive"

Goal: turn the game from "prototype with good taste" into a finished-looking
1950s diner. Eight improvements, sequenced so foundational layout/layering work
lands before the effects that depend on it.

## Guiding constraints (from the existing code)

- **Palette is locked** (`src/ui/palette.ts`): no pure white/black; aged cream,
  red, mustard, charcoal ink, teal wall. New scenery uses these only.
- **Cast art** is charcoal ink-on-transparent PNG, 256px tall source, drawn at
  `SPRITE_HEIGHT=120`, origin `(0.5, 1)`, anchored at `counterY=height*0.58`.
- **No API dependency in the default path.** Recraft generation (`tools/recraft-gen.mjs`)
  needs `RECRAFT_API_KEY` + manual candidate review, so all eight points are
  implemented with **procedural Phaser vector drawing** in the existing
  "advertising poster" style. Generated art (a wall mural) is listed as optional
  enhancement only.
- **Testing conventions**: pure geometry goes in testable modules (cf. `geom.ts`,
  `clock.ts`) with Vitest specs; visuals are verified with the puppeteer
  screenshot tour (`tests/screenshot-tour.mjs`). No `cat`/heredoc/inline code —
  real files only. Run `npm test` + `npm run build` (tsc typecheck) after each phase.

## New shared modules

- `src/ui/scenery.ts` — reusable vector builders: `makeMenuBoard`, `makeNeonSign`,
  `makeCounterProp` (ketchup/napkins/cake stand/cup), `makeDish`, `makePlateIcon`,
  `makeWindowBlinds`. Phaser-aware, palette-driven.
- `src/ui/geom.ts` (extend) — pure geometry that deserves tests:
  `perspectiveFloorQuads()`, `clockHandAngle(elapsed,total)`, `dishOutline()`.
  Keep Phaser-free; unit-test in `tests/ui/`.
- `src/ui/texture.ts` — `buildPaperGrain(scene)` generates the print-overlay
  texture once at boot via RenderTexture; `applyPaperGrain(scene)` overlays it.

---

## Phase 1 — The diner interior (Point 1, + floor from Point 5)

The empty teal upper half is the single biggest problem (also flagged in
`notes.md`). Build a `DinerBackdrop` drawn in `GameScene.drawDiner()` behind
everything, entirely from vector shapes:

- **Window with venetian blinds**: framed rectangle, repeated horizontal lines
  for blinds, a paler "daylight" fill — `makeWindowBlinds`.
- **Wall menu board**: charcoal board, red header strip ("MEL'S — SERVED ALL DAY"),
  mono price rows ("BURGER ... 25¢", "SHAKE ... 15¢"). Pure vector + text, reads
  instantly as a diner. `makeMenuBoard`.
- **Wall shelf**: coffee urn + pie case as simple silhouettes.
- **Pendant lights / neon "EAT" sign** near the ceiling — see `makeNeonSign`
  (reused in Phase 7 for the title).
- Add a wainscoting band at the bottom of the wall so the wall has depth instead
  of one flat fill.

**Floor (Point 5, paired here):** replace the high-contrast near-black/cream
checkerboard with a **perspective trapezoid floor** (`perspectiveFloorQuads()` in
geom.ts, unit-tested) tinted to dark-teal/cream so it recedes instead of vibrating.

Files: `GameScene.ts`, new `scenery.ts`, `geom.ts` (+ test). Risk: low — additive,
flat-teal fallback preserved if a builder is disabled.

## Phase 2 — Character presence (Point 2)

Make customers feel like people at a counter, not paper cutouts.

- Raise `SPRITE_HEIGHT` ~120 → ~190.
- Add an **elliptical contact shadow** as the first child of `CustomerView`.
- **Occlude legs behind the counter**: currently the counter is drawn *before*
  customers, so it renders under them. Fix layering by giving the counter-front
  strip an explicit `setDepth` above the customer containers, and lower the
  customer anchor so the lower body sits behind it. Customers get a depth band
  between backdrop and counter-front.

Files: `CustomerView.ts`, `GameScene.ts` (`drawDiner` depth + `counterY`).
Risk: medium — touches layering used by serve/stormOut tweens; verify both still
read correctly in the screenshot tour.

## Phase 3 — Typing feedback on the ticket (Point 3)

Put the live letters where the player is already looking (also in `notes.md`).

- Refactor the order ticket so `CustomerView` owns a **typed (green) + caret +
  untyped (ink)** layout, mirroring `Hud.showOrder`, instead of `makeTicket`
  baking one static label. Add `CustomerView.updateTyping(typedCount)`.
- Wire `orderLocked` / `orderProgress` / `wordCompleted` to call the **active
  customer's view** (via `engine.lockedCustomerId`), not only the HUD.
- Per-letter **pop tween** on each correct keystroke; caret blink.
- Underscore/marker on the next-letter position so the awaited key is obvious
  (the second `notes.md` request).
- Decide HUD echo fate: repurpose the bottom bar as the order-spike rail in
  Phase 5 rather than duplicating the ticket text.

Files: `CustomerView.ts`, `GameScene.ts` (event wiring), `theme.ts`
(`makeTicket` → support dynamic text or add `makeLiveTicket`). Risk: medium —
this is the highest-UX-value change; test partial/again/serve transitions.

## Phase 4 — Ambient motion (Point 4)

Static frames look like mockups. All tween-only, no assets:

- **Idle bob**: each customer sprite eases up/down a few px on an offset sine.
- **Steam** rising from the prep bowl (small recurring particle/tween loop).
- **Neon flicker**: occasional alpha dip on the "Mel's Diner" / EAT sign.
- **Clock second-hand**: add a rotating hand to the starburst clock, angle from
  `clockHandAngle()` (unit-tested), advanced in `update()`.

Files: `CustomerView.ts`, `PrepStation.ts`, `GameScene.ts`, `geom.ts` (+ test).
Risk: low.

## Phase 5 — Counter dressing + juice the moments (Points 5 & 6)

- **Counter props** (`makeCounterProp`): ketchup bottle, napkin dispenser, cake
  stand, coffee cup, placed along the counter to fill space with theme.
- **Real dish on serve**: replace the `serveDish` graphics ellipse with a small
  vector burger/shake (`makeDish` + `dishOutline()`), arced with squash-and-stretch.
- **"+$N" float** rising from the customer on `orderServed`; small happy hop
  before they fade.
- **Strikes as cracking plates**: `Hud.setStrikes` draws three plate icons
  (`makePlateIcon`) that crack/grey as strikes accrue, instead of `✗··`.
- **HUD as ticket rail**: restyle the bottom bar as a brushed-metal order spike /
  rail so it reads as diner hardware and earns its space.

Files: `PrepStation.ts`, `Hud.ts`, `GameScene.ts`, `scenery.ts`, `geom.ts` (+ test).
Risk: low–medium.

## Phase 6 — Print-texture overlay (Point 7)

One screen-sized paper-grain/halftone texture unifies the flat Phaser rectangles
into "printed 1950s advertising."

- `buildPaperGrain(scene)` at boot: RenderTexture with low-alpha noise/halftone
  dots, saved as a texture key.
- `applyPaperGrain(scene)` adds a non-interactive Image at very high depth,
  `BlendModes.MULTIPLY`, low alpha, resized on RESIZE. Call it from each scene's
  `create()`.

Files: new `texture.ts`, `BootScene.ts` (build), each scene (apply). Risk: low —
purely cosmetic top layer; tune alpha so text stays legible.

## Phase 7 — Title screen as a poster (Point 8)

First impression. Reuse already-loaded cast textures:

- **Cast lineup** standing along the bottom checkerboard strip.
- **Neon flicker** on the script logo (reuse Phase 4 helper).
- A starburst **price tag** / "TODAY ONLY" flourish; tighten button spacing.

Files: `TitleScene.ts`, `scenery.ts`. Risk: low.

---

## Optional enhancement (not in default path)

Generate a single wide wall **mural** via `tools/recraft-gen.mjs` (window + urn +
pie case + neon) in the established monochrome ink style, process it with a
wide-image variant of `process-art.mjs` to ink-on-transparent, load via a new
`BACKGROUNDS` manifest in `assets.ts` (BootScene already tolerates load errors),
and draw it over the Phase 1 vector backdrop. Requires `RECRAFT_API_KEY` and
manual candidate review, so it's tracked separately from the autonomous phases.

## Verification per phase

1. `npm run build` (tsc typecheck) and `npm test` stay green.
2. Extend `tests/screenshot-tour.mjs` to capture the relevant scene; eyeball the
   PNGs in `/tmp/.../shots`.
3. New pure-geometry functions get Vitest specs under `tests/ui/`.

## Suggested order & rationale

Phases 1→2→3 deliver ~80% of the perceived improvement (full room, present
characters, feedback where you look) and should land first. 4–7 are layered
polish that build on that foundation. Each phase is independently shippable and
committable.
