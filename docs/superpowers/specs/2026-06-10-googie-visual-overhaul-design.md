# Googie Diner Visual Overhaul — Design

**Date:** 2026-06-10
**Status:** Approved direction, pending spec review

## Goal

Replace the current placeholder visuals (emoji customers, flat-color primitives,
Verdana) with a cohesive 1950s diner-advertisement look: Googie roadside-diner
styling for layout and chrome, vintage print-ad cartoon characters for the
customers, in the spirit of the board game Food Chain Magnate.

This game is a personal, non-commercial project. Character art is sourced from
scans of real 1950s advertisements via archives (see Sourcing below).

## Decisions made during brainstorming

- **Overall style:** Googie Diner Americana (chosen over strict FCM print look
  and a print-ad hybrid) — neon-script logo, starbursts, checkerboard floors.
- **Character art source:** scanned public-archive 1950s ad art (chosen over
  AI-generated, hand-built SVG, and purchased packs).
- **Scope:** full overhaul — all scenes, HUD, buttons, typography.
- **Implementation approach:** build-time asset pipeline (Approach 1). No
  runtime shaders, no pre-rendered scene plates. Treatments are baked into
  assets once; the engine just draws sprites and styled text.
- **Palette:** "Aged print" (option B below).

## Art direction

### Palette ("Aged print")

| Role | Hex | Use |
|---|---|---|
| wall / teal | `#3fa8a1` | scene backdrop, secondary accents |
| paper / cream | `#f4e8cf` | tickets, panels, text on dark |
| red | `#d63b2a` | primary buttons, urgent states, logo accent |
| mustard | `#e3a51c` | starbursts, highlights, HUD accent |
| ink / charcoal | `#26221e` | text, outlines, HUD bar, checkerboard dark |

Supporting: counter steel gradient (`#ddd3c0` → `#b3a892`), patience-bar
green `#27ae60` (kept from current theme). No pure white and no pure black
anywhere — aged paper and warm ink only, so scanned art does not clash.

### Typography

Four faces, all SIL OFL licensed, self-hosted as woff2 under `public/fonts/`
so the PWA works offline (no runtime Google Fonts requests):

| Face | Role |
|---|---|
| Pacifico | logo / script display ("Short-Order Hero") |
| Alfa Slab One | headlines, buttons |
| Oswald (500/700) | HUD, labels, small caps text |
| Special Elite | order tickets, prep station, results receipt |

Fonts load via `@font-face` CSS plus `document.fonts.ready` awaited in
BootScene before any text-bearing scene starts, so Phaser never renders
fallback fonts.

### Motifs

Checkerboard floor strips, mustard starbursts (badge shapes, the shift
timer clock), ticket cards with hard offset shadows and speech-tail,
dot-leader menu listings, dashed "coupon" borders for secondary panels.
All drawn with Phaser graphics/text — no image assets needed for chrome.

## Characters

### Cast (~10, replacing the emoji array in `CustomerView.ts`)

housewife, businessman, kid, grandma, cowboy, teenager, waiter/chef,
robot, B-movie alien, beatnik. Exact cast may flex based on what good
scans are found; minimum 8 so customer variety stays comparable to the
current 10 emoji.

### Sourcing

Searched from Wikimedia Commons (PD-tagged 1950s advertisements),
Internet Archive magazine scans, and Flickr Commons. Candidates are
presented to the user in the visual companion; the user picks the cast.
Personal-use project; prefer items already tagged public domain
(US ads 1928–1963 with unrenewed copyright are PD).

### Asset pipeline

- `assets-src/characters/` — original downloads + a `SOURCES.md` recording
  the URL and archive for each image. Excluded from the Vite build.
- `tools/process-art.mjs` — one-time processing script run via
  `node tools/process-art.mjs`, using `sharp` (devDependency). Per image:
  crop to figure, background to transparent (white-point keying on the scan),
  ink normalized toward charcoal `#26221e`, scaled to uniform 256 px height
  (2x display size), output PNG to `public/characters/<key>.png`.
- `src/ui/assets.ts` — manifest mapping character keys to file paths; the
  single place BootScene and CustomerView learn the cast from.

### States

- **Normal:** static sprite at the counter.
- **Impatient (patience < 0.2):** existing jitter tween kept.
- **Storm-out:** red tint on the sprite plus a small "!!" starburst overlay
  (replaces the 😡 swap); existing slide-out animation kept.
- **Served:** existing rise-and-fade animation kept.

## Screen-by-screen

- **TitleScene** — poster composition: teal field, script logo in red with
  cream/ink offset shadow, rotated slightly; mustard starburst badge
  ("24 HR SERVICE"); checkerboard floor strip at bottom; buttons as
  diner-sign slabs (Alfa Slab One on red).
- **ShiftSelectScene** — "TODAY'S SHIFTS" menu board: charcoal panel,
  mustard heading, shifts as menu items with dot leaders, locked shifts
  greyed with a "86'd" stamp treatment.
- **GameScene** — menu-board HUD strip across the top (script logo left,
  Oswald stats right); starburst wall clock showing shift time; customers
  as clip-art sprites along the counter; orders as Special Elite ticket
  cards with speech tails; prep station as a cream order ticket with
  "★ NOW PREPARING ★" label; checkerboard floor.
- **ResultsScene** — existing receipt layout kept; fonts and palette
  aligned (Special Elite, aged-paper cream).
- **PWA icon (`public/icon.svg`)** — updated to match the new logo
  treatment so the home-screen icon fits the theme.

## Code shape

- `src/ui/theme.ts` — becomes the single source of truth: new palette
  tokens, font constants, restyled `makeButton`, new helpers
  `makeStarburst(scene, x, y, r, text)` and `makeTicket(scene, x, y, text)`.
  Old color names migrate; no scene defines ad-hoc colors.
- `src/ui/assets.ts` — new; character manifest.
- `BootScene` — preloads character PNGs from the manifest, awaits
  `document.fonts.ready`.
- `CustomerView` — emoji `Text` → `Sprite` keyed off `customer.id`
  modulo cast size (same assignment logic as today).
- `index.html` / CSS — `@font-face` declarations; page background set to
  the new cream.
- **No changes to `src/core/`** — game logic, scoring, typing engine,
  difficulty are untouched.

## Error handling

- Missing character texture (manifest/file drift): BootScene logs and falls
  back to a drawn placeholder (cream rounded rect with "?" in slab type)
  rather than crashing.
- Font load failure (offline first run before cache): `document.fonts.ready`
  resolves regardless; system-font fallbacks declared in the font constants
  so text remains readable.

## Testing

- All existing vitest suites must stay green (core logic untouched).
- New test: asset manifest ↔ `public/characters/` files agree (catches a
  renamed or missing PNG at test time instead of runtime).
- `npm run build` (includes `tsc --noEmit`) passes.
- Manual visual verification on desktop browser and phone via
  `npm run dev -- --host`.

## Out of scope

- Sound, music, animation rework beyond the states listed above.
- New gameplay mechanics or vocabulary changes.
- Commercial-grade license clearance for the scanned art (personal project).
