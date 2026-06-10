# Googie Diner Visual Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle Short-Order Hero into a 1950s Googie-diner advertisement look — aged-print palette, period typography, and vintage clip-art customers — per the approved spec at `docs/superpowers/specs/2026-06-10-googie-visual-overhaul-design.md`.

**Architecture:** All changes live in `src/ui/`, `index.html`, `public/`, and a new `tools/` script. A new Phaser-free `src/ui/palette.ts` holds color/font tokens (testable in node); `src/ui/theme.ts` keeps the Phaser helpers; `src/ui/assets.ts` is the character manifest that BootScene preloads and CustomerView consumes. Character art is processed once at build-author time by `tools/process-art.mjs` (sharp) from scans in `assets-src/characters/`. `src/core/` is untouched.

**Tech Stack:** Phaser 3.90, Vite 7, TypeScript, vitest (node env), sharp (new devDependency), self-hosted woff2 fonts (Pacifico, Alfa Slab One, Oswald, Special Elite).

**Important constraint:** Phaser cannot be imported in the node vitest environment, so anything that needs a unit test must live in a Phaser-free module (`palette.ts`, `assets.ts`). Phaser scene/helper code is verified by `npm run build` (includes `tsc --noEmit`) and visual checks.

**Task 11 (art curation) is interactive** — it requires the user to pick the cast in the visual companion. Do not dispatch it to a subagent; execute it in the main session with the user. Everything else works before it lands because `CHARACTERS` starts empty and CustomerView falls back to a placeholder texture.

---

### Task 1: Phaser-free palette module

**Files:**
- Create: `src/ui/palette.ts`
- Test: `tests/ui/palette.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/ui/palette.test.ts
import { describe, expect, it } from 'vitest';
import { COLORS, FONTS } from '../../src/ui/palette';

describe('aged-print palette', () => {
  it('contains no pure white or pure black', () => {
    for (const [name, value] of Object.entries(COLORS)) {
      const hex =
        typeof value === 'number'
          ? value.toString(16).padStart(6, '0')
          : value.replace('#', '').toLowerCase();
      expect(hex, name).not.toBe('ffffff');
      expect(hex, name).not.toBe('000000');
    }
  });

  it('string and hex variants of the same color agree', () => {
    expect(COLORS.creamHex).toBe(parseInt(COLORS.cream.slice(1), 16));
    expect(COLORS.redHex).toBe(parseInt(COLORS.red.slice(1), 16));
    expect(COLORS.darkHex).toBe(parseInt(COLORS.dark.slice(1), 16));
    expect(COLORS.mustardHex).toBe(parseInt(COLORS.mustard.slice(1), 16));
  });

  it('defines the four typography roles', () => {
    expect(FONTS.script).toContain('Pacifico');
    expect(FONTS.slab).toContain('Alfa Slab One');
    expect(FONTS.sans).toContain('Oswald');
    expect(FONTS.mono).toContain('Special Elite');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/ui/palette.test.ts`
Expected: FAIL — cannot resolve `../../src/ui/palette`

- [ ] **Step 3: Create the palette module**

```ts
// src/ui/palette.ts
// "Aged print" palette — no pure white, no pure black anywhere, so scanned
// 1950s art (yellowed paper, warm ink) never clashes with the UI.
export const COLORS = {
  wall: 0x3fa8a1,
  wallDark: 0x35918b,
  counter: 0xddd3c0,
  counterEdge: 0xb3a892,
  hud: 0x26221e,
  cream: '#f4e8cf',
  creamHex: 0xf4e8cf,
  red: '#d63b2a',
  redHex: 0xd63b2a,
  mustard: '#e3a51c',
  mustardHex: 0xe3a51c,
  dark: '#26221e',
  darkHex: 0x26221e,
  green: '#27ae60',
  yellow: '#e3a51c',
  white: '#f4e8cf', // legacy key — paper cream, never actual white
  disabled: '#8a8a8a',
  disabledHex: 0x8a8a8a,
};

export const FONTS = {
  script: '"Pacifico", cursive',
  slab: '"Alfa Slab One", serif',
  sans: '"Oswald", Verdana, sans-serif',
  mono: '"Special Elite", Courier, monospace',
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/ui/palette.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Re-point theme.ts at the palette (keep old values for now — only the source moves)**

In `src/ui/theme.ts`, replace the `COLORS` and `FONT` definitions (lines 3–19) with re-exports, keeping `makeButton` working unchanged:

```ts
import Phaser from 'phaser';
import { COLORS, FONTS } from './palette';

export { COLORS, FONTS };
/** @deprecated transitional alias; scenes migrate to FONTS.* in later tasks */
export const FONT = FONTS.sans;
```

Note: this changes the live colors (e.g. cream is now `#f4e8cf`). That is intended — the palette flips game-wide here, and later tasks restyle layout/typography per scene.

- [ ] **Step 6: Verify the whole suite and build still pass**

Run: `npm test && npm run build`
Expected: all tests pass, build succeeds

- [ ] **Step 7: Commit**

```bash
git add src/ui/palette.ts src/ui/theme.ts tests/ui/palette.test.ts
git commit -m "feat: aged-print palette as Phaser-free token module"
```

---

### Task 2: Self-hosted webfonts

**Files:**
- Create: `public/fonts/pacifico.woff2`, `public/fonts/alfa-slab-one.woff2`, `public/fonts/oswald-500.woff2`, `public/fonts/oswald-700.woff2`, `public/fonts/special-elite.woff2`
- Modify: `index.html`

- [ ] **Step 1: Download woff2 files (google-webfonts-helper API serves latin-subset zips)**

