# Phone Visual Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the frozen phone game-state read clearly on a narrow screen — bigger order bubbles, a real stove with a red pan, the receipt spike and a vintage cash register flanking the stove, no bottom black bar, and the neon marquee pulled clear of the strike plates.

**Architecture:** Pure presentation changes in the Phaser UI layer. Score display moves from the removed bottom HUD bar into a new cash-register scenery piece whose value `GameScene` drives. No engine, scoring, persistence, or typing-logic changes. Geometry/layout is verified by rebuilding the self-contained demo and taking a headless screenshot (`demo/shoot.mjs`) — there is no Phaser scene unit-test harness in this repo (only pure helpers under `tests/` are unit-tested).

**Tech Stack:** TypeScript, Phaser 3, Vite, vitest (pure helpers only), puppeteer-core (headless screenshot).

Spec: `docs/superpowers/specs/2026-06-15-phone-visual-polish-design.md`

---

## File Structure

- `src/ui/scenes/ShiftSelectScene.ts` — high-score line uses `formatMoney` (Task 1, already applied).
- `src/ui/theme.ts` — `makeLiveTicket` base font size up (Task 2).
- `src/ui/CustomerView.ts` — bubble scales on an independent floor from the customer sprite (Task 2).
- `src/ui/scenery.ts` — new `makeCashRegister` line-art piece (Task 3).
- `src/ui/PrepStation.ts` — bowl graphic becomes a stove top with a red pan (Task 4).
- `src/ui/Hud.ts` — stripped to strikes-only (Task 5).
- `src/ui/DinerBackdrop.ts` — wall furniture anchors pulled down (Task 5).
- `src/ui/scenes/GameScene.ts` — vertical re-layout, register placement + score wiring, spike relocation, mistake-flash retarget (Task 5).
- `demo/*` — rebuild artifacts + screenshot verification (Task 6).

---

### Task 1: High-score formatting fix (already applied — commit it)

The bug: `ShiftSelectScene` printed the raw cents value behind a literal `$`, so a best of `1875` cents showed as `$1875`. Fix already made in the working tree: imported `formatMoney` and changed the line to `` `best ......... ${formatMoney(best)}` ``.

**Files:**
- Modify: `src/ui/scenes/ShiftSelectScene.ts` (done)

- [ ] **Step 1: Confirm the change is present**

