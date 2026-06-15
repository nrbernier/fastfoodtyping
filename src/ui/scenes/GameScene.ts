import Phaser from 'phaser';
import { ShiftEngine } from '../../core/shiftEngine';
import type { ShiftConfig } from '../../core/types';
import { attachPhysicalKeyboard, createHiddenInput, isTouchDevice, type HiddenInput } from '../../input/inputAdapter';
import { formatMoney } from '../../core/money';
import { clockLabel } from '../clock';
import { CustomerView } from '../CustomerView';
import { Hud } from '../Hud';
import { PrepStation } from '../PrepStation';
import { COLORS, FONTS, makeStarburst } from '../theme';
import { DinerBackdrop } from '../DinerBackdrop';
import { drawPerspectiveFloor, makeCondimentGroup, makeCounterProp, makeReceiptSpike, makeSmallReceipt } from '../scenery';
import { applyPaperGrain } from '../texture';
import { SHIFTS } from '../../core/shifts';
import { mulberry32 } from '../../core/rng';

const HUD_TOP_FRACTION = 0.86;
const COUNTER_Y_FRACTION = 0.58;
// Tickets float above scenery (50). The order being typed jumps above the strike
// plates (1000) too, but stays below the pause overlay (1100).
const DEPTH = { backdrop: 0, customer: 5, counter: 10, prep: 12, hud: 20, overlay: 100, ticket: 50, ticketActive: 1001 } as const;
const CUSTOMER_SINK = 36; // px the customer's feet drop behind the counter, so it occludes their legs

export class GameScene extends Phaser.Scene {
  private config!: ShiftConfig;
  private engine!: ShiftEngine;
  private views = new Map<number, CustomerView>();
  private orderWords = new Map<number, string[]>();
  private hud!: Hud;
  private prep!: PrepStation;
  private pauseOverlay!: Phaser.GameObjects.Container;
  private gamePaused = false;
  private maxSlots = 4;
  private cleanupFns: Array<() => void> = [];
  private hidden?: HiddenInput;
  private pauseRect!: Phaser.GameObjects.Rectangle;
  private pauseText!: Phaser.GameObjects.Text;
  private shiftElapsedMs = 0;
  private clockText!: Phaser.GameObjects.Text;
  private backdrop!: DinerBackdrop;
  private spikeX = 0;
  private spikeY = 0;
  private receipts: Array<{ view: Phaser.GameObjects.Container; index: number; jx: number }> = [];
  private staticScenery: Phaser.GameObjects.GameObject[] = [];
  private lastW = 0;
  private lastH = 0;
  private uiScale = 1;
  // Demo mode: seed a fixed busy state, then freeze the shift clock (no time
  // advance, no spawns, no patience drain) while leaving every tween/idle
  // animation running. Used by the self-contained design-preview build.
  private demo = false;
  private demoSeed = 1;

  constructor() {
    super('game');
  }

  init(data: { config: ShiftConfig; demo?: boolean; seed?: number }) {
    this.config = data.config;
    this.demo = data.demo ?? false;
    this.demoSeed = data.seed ?? 1;
  }