```bash
cd /home/nbernier/Code/typing_game_app
mkdir -p public/fonts /tmp/gfonts
for f in pacifico alfa-slab-one special-elite; do
  curl -sL "https://gwfh.mranftl.com/api/fonts/${f}?download=zip&subsets=latin&variants=regular" -o /tmp/gfonts/${f}.zip
  unzip -o -q /tmp/gfonts/${f}.zip -d /tmp/gfonts/${f}
done
curl -sL "https://gwfh.mranftl.com/api/fonts/oswald?download=zip&subsets=latin&variants=500,700" -o /tmp/gfonts/oswald.zip
unzip -o -q /tmp/gfonts/oswald.zip -d /tmp/gfonts/oswald
cp /tmp/gfonts/pacifico/*regular.woff2 public/fonts/pacifico.woff2
cp /tmp/gfonts/alfa-slab-one/*regular.woff2 public/fonts/alfa-slab-one.woff2
cp /tmp/gfonts/special-elite/*regular.woff2 public/fonts/special-elite.woff2
cp /tmp/gfonts/oswald/*-500.woff2 public/fonts/oswald-500.woff2
cp /tmp/gfonts/oswald/*-700.woff2 public/fonts/oswald-700.woff2
ls -la public/fonts/
```

Expected: five `.woff2` files, each roughly 10–30 KB. (All four families are SIL OFL licensed.) If `unzip` is unavailable, use `npx extract-zip /tmp/gfonts/<f>.zip /tmp/gfonts/<f>`.

- [ ] **Step 2: Declare @font-face and the new page background in index.html**

Replace the `<style>` block in `index.html` with:

```html
<style>
  @font-face {
    font-family: 'Pacifico';
    src: url('/fonts/pacifico.woff2') format('woff2');
    font-display: swap;
  }
  @font-face {
    font-family: 'Alfa Slab One';
    src: url('/fonts/alfa-slab-one.woff2') format('woff2');
    font-display: swap;
  }
  @font-face {
    font-family: 'Oswald';
    font-weight: 500;
    src: url('/fonts/oswald-500.woff2') format('woff2');
    font-display: swap;
  }
  @font-face {
    font-family: 'Oswald';
    font-weight: 700;
    src: url('/fonts/oswald-700.woff2') format('woff2');
    font-display: swap;
  }
  @font-face {
    font-family: 'Special Elite';
    src: url('/fonts/special-elite.woff2') format('woff2');
    font-display: swap;
  }
  html,
  body {
    margin: 0;
    padding: 0;
    height: 100%;
    overflow: hidden;
    background: #f4e8cf;
  }
  #app {
    width: 100%;
    height: 100dvh;
  }
</style>
```

- [ ] **Step 3: Update the Phaser canvas background in main.ts**

In `src/main.ts` line 22, change `backgroundColor: '#fdf3e3'` to `backgroundColor: '#f4e8cf'`.

- [ ] **Step 4: Make the service worker precache fonts and character art**

vite-plugin-pwa's default workbox glob is `**/*.{js,css,html}` — fonts and PNGs would 404 offline. In `vite.config.ts`, add a `workbox` key to the `VitePWA({...})` options (sibling of `registerType` and `manifest`):

```ts
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      },
```

Also update the manifest colors in the same file: `theme_color: '#d63b2a'`, `background_color: '#f4e8cf'`.

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: success; `dist/fonts/` contains the five woff2 files, and the build output's `sw.js`/precache manifest references them

- [ ] **Step 6: Commit**

```bash
git add public/fonts index.html src/main.ts vite.config.ts
git commit -m "feat: self-hosted period webfonts with offline precache"
```

---

### Task 3: Theme helpers — restyled button, starburst, ticket

**Files:**
- Modify: `src/ui/theme.ts` (replace `makeButton`, add `makeStarburst`, `makeTicket`)

No node-side test is possible (Phaser import); verification is `tsc` via build plus visual checks in later scene tasks.

- [ ] **Step 1: Replace theme.ts entirely with**

```ts
import Phaser from 'phaser';
import { COLORS, FONTS } from './palette';

export { COLORS, FONTS };
/** @deprecated transitional alias; scenes migrate to FONTS.* in later tasks */
export const FONT = FONTS.sans;

/** Diner-sign slab button with a hard offset shadow. */
export function makeButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onClick: () => void,
  enabled = true,
): Phaser.GameObjects.Container {
  const text = scene.add
    .text(0, 0, label, {
      fontFamily: FONTS.slab,
      fontSize: '24px',
      color: COLORS.cream,
      align: 'center',
    })
    .setOrigin(0.5);
  const w = text.width + 44;
  const h = text.height + 18;
  const shadow = scene.add.rectangle(4, 4, w, h, COLORS.darkHex, 0.4).setOrigin(0.5);
  const bg = scene.add
    .rectangle(0, 0, w, h, enabled ? COLORS.redHex : COLORS.disabledHex)
    .setStrokeStyle(3, COLORS.darkHex)
    .setOrigin(0.5);
  const btn = scene.add.container(x, y, [shadow, bg, text]).setSize(w, h);
  if (enabled) {
    btn.setInteractive({ useHandCursor: true });
    btn.on('pointerover', () => btn.setAlpha(0.9));
    btn.on('pointerout', () => btn.setAlpha(1));
    btn.on('pointerdown', onClick);
  }
  return btn;
}

/** Mustard advertising starburst with centered label. */
export function makeStarburst(
  scene: Phaser.Scene,
  x: number,
  y: number,
  radius: number,
  text: string,
  bg = COLORS.mustardHex,
  fg = COLORS.dark,
): Phaser.GameObjects.Container {
  const g = scene.add.graphics();
  const pts: Phaser.Math.Vector2[] = [];
  const spikes = 12;
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? radius : radius * 0.78;
    const a = (i * Math.PI) / spikes - Math.PI / 2;
    pts.push(new Phaser.Math.Vector2(Math.cos(a) * r, Math.sin(a) * r));
  }
  g.fillStyle(bg, 1).fillPoints(pts, true);
  const label = scene.add
    .text(0, 0, text, {
      fontFamily: FONTS.sans,
      fontSize: `${Math.max(11, Math.round(radius * 0.3))}px`,
      fontStyle: 'bold',
      color: fg,
      align: 'center',
    })
    .setOrigin(0.5);
  return scene.add.container(x, y, [g, label]).setAngle(-10);
}

/** Cream order-ticket card with offset shadow and a speech tail at the bottom. */
export function makeTicket(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  maxWidth = 220,
): Phaser.GameObjects.Container {
  const label = scene.add
    .text(0, 0, text, {
      fontFamily: FONTS.mono,
      fontSize: '17px',
      color: COLORS.dark,
      align: 'center',
      wordWrap: { width: maxWidth - 24 },
    })
    .setOrigin(0.5);
  const w = label.width + 24;
  const h = label.height + 16;
  const shadow = scene.add.rectangle(3, 3, w, h, COLORS.darkHex, 0.35).setOrigin(0.5);
  const tail = scene.add
    .triangle(0, h / 2 + 4, 0, 0, 14, 0, 7, 9, COLORS.darkHex)
    .setOrigin(0.5, 0);
  const paper = scene.add
    .rectangle(0, 0, w, h, COLORS.creamHex)
    .setStrokeStyle(2, COLORS.darkHex)
    .setOrigin(0.5);
  return scene.add.container(x, y, [shadow, tail, paper, label]);
}
```