Run: `git diff src/ui/scenes/ShiftSelectScene.ts`
Expected: the import of `formatMoney` and the `formatMoney(best)` interpolation.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/ui/scenes/ShiftSelectScene.ts
git commit -m "fix: show shift-select high scores via formatMoney (cents, not raw \$)"
```

---

### Task 2: Bigger order bubbles, scaled independently from the customer

Raise the live-ticket font, and floor the bubble's on-screen scale so it stays legible when the customer sprite shrinks to `uiScale = 0.5` on a phone. The customer container still scales to `uiScale`; only the detached ticket gets the floor.

**Files:**
- Modify: `src/ui/theme.ts` (`makeLiveTicket`)
- Modify: `src/ui/CustomerView.ts`

- [ ] **Step 1: Enlarge the live-ticket font**

In `src/ui/theme.ts`, in `makeLiveTicket`, change the style font size and widen the wrap cap so longer orders still fit the bigger glyphs:

```ts
export function makeLiveTicket(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  maxWidth = 280,
): LiveTicket {
  const style = { fontFamily: FONTS.mono, fontSize: '22px', align: 'center' as const };
```

(Only the `maxWidth` default and `fontSize` change; the rest of the function is unchanged.)

- [ ] **Step 2: Give the ticket an independent scale floor in CustomerView**

In `src/ui/CustomerView.ts`, add a minimum-scale constant near the top constants and a helper, then use it everywhere the ticket container is scaled. Replace the top constants block:

```ts
const SPRITE_HEIGHT = 175;
const BAR_Y = -(SPRITE_HEIGHT + 12);
const TICKET_GAP = 30;
// The customer sprite may shrink to uiScale 0.5 on a phone, but the order
// bubble must stay readable, so the ticket scales on its own higher floor.
const MIN_TICKET_SCALE = 0.78;
```

Add this method to the class (e.g. just below `setUiScale`):

```ts
/** Bubble scale: customer uiScale, but never below a legible floor. */
private ticketScale(): number {
  return Math.max(this.uiScale, MIN_TICKET_SCALE);
}
```

- [ ] **Step 3: Anchor the (now larger) bubble above the patience bar deterministically**

Still in `src/ui/CustomerView.ts`, the existing `baseOffsetY` was measured at scale 1 and multiplied by `uiScale`, which no longer matches a bubble scaled on its own floor. Replace the offset field with the ticket's half-height-at-scale-1 plus the stagger, and recompute placement from world-space anchors.

Replace the field declaration:

```ts
  private baseOffsetY: number;
```

with:

```ts
  private ticketHalf1: number; // ticket half-height measured at scale 1
  private ticketStaggerPx: number;
```

In the constructor, replace the `this.baseOffsetY = ...` line:

```ts
    this.baseOffsetY = BAR_Y - TICKET_GAP - this.ticket.container.getBounds().height / 2 + ticketStaggerPx;
```

with:

```ts
    this.ticketHalf1 = this.ticket.container.getBounds().height / 2;
    this.ticketStaggerPx = ticketStaggerPx;
```

Replace the constructor's two ticket-scale lines:

```ts
    this.ticket.setBaseScale(uiScale);
    this.ticket.container.setDepth(ticketDepth).setScale(0);
```

with:

```ts
    this.ticket.setBaseScale(this.ticketScale());
    this.ticket.container.setDepth(ticketDepth).setScale(0);
```

and the intro tween for the ticket:

```ts
    scene.tweens.add({ targets: this.ticket.container, scale: uiScale, duration: 250, ease: 'Back.Out' });
```

with:

```ts
    scene.tweens.add({ targets: this.ticket.container, scale: this.ticketScale(), duration: 250, ease: 'Back.Out' });
```

Replace `positionTicket`:

```ts
  private positionTicket = () => {
    this.ticket.container.setPosition(this.x, this.y + this.baseOffsetY * this.uiScale);
    this.ticket.container.setAlpha(this.alpha);
  };
```

with (anchor above the patience bar, accounting for the bubble's own scale):

```ts
  private positionTicket = () => {
    const barTopWorld = this.y + BAR_Y * this.uiScale;
    const y =
      barTopWorld -
      TICKET_GAP * this.uiScale -
      this.ticketHalf1 * this.ticketScale() +
      this.ticketStaggerPx * this.uiScale;
    this.ticket.container.setPosition(this.x, y);
    this.ticket.container.setAlpha(this.alpha);
  };
```

- [ ] **Step 4: Use the floor in setUiScale and setLocked**

Replace `setUiScale`:

```ts
  setUiScale(s: number) {
    this.uiScale = s;
    this.setScale(s);
    this.ticket.setBaseScale(s);
    this.ticket.container.setScale(this.locked ? s * 1.12 : s);
    this.positionTicket();
  }
```

with:

```ts
  setUiScale(s: number) {
    this.uiScale = s;
    this.setScale(s);
    const ts = this.ticketScale();
    this.ticket.setBaseScale(ts);
    this.ticket.container.setScale(this.locked ? ts * 1.12 : ts);
    this.positionTicket();
  }
```

Replace the `setLocked` tween targets `uiScale` with `this.ticketScale()`:

```ts
  setLocked(locked: boolean) {
    this.locked = locked;
    this.ticket.container.setDepth(locked ? this.activeTicketDepth : this.ticketDepth);
    const ts = this.ticketScale();
    this.scene.tweens.add({
      targets: this.ticket.container,
      scaleX: locked ? ts * 1.12 : ts,
      scaleY: locked ? ts * 1.12 : ts,
      duration: 120,
    });
  }
```

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors (no remaining references to `baseOffsetY`).

- [ ] **Step 6: Commit**

```bash
git add src/ui/theme.ts src/ui/CustomerView.ts
git commit -m "feat: larger order bubbles with an independent scale floor on phones"
```

---

### Task 3: Vintage cash-register scenery piece

Add a self-contained line-art cash register to `scenery.ts`. It returns both its container (so the scene can position/scale it) and its display-window text (so the scene can update the running score). Not wired in yet — pure addition, must still build.

**Files:**
- Modify: `src/ui/scenery.ts`

- [ ] **Step 1: Add `makeCashRegister`**

Append to `src/ui/scenery.ts` (it already imports `Phaser`, `COLORS`, `FONTS`):

```ts
/**
 * Vintage mechanical cash register (FCM line-art): brass body, a cream display
 * window the score sits in, a hint of a key bank, a drawer, and a side crank.
 * Returns the container plus the display text so the scene can drive the score.
 */
export function makeCashRegister(
  scene: Phaser.Scene, x: number, y: number, scoreLabel = '0¢',
): { container: Phaser.GameObjects.Container; scoreText: Phaser.GameObjects.Text } {
  const g = scene.add.graphics();
  // drawer base
  g.fillStyle(COLORS.counter, 1).fillRect(-32, 0, 64, 16);
  g.lineStyle(2, COLORS.darkHex, 1).strokeRect(-32, 0, 64, 16);
  g.fillStyle(COLORS.darkHex, 1).fillCircle(0, 8, 2);
  // upper body
  g.fillStyle(COLORS.counterEdge, 1).fillRoundedRect(-30, -44, 60, 44, 5);
  g.lineStyle(2, COLORS.darkHex, 1).strokeRoundedRect(-30, -44, 60, 44, 5);
  // display window (cream pane the score sits in)
  g.fillStyle(COLORS.creamHex, 1).fillRoundedRect(-24, -40, 48, 20, 3);
  g.lineStyle(2, COLORS.darkHex, 1).strokeRoundedRect(-24, -40, 48, 20, 3);
  // key bank hint
  g.fillStyle(COLORS.darkHex, 0.5);
  for (let kx = -20; kx <= 20; kx += 10) g.fillCircle(kx, -12, 2);
  // side crank
  g.lineStyle(3, COLORS.darkHex, 1).lineBetween(30, -34, 42, -34);
  g.fillStyle(COLORS.redHex, 1).fillCircle(42, -34, 3.5);
  const scoreText = scene.add
    .text(0, -30, scoreLabel, {
      fontFamily: FONTS.sans, fontSize: '15px', fontStyle: 'bold', color: COLORS.dark,
    })
    .setOrigin(0.5);
  const container = scene.add.container(x, y, [g, scoreText]);
  return { container, scoreText };
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/ui/scenery.ts
git commit -m "feat: add vintage cash-register scenery piece"
```

---

### Task 4: Stove top with a red pan (PrepStation)

Turn the abstract cream prep bowl into an unmistakable stove top with a red cooking pan on a burner, keeping the same constructor signature, depth, position, `reposition`, and spawn origins so steam/serve/powder/wiggle all keep working.

**Files:**
- Modify: `src/ui/PrepStation.ts`

- [ ] **Step 1: Redraw the stove graphic**

In `src/ui/PrepStation.ts`, replace the three bowl-drawing lines in the constructor:

```ts
    this.bowl = scene.add.graphics();
    this.bowl.fillStyle(COLORS.counter, 1).fillEllipse(0, 0, 150, 44);
    this.bowl.fillStyle(COLORS.counterEdge, 1).fillEllipse(0, -6, 130, 30);
    this.root = scene.add.container(x, y, [this.bowl]).setDepth(depth);
```

with a stove top + red pan:

```ts
    this.bowl = scene.add.graphics();
    // stove top: stainless range body + cook surface with a dark rim
    this.bowl.fillStyle(COLORS.counter, 1).fillEllipse(0, 0, 168, 48);
    this.bowl.fillStyle(COLORS.counterEdge, 1).fillEllipse(0, -8, 150, 36);
    this.bowl.lineStyle(2, COLORS.darkHex, 1).strokeEllipse(0, -8, 150, 36);
    // burner ring under the pan
    this.bowl.lineStyle(3, COLORS.darkHex, 0.55).strokeEllipse(0, -10, 78, 24);
    // red cooking pan on the burner
    this.bowl.fillStyle(COLORS.redHex, 1).fillEllipse(0, -18, 86, 30);
    this.bowl.lineStyle(3, COLORS.darkHex, 1).strokeEllipse(0, -18, 86, 30);
    this.bowl.fillStyle(0xb83227, 1).fillEllipse(0, -20, 66, 20); // darker interior
    this.bowl.fillStyle(COLORS.darkHex, 1).fillRect(42, -22, 26, 5); // handle
    this.root = scene.add.container(x, y, [this.bowl]).setDepth(depth);
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/ui/PrepStation.ts
git commit -m "feat: prep bowl becomes a stove top with a red cooking pan"
```

---

### Task 5: GameScene re-layout — strip HUD bar, place register + spike at stove level, pull wall furniture down

The integration task. Each sub-step keeps the build green because the Hud API and its call sites change together. Concrete starting values are given; Task 6 tunes them against the screenshot.

**Files:**
- Modify: `src/ui/Hud.ts`
- Modify: `src/ui/DinerBackdrop.ts`
- Modify: `src/ui/scenes/GameScene.ts`

- [ ] **Step 1: Strip the Hud to strikes-only**

Replace the entire contents of `src/ui/Hud.ts` with:

```ts
import Phaser from 'phaser';
import { COLORS } from './theme';
import { makePlateIcon } from './scenery';

const PLATE_RADIUS = 17;
const PLATE_GAP = 46;

/** Top-left strike plates. Score moved to the cash register; bottom bar removed. */
export class Hud {
  private strikeRow: Phaser.GameObjects.Container;
  private strikes = 0;

  constructor(private scene: Phaser.Scene) {
    // Strikes live near the top of the screen so a broken plate is impossible to miss.
    this.strikeRow = scene.add.container(28, 34).setDepth(1000);
    this.renderStrikes();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  layout(_width: number, _height: number) {
    this.strikeRow.setPosition(28, 34);
  }

  setStrikes(n: number) {
    const broke = n > this.strikes;
    this.strikes = n;
    this.renderStrikes();
    if (broke) this.crackAnim(n - 1);
  }

  private renderStrikes() {
    this.strikeRow.removeAll(true);
    for (let i = 0; i < 3; i++) {
      this.strikeRow.add(makePlateIcon(this.scene, i * PLATE_GAP, 0, i < this.strikes, PLATE_RADIUS));
    }
  }

  /** Punch + jitter the plate that just shattered. */
  private crackAnim(index: number) {
    const plate = this.strikeRow.list[index] as Phaser.GameObjects.Container | undefined;
    if (!plate) return;
    this.scene.tweens.add({
      targets: plate, scaleX: 1.5, scaleY: 1.5, angle: -12,
      duration: 90, yoyo: true, ease: 'Quad.Out',
    });
  }
}
```

- [ ] **Step 2: Pull the wall furniture down in DinerBackdrop**

In `src/ui/DinerBackdrop.ts`, lower the three furniture anchors so the neon clears the top-left strike plates and the spacing stays coherent. Replace:

```ts
    keep(makeWindowBlinds(scene, width * 0.2, wallBottom * 0.42, 150, 110)).setScale(uiScale);
    keep(makeMenuBoard(scene, width * 0.82, wallBottom * 0.44, shiftIndex)).setScale(uiScale);
    // The big house sign: large neon script, the marquee for the whole diner.
    this.neon = keep(makeNeonSign(scene, width * 0.5, wallBottom * 0.2, "Mel's Diner", 60)).setScale(uiScale);
```

with:

```ts
    keep(makeWindowBlinds(scene, width * 0.2, wallBottom * 0.48, 150, 110)).setScale(uiScale);
    keep(makeMenuBoard(scene, width * 0.82, wallBottom * 0.5, shiftIndex)).setScale(uiScale);
    // The big house sign: large neon script, the marquee for the whole diner.
    // Anchored lower so it sits clear below the top-left strike plates.
    this.neon = keep(makeNeonSign(scene, width * 0.5, wallBottom * 0.3, "Mel's Diner", 60)).setScale(uiScale);
```

- [ ] **Step 3: GameScene — constants and score state**

In `src/ui/scenes/GameScene.ts`, replace the top layout constants:

```ts
const HUD_TOP_FRACTION = 0.86;
const COUNTER_Y_FRACTION = 0.58;
```

with:

```ts
const COUNTER_Y_FRACTION = 0.6;   // counter line a touch lower; wall has more room
const STOVE_Y_FRACTION = 0.8;     // stove/prep level — spike + register flank it
const COUNTER_BAND_FRACTION = 0.05; // shorter counter body (was 0.1) reclaims height
```

Add two fields alongside the existing private fields (e.g. after `private receipts: ...`):

```ts
  private score = 0;
  private registerScore?: Phaser.GameObjects.Text;
```

- [ ] **Step 4: GameScene — stove anchor helpers**

Add helpers next to `counterY()`:

```ts
  private stoveX(): number {
    return this.scale.width / 2;
  }

  private stoveY(): number {
    return this.scale.height * STOVE_Y_FRACTION;
  }
```

Update the two `prep` positions to use them. In `create()` replace:

```ts
    this.prep = new PrepStation(this, width / 2, height * 0.78, DEPTH.prep);
```

with:

```ts
    this.prep = new PrepStation(this, this.stoveX(), this.stoveY(), DEPTH.prep);
```

and in `onResize` replace:

```ts
      this.prep.reposition(w / 2, h * 0.78);
```

with:

```ts
      this.prep.reposition(this.stoveX(), this.stoveY());
```

- [ ] **Step 5: GameScene — fix Hud.layout call sites**

Replace both occurrences of:

```ts
    this.hud.layout(width, height, height * HUD_TOP_FRACTION);
```
and
```ts
      this.hud.layout(w, h, h * HUD_TOP_FRACTION);
```

with `this.hud.layout(width, height);` and `this.hud.layout(w, h);` respectively (drop the third argument).

- [ ] **Step 6: GameScene — counter band, floor extent, spike + register in layoutDiner**

In `layoutDiner`, replace the counter body line:

```ts
      this.add.rectangle(0, counterY + 18, width, height * 0.1, COLORS.counter).setOrigin(0),
```

with:

```ts
      this.add.rectangle(0, counterY + 18, width, height * COUNTER_BAND_FRACTION, COLORS.counter).setOrigin(0),
```

Replace the spike placement block:

```ts
    // receipt spindle near the left end of the counter; served orders pile here
    this.spikeX = width * 0.06;
    this.spikeY = counterY + 12;
    keep(makeReceiptSpike(this, this.spikeX, this.spikeY).setDepth(DEPTH.counter + 2));
```

with the spike dropped to stove level on the left, plus the cash register on the right:

```ts
    // receipt spindle dropped to stove level, just left of the stove
    this.spikeX = width * 0.2;
    this.spikeY = this.stoveY();
    keep(makeReceiptSpike(this, this.spikeX, this.spikeY).setDepth(DEPTH.prep).setScale(ui));

    // vintage cash register right of the stove; the running score lives in its window
    const register = makeCashRegister(this, width * 0.8, this.stoveY(), formatMoney(this.score));
    register.container.setDepth(DEPTH.prep).setScale(ui);
    this.registerScore = register.scoreText;
    keep(register.container);
```

Replace the floor line (cap was the HUD top; floor now runs to the bottom):

```ts
    const floorY = counterY + 18 + height * 0.1;
    keep(drawPerspectiveFloor(this, floorY, height * HUD_TOP_FRACTION, width));
```

with:

```ts
    const floorY = counterY + 18 + height * COUNTER_BAND_FRACTION;
    keep(drawPerspectiveFloor(this, floorY, height, width));
```

- [ ] **Step 7: GameScene — add the register import**

In the `scenery` import line, add `makeCashRegister`:

```ts
import { drawPerspectiveFloor, makeCashRegister, makeCondimentGroup, makeCounterProp, makeReceiptSpike, makeSmallReceipt } from '../scenery';
```

- [ ] **Step 8: GameScene — drive the register score, retarget the mistake flash**

In the `orderServed` handler, replace:

```ts
      this.hud.setScore(this.engine.score);
```

with:

```ts
      this.setRegisterScore(this.engine.score);
```

In the `mistake` handler, replace:

```ts
      this.hud.flashMistake();
```

with:

```ts
      this.flashRegister();
```

In `seedDemo`, replace:

```ts
    this.hud.setScore(1875);
```

with:

```ts
    this.setRegisterScore(1875);
```

Add these two methods (e.g. just after `popTip`):

```ts
  /** Update the cash-register display and pop it. */
  private setRegisterScore(cents: number) {
    this.score = cents;
    if (!this.registerScore) return;
    this.registerScore.setText(formatMoney(cents));
    this.tweens.add({
      targets: this.registerScore, scaleX: 1.25, scaleY: 1.25,
      duration: 90, yoyo: true, ease: 'Quad.Out',
    });
  }

  /** Buzz the register score on a wrong keystroke (was the HUD score flash). */
  private flashRegister() {
    if (!this.registerScore) return;
    this.tweens.add({
      targets: this.registerScore, scaleX: 1.3, scaleY: 1.3,
      duration: 60, yoyo: true, repeat: 1,
    });
  }
```

- [ ] **Step 9: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors. (No remaining references to `HUD_TOP_FRACTION`, `hud.setScore`, or `hud.flashMistake`.)

- [ ] **Step 10: Commit**

```bash
git add src/ui/Hud.ts src/ui/DinerBackdrop.ts src/ui/scenes/GameScene.ts
git commit -m "feat: stove-level spike + cash register, no bottom bar, neon clear of plates"
```

---

### Task 6: Rebuild the demo and verify visually

Regenerate the self-contained phone preview and eyeball every requested item. Tune the layout constants from Task 5 if anything still collides.

**Files:**
- Modify (artifacts): `demo/assets.generated.ts`, `demo/game-state-phone.html`

- [ ] **Step 1: Full build (type + bundle safety)**

Run: `npm run build`
Expected: `tsc --noEmit` passes and vite builds with no errors.

- [ ] **Step 2: Regenerate inlined assets and the demo bundle**

```bash
node demo/gen-assets.mjs
npx vite build --config demo/vite.config.ts
cp dist-demo/index.html demo/game-state-phone.html
```
Expected: each step exits 0; `demo/game-state-phone.html` is rewritten.

- [ ] **Step 3: Headless screenshot**

Run: `node demo/shoot.mjs`
Expected: `shot: /tmp/claude-1000/demo-shot.png` and `page errors: none`.

- [ ] **Step 4: Eyeball the screenshot against all eight items**

Open `/tmp/claude-1000/demo-shot.png` and confirm:
1. Order bubbles are noticeably larger and legible.
2. The locked/active order ticket sits on top of everything.
3. The receipt spike sits at stove level, to the left of the stove (not on the counter).
4. No black bar at the bottom.
5. Score reads correctly inside the cash register's window (right of the stove), formatted like `$18.75`.
6. Counter band and stove level are shorter; the scene has more breathing room.
7. The "Mel's Diner" neon is fully clear of the three strike plates.
8. A red cooking pan sits on the stove.

If item 7 still clips, raise the neon factor in `DinerBackdrop` (Step 2 of Task 5) further (e.g. `0.3 → 0.34`). If bubbles crowd horizontally, the per-seat stagger (`staggerFor` in `GameScene`) can be widened. Re-run Steps 1-3 after any change.

- [ ] **Step 5: Commit the rebuilt demo**

```bash
git add demo/assets.generated.ts demo/game-state-phone.html
git commit -m "chore: rebuild phone demo with visual-polish changes"
```

> Note: `demo/assets.generated.ts` may be git-ignored (see `.gitignore`); if `git add` reports it as ignored, only `demo/game-state-phone.html` needs committing.

---

## Self-Review notes

- **Spec coverage:** items 1–2 (bubbles) → Task 2; item "active ticket on top" → unchanged depth `ticketActive`, verified Task 6/Step 4.2; item 3/8 (spike to stove-left) → Task 5/Step 6; item 4 (no black bar) → Task 5/Steps 1,6; item "score on register" → Task 3 + Task 5/Steps 6,8; item 5 (shorter counter/stove) → Task 5/Steps 3,6 + Task 4; item 6 (pull down, neon clear) → Task 5/Step 2; item 7 (red dish) → Task 4. High-score bug → Task 1.
- **Type consistency:** `makeCashRegister` returns `{ container, scoreText }` (Task 3) and is consumed exactly that way in Task 5/Step 6; `Hud.layout(width, height)` (Task 5/Step 1) matches the updated call sites (Task 5/Step 5); `setRegisterScore`/`flashRegister` defined and called in Task 5/Step 8; `STOVE_Y_FRACTION`/`COUNTER_BAND_FRACTION` defined Step 3 and used Steps 4,6.
- **Placeholders:** none — every code step shows the full replacement.
