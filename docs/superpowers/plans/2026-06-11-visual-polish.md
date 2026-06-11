# Visual Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform Short-Order Hero from a tasteful prototype into a finished-looking 1950s diner by filling the empty scene, grounding the characters, moving typing feedback to where the eye looks, and layering ambient motion + print texture.

**Architecture:** All scenery is drawn procedurally with Phaser vector shapes in the existing "advertising poster" palette — no generated-art or API dependency in the default path. Pure geometry (floor perspective, clock hand, dish outline) lives in `geom.ts` and is unit-tested with Vitest; aesthetic vector builders live in a new `scenery.ts`; visuals are verified with the puppeteer screenshot tour. Phases are sequenced so layout/layering lands before the effects that depend on it.

**Tech Stack:** TypeScript, Phaser 3.90, Vite 7, Vitest 3 (happy-dom), puppeteer-core (system Chromium), sharp.

---

## Conventions for every phase

- **Run gates after each task:** `npm run build` (tsc typecheck — note `build` runs `tsc --noEmit` then `vite build`; for a fast typecheck-only loop use `npx tsc --noEmit`) and `npm test` (Vitest) must stay green.
- **Visual check:** `node tests/screenshot-tour.mjs` writes PNGs to `/tmp/claude-1000/shots`; read them to eyeball. The dev server must be running first: `npm run dev -- --port 5199 --strictPort` in the background.
- **No inline code execution** (`cat`/heredoc/`node -e`): all scripts are real files under `tests/` run by path.
- **Commits:** one per task, conventional-commit style, ending with the project's `Co-Authored-By` trailer.
- **Palette only:** import colors from `src/ui/palette.ts`; never introduce raw hexes outside it.

---

## File Structure

**New files**
- `src/ui/scenery.ts` — Phaser vector builders: `makeMenuBoard`, `makeWindowBlinds`, `makeNeonSign`, `makeCounterProp`, `makeDish`, `makePlateIcon`, `drawPerspectiveFloor`.
- `src/ui/DinerBackdrop.ts` — composes the wall scene (window, menu board, shelf, neon) into one container drawn behind gameplay.
- `src/ui/texture.ts` — `buildPaperGrain(scene)` (boot-time RenderTexture) + `applyPaperGrain(scene)` (per-scene overlay).
- `tests/ui/geom.test.ts` — extends existing geometry tests.
- `tests/ui/scenery.test.ts` — tests the pure helpers re-exported from geom.

**Modified files**
- `src/ui/geom.ts` — add `perspectiveFloorQuads`, `clockHandAngle`, `dishOutline` (pure, tested).
- `src/ui/scenes/GameScene.ts` — backdrop, floor, layering depths, clock hand, event wiring to active view, ambient loops, dish/float juice, overlay.
- `src/ui/CustomerView.ts` — bigger sprite, shadow, live ticket, idle bob, serve hop.
- `src/ui/Hud.ts` — plate-icon strikes, ticket-rail restyle; order echo removed (moved to ticket).
- `src/ui/PrepStation.ts` — steam loop, real dish via `makeDish`.
- `src/ui/theme.ts` — `makeLiveTicket` (typed/caret/untyped ticket) alongside `makeTicket`.
- `src/ui/scenes/TitleScene.ts` — cast lineup, neon-flicker logo.
- `src/ui/scenes/BootScene.ts` — build paper-grain texture.
- All scenes' `create()` — `applyPaperGrain(this)`.
- `tests/screenshot-tour.mjs` — capture each new scene state.

---

## Phase 1 — The diner interior + perspective floor

### Task 1.1: Perspective floor geometry (pure + tested)

**Files:**
- Modify: `src/ui/geom.ts`
- Test: `tests/ui/geom.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/ui/geom.test.ts
import { describe, expect, it } from 'vitest';
import { perspectiveFloorQuads } from '../../src/ui/geom';

describe('perspectiveFloorQuads', () => {
  it('returns rows*cols quads tiling a trapezoid that narrows toward the top', () => {
    const quads = perspectiveFloorQuads({
      width: 800, top: 100, bottom: 300, rows: 4, cols: 8, vanishInset: 0.25,
    });
    expect(quads).toHaveLength(4 * 8);
    // first quad sits on the back (top) row, last on the front (bottom) row
    const back = quads[0];
    const front = quads[quads.length - 1];
    expect(back.points[0].y).toBeCloseTo(100);
    expect(front.points[2].y).toBeCloseTo(300);
    // back row is inset (narrower) relative to the front row
    const backLeft = Math.min(...back.points.map((p) => p.x));
    const frontLeft = Math.min(...front.points.map((p) => p.x));
    expect(backLeft).toBeGreaterThan(frontLeft);
  });

  it('alternates the checker flag across columns and rows', () => {
    const quads = perspectiveFloorQuads({
      width: 800, top: 100, bottom: 300, rows: 2, cols: 2, vanishInset: 0.25,
    });
    expect(quads[0].dark).toBe(true);
    expect(quads[1].dark).toBe(false);
    expect(quads[2].dark).toBe(false);
    expect(quads[3].dark).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/ui/geom.test.ts`
Expected: FAIL — `perspectiveFloorQuads is not a function`.

- [ ] **Step 3: Implement `perspectiveFloorQuads` in `geom.ts`**

Append to `src/ui/geom.ts`:

```ts
export interface FloorQuad {
  points: [Point, Point, Point, Point]; // TL, TR, BR, BL
  dark: boolean;
}

export interface FloorParams {
  width: number;
  top: number;
  bottom: number;
  rows: number;
  cols: number;
  vanishInset: number; // 0..1 fraction of width the back edge is inset on each side
}

/**
 * Tile a receding checkerboard trapezoid. The back (top) edge is inset toward a
 * center vanishing line by `vanishInset`; rows are spaced with simple
 * perspective foreshortening so near rows are taller than far rows.
 */
export function perspectiveFloorQuads(p: FloorParams): FloorQuad[] {
  const quads: FloorQuad[] = [];
  // edgeAt(t): left/right x of the floor band at depth t in [0,1] (0=back,1=front)
  const inset = p.vanishInset * p.width;
  const leftAt = (t: number) => inset * (1 - t);
  const rightAt = (t: number) => p.width - inset * (1 - t);
  // foreshortened depth: rows bunch toward the back
  const depthAt = (row: number) => {
    const lin = row / p.rows;
    return lin * lin * (3 - 2 * lin); // smoothstep packs rows near the top
  };
  const yAt = (t: number) => p.top + (p.bottom - p.top) * t;

  for (let row = 0; row < p.rows; row++) {
    const t0 = depthAt(row);
    const t1 = depthAt(row + 1);
    const yTop = yAt(t0);
    const yBot = yAt(t1);
    const lTop = leftAt(t0);
    const rTop = rightAt(t0);
    const lBot = leftAt(t1);
    const rBot = rightAt(t1);
    for (let col = 0; col < p.cols; col++) {
      const cTop0 = lTop + ((rTop - lTop) * col) / p.cols;
      const cTop1 = lTop + ((rTop - lTop) * (col + 1)) / p.cols;
      const cBot0 = lBot + ((rBot - lBot) * col) / p.cols;
      const cBot1 = lBot + ((rBot - lBot) * (col + 1)) / p.cols;
      quads.push({
        points: [
          { x: cTop0, y: yTop },
          { x: cTop1, y: yTop },
          { x: cBot1, y: yBot },
          { x: cBot0, y: yBot },
        ],
        dark: (row + col) % 2 === 0,
      });
    }
  }
  return quads;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/ui/geom.test.ts`
Expected: PASS (both cases).

- [ ] **Step 5: Commit**

```bash
git add src/ui/geom.ts tests/ui/geom.test.ts
git commit -m "feat: perspective floor geometry"
```

### Task 1.2: `scenery.ts` floor + menu board + window builders

**Files:**
- Create: `src/ui/scenery.ts`

These are aesthetic Phaser builders (no unit test; verified visually). Provide complete working implementations.

- [ ] **Step 1: Create `src/ui/scenery.ts` with the floor and wall builders**

```ts
import Phaser from 'phaser';
import { COLORS } from './palette';
import { FONTS } from './theme';
import { perspectiveFloorQuads } from './geom';

const FLOOR_DARK = 0x2f6e6a;  // dark teal — recedes instead of vibrating
const FLOOR_LIGHT = COLORS.creamHex;

/** Draw a receding checker floor into a graphics object owned by the caller. */
export function drawPerspectiveFloor(
  scene: Phaser.Scene,
  topY: number,
  bottomY: number,
  width: number,
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  const quads = perspectiveFloorQuads({
    width, top: topY, bottom: bottomY, rows: 6, cols: 10, vanishInset: 0.32,
  });
  for (const q of quads) {
    g.fillStyle(q.dark ? FLOOR_DARK : FLOOR_LIGHT, 1);
    g.beginPath();
    g.moveTo(q.points[0].x, q.points[0].y);
    for (const pt of q.points.slice(1)) g.lineTo(pt.x, pt.y);
    g.closePath();
    g.fillPath();
  }
  return g;
}

/** Venetian-blind window: frame, daylight fill, slat lines. */
export function makeWindowBlinds(
  scene: Phaser.Scene, x: number, y: number, w: number, h: number,
): Phaser.GameObjects.Container {
  const frame = scene.add.rectangle(0, 0, w, h, COLORS.counterEdge).setStrokeStyle(4, COLORS.darkHex);
  const pane = scene.add.rectangle(0, 0, w - 12, h - 12, 0x5fb6af); // pale daylight teal
  const slats = scene.add.graphics();
  slats.lineStyle(2, COLORS.darkHex, 0.18);
  for (let sy = -h / 2 + 10; sy < h / 2 - 6; sy += 9) {
    slats.lineBetween(-w / 2 + 8, sy, w / 2 - 8, sy);
  }
  return scene.add.container(x, y, [frame, pane, slats]);
}

/** Wall menu board: charcoal slate, red header, mono price rows. */
export function makeMenuBoard(
  scene: Phaser.Scene, x: number, y: number,
): Phaser.GameObjects.Container {
  const w = 220;
  const h = 150;
  const board = scene.add.rectangle(0, 0, w, h, COLORS.darkHex).setStrokeStyle(5, COLORS.mustardHex);
  const header = scene.add.rectangle(0, -h / 2 + 18, w - 12, 26, COLORS.redHex);
  const title = scene.add
    .text(0, -h / 2 + 18, 'TODAY • 5¢ COFFEE', {
      fontFamily: FONTS.sans, fontSize: '13px', fontStyle: 'bold', color: COLORS.cream,
    })
    .setOrigin(0.5);
  const rows = ['BURGER ........ 25¢', 'SHAKE ......... 15¢', 'PIE ........... 10¢', 'COFFEE ........ 5¢'];
  const items = rows.map((r, i) =>
    scene.add
      .text(-w / 2 + 16, -h / 2 + 44 + i * 24, r, {
        fontFamily: FONTS.mono, fontSize: '15px', color: COLORS.cream,
      })
      .setOrigin(0, 0),
  );
  return scene.add.container(x, y, [board, header, title, ...items]);
}

/** Glowing tube sign; returns container whose first child is the tube for flicker. */
export function makeNeonSign(
  scene: Phaser.Scene, x: number, y: number, label: string,
): Phaser.GameObjects.Container {
  const tube = scene.add
    .text(0, 0, label, {
      fontFamily: FONTS.script, fontSize: '34px', color: COLORS.mustard,
    })
    .setOrigin(0.5);
  const glow = scene.add
    .text(0, 0, label, { fontFamily: FONTS.script, fontSize: '34px', color: COLORS.red })
    .setOrigin(0.5)
    .setAlpha(0.35)
    .setScale(1.08);
  return scene.add.container(x, y, [glow, tube]);
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS (no type errors).

- [ ] **Step 3: Commit**

```bash
git add src/ui/scenery.ts
git commit -m "feat: vector scenery builders (floor, window, menu, neon)"
```

### Task 1.3: `DinerBackdrop` composition

**Files:**
- Create: `src/ui/DinerBackdrop.ts`

- [ ] **Step 1: Create `src/ui/DinerBackdrop.ts`**

```ts
import Phaser from 'phaser';
import { COLORS } from './palette';
import { makeMenuBoard, makeNeonSign, makeWindowBlinds } from './scenery';