- [ ] **Step 2: Verify build and tests**

Run: `npm run build && npm test`
Expected: build passes (existing scenes still compile — `makeButton`'s return type changed Text→Container, but no call site uses the return value), tests pass

- [ ] **Step 3: Commit**

```bash
git add src/ui/theme.ts
git commit -m "feat: diner-sign button, starburst, and ticket theme helpers"
```

---

### Task 4: Character manifest + sharp processing pipeline

**Files:**
- Create: `src/ui/assets.ts`, `tools/process-art.mjs`, `assets-src/characters/SOURCES.md`, `public/characters/.gitkeep`
- Test: `tests/ui/assets.test.ts`
- Modify: `package.json` (sharp devDependency)

- [ ] **Step 1: Write the failing test**

```ts
// tests/ui/assets.test.ts
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CHARACTERS, characterKeyFor, PLACEHOLDER_KEY } from '../../src/ui/assets';

const publicDir = fileURLToPath(new URL('../../public', import.meta.url));

describe('character manifest', () => {
  it('every entry has a processed image on disk', () => {
    for (const c of CHARACTERS) {
      expect(existsSync(`${publicDir}/${c.file}`), c.key).toBe(true);
    }
  });

  it('keys are unique', () => {
    expect(new Set(CHARACTERS.map((c) => c.key)).size).toBe(CHARACTERS.length);
  });

  it('falls back to the placeholder when the cast is empty, cycles otherwise', () => {
    if (CHARACTERS.length === 0) {
      expect(characterKeyFor(0)).toBe(PLACEHOLDER_KEY);
      expect(characterKeyFor(7)).toBe(PLACEHOLDER_KEY);
    } else {
      expect(characterKeyFor(0)).toBe(CHARACTERS[0].key);
      expect(characterKeyFor(CHARACTERS.length)).toBe(CHARACTERS[0].key);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/ui/assets.test.ts`
Expected: FAIL — cannot resolve `../../src/ui/assets`

- [ ] **Step 3: Create the manifest module**

```ts
// src/ui/assets.ts
// Cast manifest. Filled during art curation (see the design spec, "Characters").
// Keys double as Phaser texture keys; files are relative to public/.
export interface CharacterDef {
  key: string;
  file: string;
}

export const CHARACTERS: CharacterDef[] = [];

export const PLACEHOLDER_KEY = 'char-placeholder';

export function characterKeyFor(customerId: number): string {
  if (CHARACTERS.length === 0) return PLACEHOLDER_KEY;
  return CHARACTERS[customerId % CHARACTERS.length].key;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/ui/assets.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Install sharp and add the processing script**

Run: `npm install -D sharp`

```js
// tools/process-art.mjs
// Usage: node tools/process-art.mjs [key ...]
// Converts scans in assets-src/characters/<key>.(png|jpg|jpeg|webp) into
// uniform ink-on-transparent PNGs at public/characters/<key>.png:
// greyscale -> luminance becomes alpha (dark ink opaque, paper transparent),
// pixels recolored to charcoal ink, trimmed, scaled to 256px height.
import { mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const SRC = 'assets-src/characters';
const OUT = 'public/characters';
const INK = { r: 0x26, g: 0x22, b: 0x1e };
const HEIGHT = 256;
const NOISE_FLOOR = 18; // alpha below this becomes fully transparent (paper speckle)

async function processOne(file) {
  const key = path.parse(file).name;
  const { data, info } = await sharp(path.join(SRC, file))
    .flatten({ background: '#ffffff' })
    .greyscale()
    .normalise()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const out = Buffer.alloc(info.width * info.height * 4);
  for (let i = 0; i < info.width * info.height; i++) {
    const alpha = 255 - data[i];
    out[i * 4] = INK.r;
    out[i * 4 + 1] = INK.g;
    out[i * 4 + 2] = INK.b;
    out[i * 4 + 3] = alpha < NOISE_FLOOR ? 0 : alpha;
  }

  await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
    .trim()
    .resize({ height: HEIGHT })
    .png()
    .toFile(path.join(OUT, `${key}.png`));
  console.log(`processed ${key}`);
}

await mkdir(OUT, { recursive: true });
const wanted = process.argv.slice(2);
const files = (await readdir(SRC)).filter((f) => /\.(png|jpe?g|webp)$/i.test(f));
const targets = wanted.length ? files.filter((f) => wanted.includes(path.parse(f).name)) : files;
if (targets.length === 0) console.log('nothing to process — put scans in', SRC);
for (const f of targets) await processOne(f);
```

- [ ] **Step 6: Create the source-tracking file and output dir**

```markdown
<!-- assets-src/characters/SOURCES.md -->
# Character art sources

One line per scan. Personal, non-commercial project; prefer items the
archive already tags as public domain (US ads 1928–1963 with unrenewed
copyright are PD).

| key | source URL | archive | notes |
|---|---|---|---|
```

Also: `touch public/characters/.gitkeep` (so the output dir exists before curation).

- [ ] **Step 7: Verify the script runs cleanly on an empty source dir**

Run: `node tools/process-art.mjs`
Expected: `nothing to process — put scans in assets-src/characters`

- [ ] **Step 8: Run full suite and commit**

Run: `npm test && npm run build`

```bash
git add src/ui/assets.ts tests/ui/assets.test.ts tools/process-art.mjs assets-src public/characters/.gitkeep package.json package-lock.json
git commit -m "feat: character manifest and sharp art-processing pipeline"
```

---

### Task 5: BootScene — font readiness, character preload, placeholder texture

**Files:**
- Modify: `src/ui/scenes/BootScene.ts` (full rewrite)

- [ ] **Step 1: Rewrite BootScene.ts**

```ts
import Phaser from 'phaser';
import { CHARACTERS, PLACEHOLDER_KEY } from '../assets';
import { COLORS, FONTS } from '../theme';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  preload() {
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => {
      console.warn(`character art failed to load: ${file.key} (${file.url})`);
    });
    for (const c of CHARACTERS) this.load.image(c.key, c.file);
  }

  create() {
    this.makePlaceholderTexture();
    // Wait for webfonts so Phaser never rasterizes fallback fonts into text
    // objects. fonts.ready resolves even when a font fails — safe offline.
    const ready: Promise<unknown> = document.fonts?.ready ?? Promise.resolve();
    ready.finally(() => this.scene.start('title'));
  }

  /** Cream card with a slab "?" — used when a character texture is missing. */
  private makePlaceholderTexture() {
    if (this.textures.exists(PLACEHOLDER_KEY)) return;
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(COLORS.creamHex, 1).fillRoundedRect(0, 0, 96, 128, 10);
    g.lineStyle(3, COLORS.darkHex, 1).strokeRoundedRect(2, 2, 92, 124, 10);
    const q = this.make.text(
      { x: 0, y: 0, text: '?', style: { fontFamily: FONTS.slab, fontSize: '64px', color: COLORS.dark } },
      false,
    );
    const rt = this.make.renderTexture({ x: 0, y: 0, width: 96, height: 128 }, false);
    rt.draw(g, 0, 0);
    rt.draw(q, 48 - q.width / 2, 64 - q.height / 2);
    rt.saveTexture(PLACEHOLDER_KEY);
    g.destroy();
    q.destroy();
    rt.destroy();
  }
}
```

- [ ] **Step 2: Verify build + game still boots**

Run: `npm run build`
Then: `npm run dev` and open http://localhost:5173 — title scene appears after fonts load.

- [ ] **Step 3: Commit**

```bash
git add src/ui/scenes/BootScene.ts
git commit -m "feat: BootScene loads fonts and character art with placeholder fallback"
```

---

### Task 6: CustomerView — clip-art sprite, ticket order card, starburst storm-out

**Files:**
- Modify: `src/ui/CustomerView.ts` (full rewrite)

Layout note: sprites are processed to 256px-tall sources displayed at 120px (placeholder texture is 128px, close enough to share coordinates). Origin (0.5, 1) at container origin, matching the old emoji baseline, so `GameScene.counterY()` keeps working unchanged.

- [ ] **Step 1: Rewrite CustomerView.ts**

```ts
import Phaser from 'phaser';
import type { CustomerState } from '../core/types';
import { characterKeyFor, PLACEHOLDER_KEY } from './assets';
import { COLORS, makeStarburst, makeTicket } from './theme';