  create() {
    const { width, height } = this.scale;
    this.views.clear();
    this.orderWords.clear();
    this.gamePaused = false;
    this.cleanupFns = [];
    this.maxSlots = width < 700 ? 3 : 4;
    this.engine = new ShiftEngine({
      config: this.config,
      maxCustomersCap: this.maxSlots,
      // A fixed seed makes the frozen demo state reproducible shot-to-shot.
      rng: this.demo ? mulberry32(this.demoSeed) : undefined,
    });
    this.shiftElapsedMs = 0;
    this.receipts = [];

    this.layoutDiner(width, height);
    this.lastW = width;
    this.lastH = height;
    this.time.addEvent({
      delay: 2600, loop: true, callback: () => {
        this.tweens.add({ targets: this.backdrop.neon, alpha: 0.35, duration: 60, yoyo: true, repeat: 1 });
      },
    });
    this.prep = new PrepStation(this, width / 2, height * 0.78, DEPTH.prep);
    this.hud = new Hud(this);
    this.hud.layout(width, height, height * HUD_TOP_FRACTION);
    this.buildPauseOverlay(width, height);
    applyPaperGrain(this);

    this.wireEngineEvents();

    // The design preview never takes input and must always keep animating, so
    // it skips the keyboard, touch "tap to start", and blur/visibility pauses.
    if (!this.demo) {
      const detach = attachPhysicalKeyboard(window, (ch) => this.onChar(ch));
      this.cleanupFns.push(detach);

      if (isTouchDevice()) {
        this.hidden = createHiddenInput(document, (ch) => this.onChar(ch));
        this.cleanupFns.push(() => this.hidden?.destroy());
        this.pauseGame('TAP TO START YOUR SHIFT\n(the keyboard is your grill)');
      }

      const onBlur = () => this.pauseGame();
      window.addEventListener('blur', onBlur);
      this.cleanupFns.push(() => window.removeEventListener('blur', onBlur));
      const onVis = () => {
        if (document.visibilityState === 'hidden') this.pauseGame();
      };
      document.addEventListener('visibilitychange', onVis);
      this.cleanupFns.push(() => document.removeEventListener('visibilitychange', onVis));

      this.input.on('pointerdown', () => {
        if (this.gamePaused) this.resumeGame();
      });
    }

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      for (const fn of this.cleanupFns) fn();
    });

    const onResize = () => {
      const w = this.scale.width;
      const h = this.scale.height;
      // The mobile soft keyboard / dynamic browser toolbar resizes the viewport
      // mid-shift. Re-flow the WHOLE diner against the new height so the counter,
      // floor, prep bowl, spike, and every standing customer stay in register
      // (otherwise scenery sticks at its old height while customers float).
      if (Math.abs(w - this.lastW) < 2 && Math.abs(h - this.lastH) < 2) return;
      this.lastW = w;
      this.lastH = h;
      this.layoutDiner(w, h); // recomputes this.uiScale
      this.prep.reposition(w / 2, h * 0.78);
      for (const c of this.engine.activeCustomers) {
        const view = this.views.get(c.id);
        view?.setUiScale(this.uiScale);
        view?.reposition(this.slotX(c.slot) + this.jitterFor(c.id), this.customerY());
      }
      this.hud.layout(w, h, h * HUD_TOP_FRACTION);
      this.pauseRect.setSize(w, h);
      this.pauseText.setPosition(w / 2, h / 2);
    };
    this.scale.on(Phaser.Scale.Events.RESIZE, onResize);
    this.cleanupFns.push(() => this.scale.off(Phaser.Scale.Events.RESIZE, onResize));

    if (this.demo) this.seedDemo();
  }

  update(_time: number, delta: number) {
    // Frozen demo: keep redrawing patience bars (so the jitter animation lives)
    // but never advance the clock, spawn, or drain patience.
    if (this.demo) {
      for (const c of this.engine.activeCustomers) {
        this.views.get(c.id)?.updatePatience(c.patienceMs / c.patienceTotalMs);
      }
      return;
    }
    if (this.gamePaused || this.engine.isOver) return;
    this.shiftElapsedMs += delta;
    this.clockText.setText(clockLabel(this.config.durationMs, this.shiftElapsedMs));
    this.engine.update(delta);
    for (const c of this.engine.activeCustomers) {
      this.views.get(c.id)?.updatePatience(c.patienceMs / c.patienceTotalMs);
    }
  }

  // ---- input ----

  private onChar(ch: string) {
    if (this.gamePaused) {
      this.resumeGame();
      return;
    }
    this.engine.handleKey(ch);
  }

  // ---- engine event wiring ----

  private wireEngineEvents() {
    const e = this.engine.events;

    e.on('customerArrived', ({ customer }) => {
      this.orderWords.set(customer.id, customer.order.words);
      const view = new CustomerView(
        this,
        customer,
        this.slotX(customer.slot) + this.jitterFor(customer.id),
        this.customerY(),
        DEPTH.ticket,
        DEPTH.ticketActive,
        this.uiScale,
        this.staggerFor(customer.slot),
      );
      view.setDepth(DEPTH.customer);
      this.views.set(customer.id, view);
    });

    e.on('orderLocked', ({ customerId }) => {
      this.views.get(customerId)?.setLocked(true);
      this.views.get(customerId)?.updateTyping(this.engine.typedCount);
    });

    e.on('orderProgress', ({ customerId, typedCount }) => {
      this.views.get(customerId)?.updateTyping(typedCount);
    });

    e.on('wordCompleted', ({ customerId, wordIndex }) => {
      this.views.get(customerId)?.updateTyping(this.engine.typedCount);
      const word = this.orderWords.get(customerId)?.[wordIndex];
      if (word) this.prep.dropBox(word);
    });

    e.on('orderServed', ({ customerId, tip, finalWordIndex }) => {
      const word = this.orderWords.get(customerId)?.[finalWordIndex];
      if (word) this.prep.dropBox(word);
      const view = this.views.get(customerId);
      view?.flashComplete();
      const tx = view?.x ?? this.scale.width / 2;
      const ty = view?.y ?? this.scale.height * 0.4;
      this.prep.serveDish(tx, ty, () => {
        view?.serve(() => this.views.delete(customerId));
      });
      this.hud.setScore(this.engine.score);
      this.impaleReceipt(tx, this.counterY());
      this.popTip(tx, ty - 60, tip);
    });

    e.on('customerLeft', ({ customerId, strikes }) => {
      const view = this.views.get(customerId);
      view?.stormOut(() => this.views.delete(customerId));
      this.hud.setStrikes(strikes);
      this.cameras.main.shake(150, 0.008);
    });

    e.on('mistake', () => {
      this.hud.flashMistake();
      this.prep.shake();
    });

    e.on('shiftEnded', ({ result }) => {
      this.time.delayedCall(700, () =>
        this.scene.start('results', { config: this.config, result }),
      );
    });
  }

  // ---- layout & scenery ----

  private slotX(slot: number): number {
    const w = this.scale.width;
    return w * (0.1 + (0.8 * (slot + 0.5)) / this.maxSlots);
  }

  private counterY(): number {
    return this.scale.height * COUNTER_Y_FRACTION;
  }

  /** Y where a customer's feet rest (sink scaled so small customers tuck in). */
  private customerY(): number {
    return this.counterY() + CUSTOMER_SINK * this.uiScale;
  }

  /**
   * One responsive scale for customers, tickets, and wall furniture. Driven by
   * the smaller of width/height vs a reference so a short (keyboard-up) or narrow
   * (phone) viewport shrinks everything enough to stop it overlapping.
   */
  private uiScaleFor(width: number, height: number): number {
    return Phaser.Math.Clamp(Math.min(width / 440, height / 760), 0.5, 1);
  }

  /** Deterministic per-customer seat nudge so seats aren't a perfect grid. */
  private jitterFor(id: number): number {
    return (((id * 53) % 39) - 19) * this.uiScale;
  }

  /** Lift odd seats' tickets so neighbouring (long) tickets don't overlap. */
  private staggerFor(slot: number): number {
    return (slot % 2) * -52;
  }

  /** Stacked resting place for the Nth impaled receipt, piling up from the base. */
  private receiptRestY(index: number): number {
    const capped = Math.min(index, 6); // beyond this they bunch near the tip
    return this.spikeY - 12 - capped * 13;
  }

  private receiptRestX(jx: number): number {
    return this.spikeX + jx;
  }

  /**
   * (Re)build all static diner scenery at the given size. Safe to call again on
   * resize: the previous backdrop and tracked scenery are torn down first, and
   * any receipts already on the spike are re-seated at the new geometry.
   */
  private layoutDiner(width: number, height: number) {
    const counterY = height * COUNTER_Y_FRACTION;
    const ui = this.uiScaleFor(width, height);
    this.uiScale = ui;
    const shiftIndex = SHIFTS.findIndex((s) => s.id === this.config.id);
    const menuIndex = shiftIndex >= 0 ? shiftIndex : SHIFTS.length; // overtime -> weirdest menu

    this.backdrop?.destroy();
    for (const o of this.staticScenery) o.destroy();
    this.staticScenery = [];
    const keep = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      this.staticScenery.push(o);
      return o;
    };

    // wall scene (window, menu board, big neon marquee) behind everything
    this.backdrop = new DinerBackdrop(this, width, counterY, menuIndex, ui);

    // shift-name subtitle, tucked just under the neon marquee
    keep(this.add.text(width / 2, counterY * 0.16 + 30 * ui, this.config.name.toUpperCase(), {
      fontFamily: FONTS.sans, fontSize: '15px', fontStyle: 'bold', color: COLORS.cream,
    }).setOrigin(0.5, 0).setScale(ui));

    // starburst wall clock
    const clock = makeStarburst(this, width - 52 * ui, 52 * ui, 44, '').setScale(ui);
    this.clockText = this.add.text(0, 0, clockLabel(this.config.durationMs, this.shiftElapsedMs), {
      fontFamily: FONTS.sans, fontSize: '17px', fontStyle: 'bold', color: COLORS.dark,
    }).setOrigin(0.5);
    clock.add(this.clockText);
    keep(clock);

    // counter with red trim — explicit depth so it occludes customer legs
    keep(this.add.container(0, 0, [
      this.add.rectangle(0, counterY, width, 6, COLORS.redHex).setOrigin(0),
      this.add.rectangle(0, counterY + 6, width, 12, COLORS.counterEdge).setOrigin(0),
      this.add.rectangle(0, counterY + 18, width, height * 0.1, COLORS.counter).setOrigin(0),
    ]).setDepth(DEPTH.counter));

    // counter clutter: repeated condiment trios (reordered) plus a few props
    const propY = counterY + 14;
    [0.18, 0.46, 0.74].forEach((fx, i) =>
      keep(makeCondimentGroup(this, width * fx, propY, i).setDepth(DEPTH.counter + 1)),
    );
    [[0.34, 2], [0.6, 0], [0.92, 3]].forEach(([fx, kind]) =>
      keep(makeCounterProp(this, width * fx, propY, kind).setDepth(DEPTH.counter + 1)),
    );

    // receipt spindle near the left end of the counter; served orders pile here
    this.spikeX = width * 0.06;
    this.spikeY = counterY + 12;
    keep(makeReceiptSpike(this, this.spikeX, this.spikeY).setDepth(DEPTH.counter + 2));

    // receding checker floor between counter and HUD
    const floorY = counterY + 18 + height * 0.1;
    keep(drawPerspectiveFloor(this, floorY, height * HUD_TOP_FRACTION, width));

    // re-seat receipts already on the spike against the rebuilt geometry
    for (const r of this.receipts) {
      r.view.setPosition(this.receiptRestX(r.jx), this.receiptRestY(r.index)).setDepth(DEPTH.counter + 3);
    }
  }

  /** Big, lingering tip pop above the served customer. */
  private popTip(x: number, y: number, tipCents: number) {
    const label = this.add.text(x, y, `+${formatMoney(tipCents)}`, {
      fontFamily: FONTS.slab, fontSize: '34px', color: COLORS.mustard,
      stroke: COLORS.dark, strokeThickness: 4,
    }).setOrigin(0.5).setDepth(DEPTH.overlay).setScale(0);
    this.tweens.add({ targets: label, scale: 1, duration: 180, ease: 'Back.Out' });
    this.tweens.add({
      targets: label, y: y - 120, duration: 1600, ease: 'Sine.Out',
    });
    this.tweens.add({
      targets: label, alpha: 0, delay: 1100, duration: 500,
      onComplete: () => label.destroy(),
    });
  }

  /** Fly a tiny receipt from the served customer onto the spindle, where it piles up. */
  private impaleReceipt(fromX: number, fromY: number) {
    const index = this.receipts.length;
    const jx = Phaser.Math.Between(-3, 3);
    const receipt = makeSmallReceipt(this, fromX, fromY).setDepth(DEPTH.counter + 3);
    this.receipts.push({ view: receipt, index, jx });
    this.tweens.add({
      targets: receipt,
      x: this.receiptRestX(jx),
      y: this.receiptRestY(index),
      angle: Phaser.Math.Between(-8, 8),
      duration: 380,
      ease: 'Quad.In',
    });
  }

  // ---- demo / design preview ----

  /**
   * Drive the real engine (seeded) into a representative "busy mid-shift" state,
   * then leave it frozen: a full counter, one order locked and half-typed, a
   * couple of served receipts piled on the spike, and money on the board. Idle
   * animations (neon flicker, customer bob, patience jitter, tip floats) keep
   * running via tweens — only the shift clock is stopped.
   */
  private seedDemo() {
    // Fast-forward the engine (no rendering) until the counter fills up.
    let safety = 0;
    while (this.engine.activeCustomers.length < this.maxSlots && safety++ < 600) {
      this.engine.update(120);
    }

    // Hand each seated customer a pleasant, varied patience so nobody is mid-
    // bolt (a frozen 5%-patience bar reads as a bug, not a busy diner).
    const fracs = [0.82, 0.5, 0.31, 0.66];
    const seated = [...this.engine.activeCustomers].sort((a, b) => a.slot - b.slot);
    seated.forEach((c, i) => {
      c.patienceMs = c.patienceTotalMs * (fracs[i] ?? 0.6);
    });

    // Lock onto the front customer and type their order halfway, so one ticket
    // shows the active highlight + revealed letters.
    const front = seated[0];
    if (front) {
      const norm = front.order.normalized;
      const n = Math.max(1, Math.ceil(norm.length / 2));
      for (let i = 0; i < n; i++) this.engine.handleKey(norm[i]);
    }

    // Money on the board + a couple of receipts already impaled, as if a few
    // orders went out earlier this shift. One strike already cost us a plate.
    this.hud.setScore(1875);
    this.hud.setStrikes(1);
    this.impaleReceipt(this.scale.width * 0.34, this.counterY());
    this.impaleReceipt(this.scale.width * 0.62, this.counterY());

    // Paint patience bars once for the initial frame (update() keeps them live).
    for (const c of this.engine.activeCustomers) {
      this.views.get(c.id)?.updatePatience(c.patienceMs / c.patienceTotalMs);
    }

    // A gentle recurring tip float keeps the "service" feeling alive — pop it
    // above a seated customer (like a real serve) so it never covers the menu.
    const tipper = seated[seated.length - 1] ?? front;
    const tipX = tipper ? this.slotX(tipper.slot) + this.jitterFor(tipper.id) : this.scale.width * 0.7;
    const tipY = this.customerY() - 150 * this.uiScale;
    this.time.addEvent({
      delay: 3400, loop: true,
      callback: () => this.popTip(tipX, tipY, 1500),
    });
  }

  // ---- pause ----

  private buildPauseOverlay(width: number, height: number) {
    this.pauseRect = this.add.rectangle(0, 0, width, height, 0x000000, 0.6).setOrigin(0);
    this.pauseText = this.add
      .text(width / 2, height / 2, '', {
        fontFamily: FONTS.mono,
        fontSize: '26px',
        fontStyle: 'bold',
        color: COLORS.cream,
        align: 'center',
      })
      .setOrigin(0.5);
    this.pauseOverlay = this.add.container(0, 0, [this.pauseRect, this.pauseText]).setDepth(1100).setVisible(false);
  }

  private pauseGame(message = 'PAUSED\nBack to the grill? Press any key or tap.') {
    if (this.gamePaused || this.engine.isOver) return;
    this.gamePaused = true;
    this.pauseText.setText(message);
    this.pauseOverlay.setVisible(true);
  }

  private resumeGame() {
    this.gamePaused = false;
    this.pauseOverlay.setVisible(false);
    this.hidden?.focus();
  }
}