/**
 * The wall behind the counter: flat teal field, a wainscoting band at the
 * bottom, a window, a wall menu board, and a neon "EAT" sign. Drawn once and
 * left static (the neon flicker is animated separately by the scene).
 */
export class DinerBackdrop {
  readonly neon: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, width: number, wallBottom: number) {
    scene.add.rectangle(0, 0, width, wallBottom, COLORS.wall).setOrigin(0);
    // wainscoting band gives the flat wall depth
    const bandH = Math.min(46, wallBottom * 0.16);
    scene.add.rectangle(0, wallBottom - bandH, width, bandH, COLORS.wallDark).setOrigin(0);
    scene.add.rectangle(0, wallBottom - bandH, width, 3, COLORS.counterEdge).setOrigin(0);

    makeWindowBlinds(scene, width * 0.2, wallBottom * 0.42, 150, 110);
    makeMenuBoard(scene, width * 0.8, wallBottom * 0.46);
    this.neon = makeNeonSign(scene, width * 0.5, wallBottom * 0.2, 'EAT');
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/ui/DinerBackdrop.ts
git commit -m "feat: DinerBackdrop wall composition"
```

### Task 1.4: Wire backdrop + perspective floor into GameScene

**Files:**
- Modify: `src/ui/scenes/GameScene.ts` (replace `drawDiner`)

- [ ] **Step 1: Replace the wall + floor portions of `drawDiner`**

In `drawDiner(width, height)`, remove the opening `this.add.rectangle(... COLORS.wall ...)` wall fill and the entire checkerboard `for` loop at the end. Keep the sign/clock/counter strips. Replace the whole method with:

```ts
private drawDiner(width: number, height: number) {
  const counterY = height * COUNTER_Y_FRACTION;

  // wall scene (window, menu board, neon) behind everything
  this.backdrop = new DinerBackdrop(this, width, counterY);

  // existing neon script diner sign + subtitle (unchanged)
  this.add.text(width / 2 + 2, 26, "Mel's Diner", {
    fontFamily: FONTS.script, fontSize: '30px', color: COLORS.dark,
  }).setOrigin(0.5, 0);
  this.add.text(width / 2, 24, "Mel's Diner", {
    fontFamily: FONTS.script, fontSize: '30px', color: COLORS.mustard,
  }).setOrigin(0.5, 0);
  this.add.text(width / 2, 66, this.config.name.toUpperCase(), {
    fontFamily: FONTS.sans, fontSize: '15px', fontStyle: 'bold', color: COLORS.cream,
  }).setOrigin(0.5, 0);

  // starburst wall clock (unchanged build; clock hand added in Phase 4)
  const clock = makeStarburst(this, width - 64, 64, 44, '');
  this.clockText = this.add.text(0, 0, clockLabel(this.config.durationMs, this.shiftElapsedMs), {
    fontFamily: FONTS.sans, fontSize: '17px', fontStyle: 'bold', color: COLORS.dark,
  }).setOrigin(0.5);
  clock.add(this.clockText);

  // counter with red trim — given an explicit depth so it occludes customer legs
  const counterFront = this.add.container(0, 0, [
    this.add.rectangle(0, counterY, width, 6, COLORS.redHex).setOrigin(0),
    this.add.rectangle(0, counterY + 6, width, 12, COLORS.counterEdge).setOrigin(0),
    this.add.rectangle(0, counterY + 18, width, height * 0.1, COLORS.counter).setOrigin(0),
  ]).setDepth(DEPTH.counter);

  // receding checker floor between counter and HUD
  const floorY = counterY + 18 + height * 0.1;
  drawPerspectiveFloor(this, floorY, height * HUD_TOP_FRACTION, width);
}
```

Add the imports at the top of the file:

```ts
import { DinerBackdrop } from '../DinerBackdrop';
import { drawPerspectiveFloor } from '../scenery';
```

Add a field on the class:

```ts
private backdrop!: DinerBackdrop;
```

Add a depth constants object near the top of the file (used across phases):

```ts
const DEPTH = { backdrop: 0, customer: 5, counter: 10, prep: 12, hud: 20, overlay: 100 } as const;
```

(Delete the placeholder line from Step 1's note — `COLORS_COUNTER_FRACTION_REMOVED_PLACEHOLDER` is not real; `counterY` is computed from `COUNTER_Y_FRACTION` as shown.)

- [ ] **Step 2: Typecheck + build**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Visual check**

Start dev server (background): `npm run dev -- --port 5199 --strictPort`
Run: `node tests/screenshot-tour.mjs`
Read `/tmp/claude-1000/shots/3-game-early.png` — expect a window, menu board, neon EAT on the wall, and a receding (non-buzzing) floor. The upper teal void should be filled.

- [ ] **Step 4: Commit**

```bash
git add src/ui/scenes/GameScene.ts
git commit -m "feat: diner backdrop and perspective floor in GameScene"
```

---

## Phase 2 — Character presence

### Task 2.1: Enlarge sprite, add contact shadow, depth band

**Files:**
- Modify: `src/ui/CustomerView.ts`
- Modify: `src/ui/scenes/GameScene.ts` (set customer depth)

- [ ] **Step 1: In `CustomerView.ts`, grow the sprite and add a shadow**

Change `const SPRITE_HEIGHT = 120;` to `const SPRITE_HEIGHT = 190;`.

In the constructor, before creating the sprite, add an elliptical shadow as the first child so it sits under everything:

```ts
const shadow = scene.add.graphics();
shadow.fillStyle(COLORS.darkHex, 0.22);
shadow.fillEllipse(0, -2, SPRITE_HEIGHT * 0.5, 14);
```

Then change the `this.add([...])` call to include the shadow first:

```ts
this.add([shadow, this.bubble, this.bar, this.sprite]);
```

- [ ] **Step 2: In `GameScene.wireEngineEvents`, give each new view a depth band**

In the `customerArrived` handler, after constructing `view`:

```ts
view.setDepth(DEPTH.customer);
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Visual check**

Run: `node tests/screenshot-tour.mjs`
Read `/tmp/claude-1000/shots/5-game-later.png` — customers are larger, cast a shadow, and the counter front strip now crosses in front of their lower body (legs hidden behind the counter). The patience bar/ticket still sit above their heads.

- [ ] **Step 5: Commit**

```bash
git add src/ui/CustomerView.ts src/ui/scenes/GameScene.ts
git commit -m "feat: ground and enlarge customers behind the counter"
```

---

## Phase 3 — Typing feedback on the ticket

### Task 3.1: `makeLiveTicket` with typed/caret/untyped text

**Files:**
- Modify: `src/ui/theme.ts`

- [ ] **Step 1: Add `makeLiveTicket` to `theme.ts`**

```ts
export interface LiveTicket {
  container: Phaser.GameObjects.Container;
  /** Re-render with the first `typedCount` chars green and a caret after them. */
  update(typedCount: number): void;
}

/** Order ticket whose text shows typed (green) vs remaining (ink) with a caret. */
export function makeLiveTicket(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  maxWidth = 220,
): LiveTicket {
  const style = { fontFamily: FONTS.mono, fontSize: '17px', align: 'center' as const };
  const typed = scene.add.text(0, 0, '', { ...style, color: COLORS.green }).setOrigin(0, 0.5);
  const caret = scene.add.text(0, 0, '_', { ...style, color: COLORS.red }).setOrigin(0, 0.5);
  const rest = scene.add.text(0, 0, text, { ...style, color: COLORS.dark }).setOrigin(0, 0.5);

  const w = Math.min(maxWidth, rest.width + 28);
  const h = rest.height + 16;
  const shadow = scene.add.rectangle(3, 3, w, h, COLORS.darkHex, 0.35).setOrigin(0.5);
  const tail = scene.add.triangle(0, h / 2 + 4, 0, 0, 14, 0, 7, 9, COLORS.darkHex).setOrigin(0.5, 0);
  const paper = scene.add.rectangle(0, 0, w, h, COLORS.creamHex).setStrokeStyle(2, COLORS.darkHex).setOrigin(0.5);
  const textGroup = scene.add.container(0, 0, [typed, caret, rest]);
  const container = scene.add.container(x, y, [shadow, tail, paper, textGroup]);

  function update(typedCount: number) {
    const done = text.slice(0, typedCount);
    const remaining = text.slice(typedCount);
    typed.setText(done);
    rest.setText(remaining);
    const total = typed.width + caret.width + rest.width;
    const startX = -total / 2;
    typed.setX(startX);
    caret.setX(startX + typed.width);
    rest.setX(startX + typed.width + caret.width);
    // pop the last typed glyph
    if (typedCount > 0) {
      scene.tweens.add({ targets: typed, scaleX: 1.0, scaleY: 1.0, duration: 1 });
      scene.tweens.add({
        targets: textGroup, scaleX: 1.06, scaleY: 1.06, duration: 60, yoyo: true,
      });
    }
  }
  update(0);
  return { container, update };
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/ui/theme.ts
git commit -m "feat: makeLiveTicket with typed/caret/untyped rendering"
```

### Task 3.2: CustomerView uses the live ticket

**Files:**
- Modify: `src/ui/CustomerView.ts`

- [ ] **Step 1: Swap `makeTicket` for `makeLiveTicket` and expose `updateTyping`**

Change the import:

```ts
import { COLORS, makeLiveTicket, makeStarburst, type LiveTicket } from './theme';
```

Replace the `bubble` field type and its construction:

```ts
private ticket: LiveTicket;
```

In the constructor, replace the `this.bubble = makeTicket(...)` block with:

```ts
this.ticket = makeLiveTicket(scene, 0, 0, customer.order.text);
this.ticket.container.setY(BAR_Y - TICKET_GAP - this.ticket.container.getBounds().height / 2);
```

Update every reference from `this.bubble` to `this.ticket.container` (in `this.add([...])`, `setLocked`). Add the method:

```ts
updateTyping(typedCount: number) {
  this.ticket.update(typedCount);
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/ui/CustomerView.ts
git commit -m "feat: customers show live typing on their ticket"
```

### Task 3.3: Route engine events to the active view; retire HUD echo

**Files:**
- Modify: `src/ui/scenes/GameScene.ts`
- Modify: `src/ui/Hud.ts`

- [ ] **Step 1: In `GameScene.wireEngineEvents`, drive the customer's ticket**

In `orderProgress`, replace the `this.hud.showOrder(...)` call with:

```ts
this.views.get(customerId)?.updateTyping(typedCount);
```

In `orderLocked`, replace `this.hud.showOrder(...)` with:

```ts
this.views.get(customerId)?.updateTyping(this.engine.typedCount);
```

In `wordCompleted`, replace the `this.hud.showOrder(...)` line with:

```ts
this.views.get(customerId)?.updateTyping(this.engine.typedCount);
```

In `orderServed` and `customerLeft`, delete the `this.hud.showOrder('', 0)` calls (the ticket leaves with the customer).

- [ ] **Step 2: Remove `showOrder` and order text from `Hud`**

In `Hud.ts`, delete `typedText`, `restText`, `orderContainer`, `showOrder`, `centerOrder`, and their layout lines. Keep `strikesText`, `scoreText`, `bg`, `setStrikes`, `setScore`, `flashMistake` (retarget `flashMistake` to shake `this.scoreText` instead of the removed `orderContainer`). The HUD bar now shows only strikes (left) and score (right).

- [ ] **Step 3: Typecheck + tests**

Run: `npx tsc --noEmit && npm test`
Expected: PASS (smoke + core tests unaffected).

- [ ] **Step 4: Visual check**

Update `tests/screenshot-tour.mjs` so shot 4 types `toas` then shot of the active customer shows green `toas` + red caret + ink `t` on the ticket. Run `node tests/screenshot-tour.mjs` and read shot 4.

- [ ] **Step 5: Commit**

```bash
git add src/ui/scenes/GameScene.ts src/ui/Hud.ts tests/screenshot-tour.mjs
git commit -m "feat: move typing feedback onto the customer ticket"
```

---

## Phase 4 — Ambient motion

### Task 4.1: Clock-hand angle (pure + tested) and ticking hand

**Files:**
- Modify: `src/ui/geom.ts`
- Test: `tests/ui/geom.test.ts`
- Modify: `src/ui/scenes/GameScene.ts`

- [ ] **Step 1: Write the failing test**

Append to `tests/ui/geom.test.ts`:

```ts
import { clockHandAngle } from '../../src/ui/geom';

describe('clockHandAngle', () => {
  it('is -90deg (straight up) at the start and sweeps clockwise', () => {
    expect(clockHandAngle(0, 60000)).toBeCloseTo(-90);
    expect(clockHandAngle(15000, 60000)).toBeCloseTo(0);   // quarter -> right
    expect(clockHandAngle(30000, 60000)).toBeCloseTo(90);  // half -> down
  });
  it('wraps each minute of the remaining window', () => {
    expect(clockHandAngle(60000, 60000)).toBeCloseTo(-90);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/ui/geom.test.ts`
Expected: FAIL — `clockHandAngle is not a function`.

- [ ] **Step 3: Implement `clockHandAngle`**

Append to `src/ui/geom.ts`:

```ts
/** Degrees for a sweeping second hand: -90 (up) at t=0, clockwise, wraps each `period` ms. */
export function clockHandAngle(elapsedMs: number, periodMs: number): number {
  const frac = ((elapsedMs % periodMs) + periodMs) % periodMs / periodMs;
  return -90 + frac * 360;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/ui/geom.test.ts`
Expected: PASS.

- [ ] **Step 5: Add a hand to the starburst clock in GameScene**

In `drawDiner`, after building `clock`, add a hand line and store it:

```ts
this.clockHand = this.add.graphics();
this.clockHand.lineStyle(2, COLORS.redHex, 1).lineBetween(0, 0, 0, -30);
clock.add(this.clockHand);
```

Add field: `private clockHand!: Phaser.GameObjects.Graphics;`
Import `clockHandAngle` from `../geom`.
In `update()`, after updating `clockText`, add:

```ts
this.clockHand.setAngle(clockHandAngle(this.shiftElapsedMs, 60000) + 90);
```

- [ ] **Step 6: Typecheck + tests + commit**

Run: `npx tsc --noEmit && npm test`
Expected: PASS.

```bash
git add src/ui/geom.ts tests/ui/geom.test.ts src/ui/scenes/GameScene.ts
git commit -m "feat: ticking clock hand on the starburst clock"
```

### Task 4.2: Idle bob, steam, neon flicker

**Files:**
- Modify: `src/ui/CustomerView.ts`, `src/ui/PrepStation.ts`, `src/ui/scenes/GameScene.ts`

- [ ] **Step 1: Customer idle bob**

In `CustomerView` constructor, after the entry tween, add a looping bob on the sprite with a per-customer phase offset:

```ts
scene.tweens.add({
  targets: this.sprite, y: '-=4', duration: 1100 + (customer.id % 5) * 90,
  yoyo: true, repeat: -1, ease: 'Sine.InOut',
});
```

- [ ] **Step 2: Prep steam loop**

In `PrepStation` constructor, store the scene and start a recurring steam timer:

```ts
scene.time.addEvent({ delay: 900, loop: true, callback: () => this.steam() });
```

Add the method:

```ts
private steam() {
  const wisp = this.scene.add.circle(this.x + Phaser.Math.Between(-16, 16), this.y - 30, 4, COLORS.creamHex, 0.5);
  this.scene.tweens.add({
    targets: wisp, y: this.y - 90, alpha: 0, scale: 1.8, duration: 1400, ease: 'Sine.Out',
    onComplete: () => wisp.destroy(),
  });
}
```

- [ ] **Step 3: Neon flicker**

In `GameScene.create`, after `drawDiner`, start an occasional flicker on the backdrop neon:

```ts
this.time.addEvent({
  delay: 2600, loop: true, callback: () => {
    this.tweens.add({ targets: this.backdrop.neon, alpha: 0.35, duration: 60, yoyo: true, repeat: 1 });
  },
});
```

- [ ] **Step 4: Typecheck + visual check + commit**

Run: `npx tsc --noEmit`
Expected: PASS. (Motion is not captured well by a single screenshot; confirm no console errors via the tour run.)

```bash
git add src/ui/CustomerView.ts src/ui/PrepStation.ts src/ui/scenes/GameScene.ts
git commit -m "feat: idle bob, prep steam, neon flicker"
```

---

## Phase 5 — Counter dressing + juice

### Task 5.1: Dish outline (pure + tested) and `makeDish`

**Files:**
- Modify: `src/ui/geom.ts`, `tests/ui/geom.test.ts`, `src/ui/scenery.ts`

- [ ] **Step 1: Failing test for `dishOutline`**

Append to `tests/ui/geom.test.ts`:

```ts
import { dishOutline } from '../../src/ui/geom';

describe('dishOutline', () => {
  it('returns a closed plate ring wider than tall', () => {
    const pts = dishOutline(60);
    expect(pts.length).toBeGreaterThan(8);
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(Math.max(...ys) - Math.min(...ys));
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run tests/ui/geom.test.ts`
Expected: FAIL — `dishOutline is not a function`.

- [ ] **Step 3: Implement `dishOutline`**

Append to `src/ui/geom.ts`:

```ts
/** Flattened-ellipse plate ring sampled as points (radius = plate half-width). */
export function dishOutline(radius: number, samples = 16): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i < samples; i++) {
    const a = (i / samples) * Math.PI * 2;
    pts.push({ x: Math.cos(a) * radius, y: Math.sin(a) * radius * 0.36 });
  }
  return pts;
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/ui/geom.test.ts`
Expected: PASS.

- [ ] **Step 5: Add `makeDish` and `makeCounterProp`, `makePlateIcon` to `scenery.ts`**

```ts
import { dishOutline } from './geom';

/** A plated burger/shake that pops out of the bowl. */
export function makeDish(scene: Phaser.Scene, x: number, y: number): Phaser.GameObjects.Container {
  const plate = scene.add.graphics();
  const ring = dishOutline(30).map((p) => new Phaser.Math.Vector2(p.x, p.y));
  plate.fillStyle(COLORS.creamHex, 1).fillPoints(ring, true);
  plate.lineStyle(2, COLORS.darkHex, 1).strokePoints(ring, true);
  const food = scene.add.graphics();
  food.fillStyle(COLORS.redHex, 1).fillEllipse(0, -5, 30, 13);   // patty
  food.fillStyle(COLORS.mustardHex, 1).fillEllipse(0, -10, 24, 8); // bun top
  return scene.add.container(x, y, [plate, food]);
}

/** Small counter prop selected by index (ketchup, napkins, cake stand, cup). */
export function makeCounterProp(scene: Phaser.Scene, x: number, y: number, kind: number): Phaser.GameObjects.Container {
  const g = scene.add.graphics();
  switch (kind % 4) {
    case 0: // ketchup bottle
      g.fillStyle(COLORS.redHex, 1).fillRoundedRect(-6, -22, 12, 22, 3);
      g.fillStyle(COLORS.darkHex, 1).fillRect(-3, -28, 6, 6);
      break;
    case 1: // napkin dispenser
      g.fillStyle(COLORS.counterEdge, 1).fillRect(-12, -14, 24, 14);
      g.fillStyle(COLORS.creamHex, 1).fillRect(-3, -20, 6, 8);
      break;
    case 2: // cake stand
      g.fillStyle(COLORS.creamHex, 1).fillEllipse(0, 0, 34, 8);
      g.fillStyle(COLORS.mustardHex, 1).fillTriangle(-12, 0, 12, 0, 0, -20);
      break;
    default: // coffee cup
      g.fillStyle(COLORS.creamHex, 1).fillRoundedRect(-8, -12, 16, 12, 2);
      g.lineStyle(2, COLORS.darkHex, 1).strokeCircle(11, -6, 4);
      break;
  }
  return scene.add.container(x, y, [g]);
}

/** A plate icon for the strike counter; `cracked` greys + splits it. */
export function makePlateIcon(scene: Phaser.Scene, x: number, y: number, cracked: boolean): Phaser.GameObjects.Container {
  const g = scene.add.graphics();
  g.fillStyle(cracked ? COLORS.disabledHex : COLORS.creamHex, 1).fillCircle(0, 0, 9);
  g.lineStyle(2, COLORS.darkHex, 1).strokeCircle(0, 0, 9);
  if (cracked) g.lineStyle(2, COLORS.redHex, 1).lineBetween(-6, -4, 5, 6);
  return scene.add.container(x, y, [g]);
}
```

- [ ] **Step 6: Typecheck + tests + commit**

Run: `npx tsc --noEmit && npm test`
Expected: PASS.

```bash
git add src/ui/geom.ts tests/ui/geom.test.ts src/ui/scenery.ts
git commit -m "feat: dish, counter props, and plate-icon builders"
```

### Task 5.2: Real dish on serve + counter props + "+$N" float

**Files:**
- Modify: `src/ui/PrepStation.ts`, `src/ui/scenes/GameScene.ts`

- [ ] **Step 1: Use `makeDish` in `serveDish`**

In `PrepStation.serveDish`, replace the `g`/graphics ellipse dish with:

```ts
const dish = makeDish(this.scene, this.x, this.y - 20);
```

Remove the old `g` graphics block and the `[g]` container wrap; tween `dish` directly as before (the chain already targets `dish`). Import `makeDish` from `./scenery`. Add a squash on the first hop:

```ts
this.scene.tweens.add({ targets: dish, scaleX: 1.15, scaleY: 0.85, duration: 120, yoyo: true });
```

- [ ] **Step 2: Counter props in GameScene**

In `drawDiner`, after building the counter front, scatter four props along it:

```ts
const propY = counterY + 14;
[0.12, 0.34, 0.66, 0.88].forEach((fx, i) =>
  makeCounterProp(this, width * fx, propY, i).setDepth(DEPTH.counter + 1),
);
```

Import `makeCounterProp` from `../scenery`.

- [ ] **Step 3: "+$N" float on serve**

The `orderServed` event already carries the tip (`shiftEngine.ts:151` emits `{ customerId, tip, finalWordIndex }`). Add `tip` to the handler's destructured params and float it up from the customer. After `this.hud.setScore(...)`:

```ts
const tipLabel = this.add.text(tx, ty - 40, `+$${tip}`, {
  fontFamily: FONTS.slab, fontSize: '22px', color: COLORS.mustard,
}).setOrigin(0.5).setDepth(DEPTH.hud);
this.tweens.add({ targets: tipLabel, y: ty - 90, alpha: 0, duration: 700, onComplete: () => tipLabel.destroy() });
```

The handler signature becomes `e.on('orderServed', ({ customerId, tip, finalWordIndex }) => { ... })`.

- [ ] **Step 4: Typecheck + visual check + commit**

Run: `npx tsc --noEmit`
Expected: PASS. Run the tour; read shot 5 — a real plated dish and counter props visible.

```bash
git add src/ui/PrepStation.ts src/ui/scenes/GameScene.ts
git commit -m "feat: plated dish, counter props, tip float on serve"
```

### Task 5.3: Strikes as cracking plates + HUD rail

**Files:**
- Modify: `src/ui/Hud.ts`

- [ ] **Step 1: Replace text strikes with plate icons**

In `Hud`, replace `strikesText` with a container of three plate icons. Store `private plates: Phaser.GameObjects.Container[]`. Build them in the constructor with `makePlateIcon(scene, 16 + i*24, 0, false)` added to a `strikeRow` container. In `setStrikes(n)`, redraw: destroy the row's children and re-add three icons, the first `n` cracked.

```ts
setStrikes(n: number) {
  this.strikeRow.removeAll(true);
  for (let i = 0; i < 3; i++) {
    this.strikeRow.add(makePlateIcon(this.scene, i * 24, 0, i < n));
  }
}
```

In `layout`, position `this.strikeRow.setPosition(20, cy)` instead of `strikesText`. Import `makePlateIcon` from `./scenery`.

- [ ] **Step 2: Restyle the HUD bar as a metal rail**

In the constructor, set the bar fill to `COLORS.hud` (already) and add a mustard top edge line so it reads as a rail:

```ts
this.rail = scene.add.rectangle(0, 0, 10, 3, COLORS.mustardHex).setOrigin(0, 0);
```

In `layout`, position `this.rail.setPosition(0, hudTop).setSize(width, 3)`.

- [ ] **Step 3: Typecheck + tests + visual check + commit**

Run: `npx tsc --noEmit && npm test`
Expected: PASS.

```bash
git add src/ui/Hud.ts
git commit -m "feat: cracking-plate strikes and HUD rail"
```

---

## Phase 6 — Print-texture overlay

### Task 6.1: Paper-grain texture build + apply

**Files:**
- Create: `src/ui/texture.ts`
- Modify: `src/ui/scenes/BootScene.ts`, all five scenes' `create()`

- [ ] **Step 1: Create `src/ui/texture.ts`**

```ts
import Phaser from 'phaser';

const KEY = 'paper-grain';
const TILE = 256;

/** Build a tiling low-contrast speckle texture once (idempotent). */
export function buildPaperGrain(scene: Phaser.Scene): void {
  if (scene.textures.exists(KEY)) return;
  const rt = scene.make.renderTexture({ x: 0, y: 0, width: TILE, height: TILE }, false);
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  for (let i = 0; i < 1400; i++) {
    const a = Phaser.Math.FloatBetween(0.02, 0.07);
    g.fillStyle(0x000000, a);
    g.fillRect(Phaser.Math.Between(0, TILE), Phaser.Math.Between(0, TILE), 1, 1);
  }
  rt.draw(g, 0, 0);
  rt.saveTexture(KEY);
  g.destroy();
  rt.destroy();
}

/** Overlay the grain across the whole canvas with multiply blend. */
export function applyPaperGrain(scene: Phaser.Scene): Phaser.GameObjects.TileSprite {
  const { width, height } = scene.scale;
  const grain = scene.add
    .tileSprite(0, 0, width, height, KEY)
    .setOrigin(0)
    .setDepth(1000)
    .setBlendMode(Phaser.BlendModes.MULTIPLY)
    .setAlpha(0.5);
  grain.setActive(false);
  scene.scale.on(Phaser.Scale.Events.RESIZE, () => grain.setSize(scene.scale.width, scene.scale.height));
  return grain;
}
```

- [ ] **Step 2: Build at boot**

In `BootScene.create`, before starting the title scene, call `buildPaperGrain(this);` (import it). It must run before any scene applies it.

- [ ] **Step 3: Apply in each scene**

At the end of `create()` in `TitleScene`, `ShiftSelectScene`, `GameScene`, `ResultsScene`, add `applyPaperGrain(this);` (import it). In `GameScene`, ensure the pause overlay depth (`setDepth(100)`) is below the grain's 1000 so the grain does not darken the pause text excessively — set the grain alpha to 0.4 there if needed, or apply grain before building the pause overlay so the overlay renders on top. Apply grain **before** `buildPauseOverlay` and bump the pause overlay to `setDepth(DEPTH.overlay + 1000)`.

- [ ] **Step 4: Typecheck + visual check + commit**

Run: `npx tsc --noEmit`
Expected: PASS. Run the tour; read shots 1 and 5 — a subtle print grain over everything, text still legible. If text is muddy, lower alpha to 0.35.

```bash
git add src/ui/texture.ts src/ui/scenes/BootScene.ts src/ui/scenes/TitleScene.ts src/ui/scenes/ShiftSelectScene.ts src/ui/scenes/GameScene.ts src/ui/scenes/ResultsScene.ts
git commit -m "feat: print-grain overlay across all scenes"
```

---

## Phase 7 — Title screen as a poster

### Task 7.1: Cast lineup + neon-flicker logo

**Files:**
- Modify: `src/ui/scenes/TitleScene.ts`

- [ ] **Step 1: Line the cast along the checkerboard strip**

In `TitleScene.create`, after `drawCheckerboard`, add up to five cast members standing on the strip (textures already loaded in BootScene; guard with `textures.exists`):

```ts
import { CHARACTERS, PLACEHOLDER_KEY } from '../assets';
// ...
const lineup = CHARACTERS.slice(0, 5);
lineup.forEach((c, i) => {
  const key = this.textures.exists(c.key) ? c.key : PLACEHOLDER_KEY;
  const x = width * (0.16 + 0.17 * i);
  const img = this.add.image(x, height - 60, key).setOrigin(0.5, 1);
  img.setScale(Math.min(1, 150 / img.height));
  this.tweens.add({ targets: img, y: height - 64, duration: 1200 + i * 120, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
});
```

- [ ] **Step 2: Neon flicker on the script logo**

Capture the red foreground logo text in a `const logo = this.add.text(...)` (it currently is anonymous). After creating it, flicker occasionally:

```ts
this.time.addEvent({
  delay: 3000, loop: true,
  callback: () => this.tweens.add({ targets: logo, alpha: 0.4, duration: 70, yoyo: true, repeat: 1 }),
});
```

- [ ] **Step 3: Typecheck + visual check + commit**

Run: `npx tsc --noEmit`
Expected: PASS. Run the tour; read shot 1 — cast lined up along the bottom, logo present.

```bash
git add src/ui/scenes/TitleScene.ts
git commit -m "feat: title screen cast lineup and neon-flicker logo"
```

---

## Final verification

- [ ] `npm run build` (full tsc + vite build) succeeds.
- [ ] `npm test` green (core, smoke, new geom/scenery tests).
- [ ] Full screenshot tour read end-to-end: title (poster), shift select, game (full room, grounded customers, live ticket, dish, plates), all under print grain.
- [ ] Squash-merge the branch per `superpowers:finishing-a-development-branch`.

---

## Optional enhancement (separate, not in this plan's default path)

Generate a wide wall mural via `tools/recraft-gen.mjs` in the established monochrome ink style, process it to ink-on-transparent with a wide-image variant of `tools/process-art.mjs`, add a `BACKGROUNDS` manifest to `src/ui/assets.ts` (BootScene already tolerates load errors), and draw it over the Phase 1 vector backdrop. Requires `RECRAFT_API_KEY` + manual candidate review — track as its own task.