const SPRITE_HEIGHT = 120;
const BAR_Y = -(SPRITE_HEIGHT + 12);
const TICKET_GAP = 30;

export class CustomerView extends Phaser.GameObjects.Container {
  readonly customerId: number;
  private bubble: Phaser.GameObjects.Container;
  private bar: Phaser.GameObjects.Graphics;
  private sprite: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, customer: CustomerState, x: number, y: number) {
    super(scene, x, y);
    this.customerId = customer.id;

    const wanted = characterKeyFor(customer.id);
    const key = scene.textures.exists(wanted) ? wanted : PLACEHOLDER_KEY;
    this.sprite = scene.add.image(0, 0, key).setOrigin(0.5, 1);
    this.sprite.setScale(SPRITE_HEIGHT / this.sprite.height);

    this.bubble = makeTicket(scene, 0, 0, customer.order.text);
    // place the ticket (its tail points down) just above the patience bar
    this.bubble.setY(BAR_Y - TICKET_GAP - this.bubble.getBounds().height / 2);

    this.bar = scene.add.graphics();
    this.add([this.bubble, this.bar, this.sprite]);
    scene.add.existing(this);

    this.setScale(0);
    scene.tweens.add({ targets: this, scale: 1, duration: 250, ease: 'Back.Out' });
  }

  setLocked(locked: boolean) {
    this.scene.tweens.add({
      targets: this.bubble,
      scaleX: locked ? 1.12 : 1,
      scaleY: locked ? 1.12 : 1,
      duration: 120,
    });
  }

  updatePatience(fraction: number) {
    const f = Math.max(0, fraction);
    const color = f > 0.5 ? 0x27ae60 : f > 0.2 ? COLORS.mustardHex : COLORS.redHex;
    this.bar.clear();
    this.bar.lineStyle(1, COLORS.darkHex, 1).strokeRect(-40, BAR_Y, 80, 8);
    this.bar.fillStyle(COLORS.darkHex, 0.15).fillRect(-40, BAR_Y, 80, 8);
    this.bar.fillStyle(color, 1).fillRect(-40, BAR_Y, 80 * f, 8);
    // jitter when about to storm out
    this.sprite.setAngle(f < 0.2 ? Math.sin(this.scene.time.now / 50) * 4 : 0);
  }

  serve(onDone: () => void) {
    this.scene.tweens.add({
      targets: this,
      y: this.y - 24,
      alpha: 0,
      duration: 350,
      onComplete: () => {
        this.destroy();
        onDone();
      },
    });
  }

  stormOut(onDone: () => void) {
    this.sprite.setTint(COLORS.redHex);
    const burst = makeStarburst(this.scene, 34, -SPRITE_HEIGHT, 22, '!!', COLORS.redHex, COLORS.cream);
    burst.setPosition(this.x + 34, this.y - SPRITE_HEIGHT);
    this.scene.tweens.add({
      targets: [this, burst],
      x: `+=${this.scene.scale.width * 0.4}`,
      alpha: 0,
      duration: 450,
      onComplete: () => {
        burst.destroy();
        this.destroy();
        onDone();
      },
    });
  }
}
```

- [ ] **Step 2: Verify build, tests, and gameplay**

Run: `npm run build && npm test`
Then: `npm run dev`, start a shift — customers appear as cream "?" placeholder cards with typewriter tickets; storming out shows red tint + "!!" burst.

- [ ] **Step 3: Commit**

```bash
git add src/ui/CustomerView.ts
git commit -m "feat: customers render as clip-art sprites with ticket order cards"
```

---

### Task 7: TitleScene poster

**Files:**
- Modify: `src/ui/scenes/TitleScene.ts` (full rewrite)

- [ ] **Step 1: Rewrite TitleScene.ts**

```ts
import Phaser from 'phaser';
import { OVERTIME, SHIFTS } from '../../core/shifts';
import { SaveStore, safeLocalStorage } from '../../persistence/storage';
import { COLORS, FONTS, makeButton, makeStarburst } from '../theme';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('title');
  }

  create() {
    const { width, height } = this.scale;
    const save = new SaveStore(safeLocalStorage()).load();
    const overtimeUnlocked = save.unlockedShift >= SHIFTS.length;

    // teal poster field with checkerboard floor strip
    this.add.rectangle(0, 0, width, height, COLORS.wall).setOrigin(0);
    this.drawCheckerboard(height - 64, 64);

    // script logo with hard offset shadow, slightly rotated
    this.add
      .text(width / 2 + 3, height * 0.2 + 3, 'Short-Order Hero', {
        fontFamily: FONTS.script,
        fontSize: '56px',
        color: COLORS.dark,
      })
      .setOrigin(0.5)
      .setAngle(-4);
    this.add
      .text(width / 2, height * 0.2, 'Short-Order Hero', {
        fontFamily: FONTS.script,
        fontSize: '56px',
        color: COLORS.red,
      })
      .setOrigin(0.5)
      .setAngle(-4);

    this.add
      .text(width / 2, height * 0.34, '★ TYPE FAST — SERVE WEIRD ★', {
        fontFamily: FONTS.sans,
        fontSize: '18px',
        fontStyle: 'bold',
        color: COLORS.dark,
      })
      .setOrigin(0.5);

    makeStarburst(this, width * 0.85, height * 0.12, 48, '24 HR\nSERVICE');

    makeButton(this, width / 2, height * 0.52, 'START SHIFT', () =>
      this.scene.start('shiftselect'),
    );
    makeButton(
      this,
      width / 2,
      height * 0.65,
      overtimeUnlocked ? 'OVERTIME' : 'OVERTIME (LOCKED)',
      () => this.scene.start('game', { config: OVERTIME }),
      overtimeUnlocked,
    );

    const best = save.highScores[OVERTIME.id];
    if (best) {
      this.add
        .text(width / 2, height * 0.76, `Overtime best: $${best}`, {
          fontFamily: FONTS.mono,
          fontSize: '17px',
          color: COLORS.dark,
        })
        .setOrigin(0.5);
    }
  }

  private drawCheckerboard(y: number, h: number) {
    const size = h / 2;
    const g = this.add.graphics();
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col * size < this.scale.width; col++) {
        g.fillStyle((row + col) % 2 === 0 ? COLORS.darkHex : COLORS.creamHex, 1);
        g.fillRect(col * size, y + row * size, size, size);
      }
    }
  }
}
```

- [ ] **Step 2: Verify visually**

Run: `npm run build`, then `npm run dev` — title shows teal poster, rotated red script logo with ink shadow, mustard starburst, checkerboard strip, slab buttons.

- [ ] **Step 3: Commit**

```bash
git add src/ui/scenes/TitleScene.ts
git commit -m "feat: Googie poster title scene"
```

---

### Task 8: ShiftSelectScene menu board

**Files:**
- Modify: `src/ui/scenes/ShiftSelectScene.ts` (full rewrite)

- [ ] **Step 1: Rewrite ShiftSelectScene.ts**

```ts
import Phaser from 'phaser';
import { SHIFTS } from '../../core/shifts';
import { SaveStore, safeLocalStorage } from '../../persistence/storage';
import { COLORS, FONTS, makeButton } from '../theme';

export class ShiftSelectScene extends Phaser.Scene {
  constructor() {
    super('shiftselect');
  }

  create() {
    const { width, height } = this.scale;
    const save = new SaveStore(safeLocalStorage()).load();

    // charcoal menu board on a teal wall
    this.add.rectangle(0, 0, width, height, COLORS.wall).setOrigin(0);
    const boardW = Math.min(520, width * 0.92);
    this.add
      .rectangle(width / 2, height / 2, boardW, height * 0.86, COLORS.hud)
      .setStrokeStyle(4, COLORS.counterEdge);

    this.add
      .text(width / 2, height * 0.13, "TODAY'S SHIFTS", {
        fontFamily: FONTS.slab,
        fontSize: '30px',
        color: COLORS.mustard,
      })
      .setOrigin(0.5);
    this.add
      .text(width / 2, height * 0.19, '— fine typing since 1955 —', {
        fontFamily: FONTS.mono,
        fontSize: '14px',
        color: COLORS.cream,
      })
      .setOrigin(0.5);

    SHIFTS.forEach((shift, i) => {
      const unlocked = i <= save.unlockedShift;
      const y = height * 0.28 + i * Math.min(76, height * 0.12);
      makeButton(this, width / 2, y, shift.name, () => this.scene.start('game', { config: shift }), unlocked);
      if (!unlocked) {
        this.add
          .text(width / 2 + 80, y - 14, "86'd", {
            fontFamily: FONTS.slab,
            fontSize: '18px',
            color: COLORS.red,
          })
          .setOrigin(0.5)
          .setAngle(-14);
      }
      const best = save.highScores[shift.id];
      if (best) {
        this.add
          .text(width / 2, y + 26, `best ......... $${best}`, {
            fontFamily: FONTS.mono,
            fontSize: '14px',
            color: COLORS.cream,
          })
          .setOrigin(0.5, 0);
      }
    });

    makeButton(this, width / 2, height * 0.9, 'BACK', () => this.scene.start('title'));
  }
}
```

- [ ] **Step 2: Verify visually**

Run: `npm run dev` — menu board panel, mustard slab heading, locked shifts get a rotated red "86'd" stamp, dot-leader best scores.

- [ ] **Step 3: Commit**

```bash
git add src/ui/scenes/ShiftSelectScene.ts
git commit -m "feat: menu-board shift select scene"
```

---

### Task 9: GameScene scenery, starburst clock, Hud and PrepStation restyle

**Files:**
- Modify: `src/ui/scenes/GameScene.ts` (drawDiner, clock, pause overlay)
- Modify: `src/ui/Hud.ts` (fonts/colors, strikes glyphs)
- Modify: `src/ui/PrepStation.ts` (palette, drawn dish)

- [ ] **Step 1: Restyle GameScene scenery and add the wall clock**

In `src/ui/scenes/GameScene.ts`:

a) Update the theme import (line 8) to:

```ts
import { COLORS, FONTS, makeStarburst } from '../theme';
```

b) Add two private fields next to the others (after line 27):

```ts
  private shiftElapsedMs = 0;
  private clockText!: Phaser.GameObjects.Text;
```

c) In `create()` after `this.engine = new ShiftEngine(...)` add `this.shiftElapsedMs = 0;`.

d) Replace `drawDiner` (lines 181–201) with:

```ts
  private drawDiner(width: number, height: number) {
    const counterY = height * COUNTER_Y_FRACTION;
    this.add.rectangle(0, 0, width, counterY, COLORS.wall).setOrigin(0);

    // neon script diner sign
    this.add
      .text(width / 2 + 2, 26, "Mel's Diner", {
        fontFamily: FONTS.script,
        fontSize: '30px',
        color: COLORS.dark,
      })
      .setOrigin(0.5, 0);
    this.add
      .text(width / 2, 24, "Mel's Diner", {
        fontFamily: FONTS.script,
        fontSize: '30px',
        color: COLORS.mustard,
      })
      .setOrigin(0.5, 0);
    this.add
      .text(width / 2, 66, this.config.name.toUpperCase(), {
        fontFamily: FONTS.sans,
        fontSize: '15px',
        fontStyle: 'bold',
        color: COLORS.cream,
      })
      .setOrigin(0.5, 0);

    // starburst wall clock (counts down the serving window)
    const clock = makeStarburst(this, width - 64, 64, 44, '');
    this.clockText = this.add
      .text(0, 0, this.formatClock(this.config.durationMs), {
        fontFamily: FONTS.sans,
        fontSize: '17px',
        fontStyle: 'bold',
        color: COLORS.dark,
      })
      .setOrigin(0.5);
    clock.add(this.clockText);

    // counter with red trim
    this.add.rectangle(0, counterY, width, 6, COLORS.redHex).setOrigin(0);
    this.add.rectangle(0, counterY + 6, width, 12, COLORS.counterEdge).setOrigin(0);
    this.add.rectangle(0, counterY + 18, width, height * 0.1, COLORS.counter).setOrigin(0);

    // checkerboard floor between counter and prep area
    const floorY = counterY + 18 + height * 0.1;
    const size = 24;
    const g = this.add.graphics();
    for (let row = 0; row * size < height * HUD_TOP_FRACTION - floorY; row++) {
      for (let col = 0; col * size < width; col++) {
        g.fillStyle((row + col) % 2 === 0 ? COLORS.darkHex : COLORS.creamHex, 1);
        g.fillRect(col * size, floorY + row * size, size, size);
      }
    }
  }

  private formatClock(remainingMs: number): string {
    const s = Math.max(0, Math.ceil(remainingMs / 1000));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }
```

e) In `update()` (line 92), accumulate time and refresh the clock — replace the method body with:

```ts
  update(_time: number, delta: number) {
    if (this.gamePaused || this.engine.isOver) return;
    this.shiftElapsedMs += delta;
    this.clockText.setText(this.formatClock(this.config.durationMs - this.shiftElapsedMs));
    this.engine.update(delta);
    for (const c of this.engine.activeCustomers) {
      this.views.get(c.id)?.updatePatience(c.patienceMs / c.patienceTotalMs);
    }
  }
```

f) In `buildPauseOverlay` (line 208), change `fontFamily: FONT` to `fontFamily: FONTS.mono` (and remove the now-unused `FONT` import if nothing else uses it).

- [ ] **Step 2: Restyle Hud.ts**

Replace the constructor text styles and `setStrikes` in `src/ui/Hud.ts`:

a) Change the import (line 2) to `import { COLORS, FONTS } from './theme';`

b) Replace constructor body styles (lines 13–27):

```ts
    this.bg = scene.add.rectangle(0, 0, 10, 10, COLORS.hud).setOrigin(0, 0);
    this.strikesText = scene.add
      .text(0, 0, '', { fontFamily: FONTS.slab, fontSize: '20px', color: COLORS.red })
      .setOrigin(0, 0.5);
    this.scoreText = scene.add
      .text(0, 0, '$ 0', { fontFamily: FONTS.sans, fontSize: '22px', fontStyle: 'bold', color: COLORS.mustard })
      .setOrigin(1, 0.5);
    this.typedText = scene.add
      .text(0, 0, '', { fontFamily: FONTS.mono, fontSize: '24px', color: COLORS.green })
      .setOrigin(0, 0.5);
    this.restText = scene.add
      .text(0, 0, '', { fontFamily: FONTS.mono, fontSize: '24px', color: '#a89c86' })
      .setOrigin(0, 0.5);
    this.orderContainer = scene.add.container(0, 0, [this.typedText, this.restText]);
    this.setStrikes(0);
```

c) Replace `setStrikes` (lines 39–41) — drawn glyphs instead of 😠 emoji:

```ts
  setStrikes(n: number) {
    this.strikesText.setText('✗'.repeat(n) + '·'.repeat(Math.max(0, 3 - n)));
  }
```

- [ ] **Step 3: Restyle PrepStation.ts**

In `src/ui/PrepStation.ts`:

a) Change the import (line 2) to `import { COLORS, FONTS, makeTicket } from './theme';`

b) Bowl colors (lines 15–16): `0xb0bec5` → `COLORS.counter`, `0x78909c` → `COLORS.counterEdge`, and give the station its spec'd ticket backdrop — replace the constructor body (lines 14–18) with:

```ts
  constructor(private scene: Phaser.Scene, private x: number, private y: number) {
    const backdrop = makeTicket(scene, 0, 0, '            \n            \n            ');
    const label = scene.add
      .text(0, -34, '★ NOW PREPARING ★', {
        fontFamily: FONTS.sans,
        fontSize: '11px',
        fontStyle: 'bold',
        color: COLORS.red,
      })
      .setOrigin(0.5);
    this.bowl = scene.add.graphics();
    this.bowl.fillStyle(COLORS.counter, 1).fillEllipse(0, 0, 150, 44);
    this.bowl.fillStyle(COLORS.counterEdge, 1).fillEllipse(0, -6, 130, 30);
    this.root = scene.add.container(x, y, [backdrop, label, this.bowl]);
  }
```

(The blank-line ticket gives the cream card sized to hold the bowl; the bowl sits on top of it. Tune the spacer string or label offset visually if the bowl overflows the card.)

c) `dropBox` label style (lines 23–31): `fontFamily: FONTS.mono`, `color: COLORS.cream`, `backgroundColor: COLORS.dark`.

d) `pourPowder` grain color (line 90): `0xfff3e0` → `COLORS.creamHex`.

e) Replace the emoji dish in `serveDish` (line 56) with a drawn plate:

```ts
  serveDish(targetX: number, targetY: number, onDone?: () => void) {
    const g = this.scene.add.graphics();
    g.fillStyle(COLORS.creamHex, 1).fillEllipse(0, 0, 56, 20);
    g.lineStyle(2, COLORS.darkHex, 1).strokeEllipse(0, 0, 56, 20);
    g.fillStyle(COLORS.redHex, 1).fillEllipse(0, -6, 28, 12);
    const dish = this.scene.add.container(this.x, this.y - 20, [g]);
    this.scene.tweens.chain({
      targets: dish,
      tweens: [
        { y: this.y - 80, duration: 180, ease: 'Quad.Out' },
        { x: targetX, y: targetY - 30, duration: 260, ease: 'Quad.In' },
        { alpha: 0, duration: 150 },
      ],
      onComplete: () => {
        dish.destroy();
        onDone?.();
      },
    });
    this.wiggle();
  }
```

- [ ] **Step 4: Verify build, tests, and play a shift**

Run: `npm run build && npm test`
Then: `npm run dev` — play one shift end to end: clock counts down, checkerboard floor, mustard score, ✗ strikes, drawn plate slides to the customer.

- [ ] **Step 5: Commit**

```bash
git add src/ui/scenes/GameScene.ts src/ui/Hud.ts src/ui/PrepStation.ts
git commit -m "feat: diner scene, starburst clock, HUD and prep station restyle"
```

---

### Task 10: ResultsScene alignment, app icon, FONT alias removal

**Files:**
- Modify: `src/ui/scenes/ResultsScene.ts`, `public/icon.svg`, `src/ui/theme.ts`

- [ ] **Step 1: Align ResultsScene typography and paper**

In `src/ui/scenes/ResultsScene.ts`:

a) Change the theme import (line 5) to `import { COLORS, FONTS, makeButton } from '../theme';`

b) Background (line 28): `COLORS.creamHex` → `COLORS.wall` (receipt paper pops on the teal wall).

c) Receipt text style (lines 48–55):

```ts
      .text(width / 2, height * 0.08, lines.join('\n'), {
        fontFamily: FONTS.mono,
        fontSize: '17px',
        color: COLORS.dark,
        backgroundColor: COLORS.cream,
        padding: { x: 18, y: 16 },
        align: 'left',
      })
```

- [ ] **Step 2: Redraw the PWA icon to match**

Replace `public/icon.svg` with:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#3fa8a1"/>
  <g transform="translate(256 236) rotate(-10)">
    <path id="burst" fill="#e3a51c" d="M0-170 24.6-138.7 61.5-156.3 71.1-119.1 112-122.1 105.1-81.7 143.8-68.1 122.4-33.2 152.2 0 122.4 33.2 143.8 68.1 105.1 81.7 112 122.1 71.1 119.1 61.5 156.3 24.6 138.7 0 170-24.6 138.7-61.5 156.3-71.1 119.1-112 122.1-105.1 81.7-143.8 68.1-122.4 33.2-152.2 0-122.4-33.2-143.8-68.1-105.1-81.7-112-122.1-71.1-119.1-61.5-156.3-24.6-138.7Z"/>
    <text x="0" y="34" text-anchor="middle" font-family="Georgia, serif" font-weight="bold" font-size="104" fill="#26221e">SOH</text>
  </g>
  <g fill="none">
    <rect x="48" y="408" width="416" height="56" fill="#f4e8cf"/>
    <rect x="48" y="408" width="52" height="56" fill="#26221e"/>
    <rect x="152" y="408" width="52" height="56" fill="#26221e"/>
    <rect x="256" y="408" width="52" height="56" fill="#26221e"/>
    <rect x="360" y="408" width="52" height="56" fill="#26221e"/>
  </g>
</svg>
```

- [ ] **Step 3: Remove the deprecated FONT alias**

Run: `grep -rn "FONT[^S]" src/ --include=*.ts` to find stragglers. Update any remaining `FONT` usages to an appropriate `FONTS.*` role (inputAdapter and core files should have none), then delete the `export const FONT = FONTS.sans;` line from `src/ui/theme.ts`.

- [ ] **Step 4: Verify build + tests**

Run: `npm run build && npm test`
Expected: clean — confirms no `FONT` references remain.

- [ ] **Step 5: Commit**

```bash
git add src/ui/scenes/ResultsScene.ts public/icon.svg src/ui/theme.ts
git commit -m "feat: receipt restyle, themed PWA icon, drop legacy FONT alias"
```

---

### Task 11: Art curation (INTERACTIVE — main session with the user)

**Files:**
- Modify: `src/ui/assets.ts` (fill `CHARACTERS`), `assets-src/characters/SOURCES.md`
- Create: `assets-src/characters/<key>.<ext>` scans, `public/characters/<key>.png` outputs

This task cannot be delegated: the user picks the cast in the visual companion.

- [ ] **Step 1: Hunt candidates**

Target cast (≥8 of): housewife, businessman, kid, grandma, cowboy, teenager, waiter/chef, robot, B-movie alien, beatnik. Search, via WebSearch/WebFetch:
- Wikimedia Commons — categories like "1950s advertisements in the United States", "Retro clip art"; prefer files tagged `PD-US-not-renewed` or `PD-US-no-notice`
- Internet Archive — 1950s magazine scans (e.g. collections `magazine_rack`, `pulpmagazinearchive`)
- Flickr Commons — "no known copyright restrictions" sets

Want: single figures, clean line/halftone art, minimal background, ≥400px tall.

- [ ] **Step 2: Present candidates in the visual companion**

Download 2–3 candidates per cast slot to `assets-src/characters/candidates/`. Write an HTML grid screen (multi-select cards, one card per candidate with the image inline) to the companion's `screen_dir`. User clicks their picks.

- [ ] **Step 3: Finalize the cast**

For each pick: rename/copy to `assets-src/characters/<key>.<ext>` (key = cast slot, e.g. `housewife.png`), delete unpicked candidates, and add a row to `SOURCES.md` with the source URL and archive.

- [ ] **Step 4: Process**

Run: `node tools/process-art.mjs`
Expected: one `processed <key>` line per scan; PNGs in `public/characters/`. Spot-check output PNGs (Read tool renders images) — figures should be charcoal ink on transparency, cleanly trimmed. If a scan keys badly (grey paper, halftone too dense), adjust `NOISE_FLOOR` or pick a different candidate.

- [ ] **Step 5: Fill the manifest**

```ts
// in src/ui/assets.ts — one entry per processed file, e.g.:
export const CHARACTERS: CharacterDef[] = [
  { key: 'housewife', file: 'characters/housewife.png' },
  { key: 'businessman', file: 'characters/businessman.png' },
  // ... one per cast member
];
```

- [ ] **Step 6: Verify**

Run: `npm test` (manifest test now checks the real files) and `npm run dev` — customers appear as vintage clip art.

- [ ] **Step 7: Commit**

```bash
git add src/ui/assets.ts assets-src public/characters
git commit -m "feat: vintage clip-art customer cast"
```

---

### Task 12: Final verification

- [ ] **Step 1: Full suite + build**

Run: `npm test && npm run build`
Expected: all green.

- [ ] **Step 2: Desktop playthrough**

`npm run dev` — title → shift select → play a full shift → results. Check: fonts correct everywhere (no Verdana), no pure-white surfaces, storm-out burst, clock reaches 0:00 and the shift still ends via the engine as before.

- [ ] **Step 3: Phone check**

`npm run dev -- --host`, open `http://<LAN-IP>:5173/` on the phone. Check: tap-to-start still works, keyboard input fine, layout/relayout intact, checkerboard and HUD legible at phone size.

- [ ] **Step 4: Wrap up**

Use superpowers:finishing-a-development-branch (or commit directly on main per repo habit — recent history commits straight to main).
