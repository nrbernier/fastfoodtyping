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

const HUD_TOP_FRACTION = 0.86;
const COUNTER_Y_FRACTION = 0.58;
const DEPTH = { backdrop: 0, customer: 5, counter: 10, prep: 12, hud: 20, overlay: 100 } as const;
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
  private spikeCount = 0;

  constructor() {
    super('game');
  }

  init(data: { config: ShiftConfig }) {
    this.config = data.config;
  }

  create() {
    const { width, height } = this.scale;
    this.views.clear();
    this.orderWords.clear();
    this.gamePaused = false;
    this.cleanupFns = [];
    this.maxSlots = width < 700 ? 3 : 4;
    this.engine = new ShiftEngine({ config: this.config, maxCustomersCap: this.maxSlots });
    this.shiftElapsedMs = 0;
    this.spikeCount = 0;

    this.drawDiner(width, height);
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

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      for (const fn of this.cleanupFns) fn();
    });

    const onResize = () => {
      const w = this.scale.width;
      const h = this.scale.height;
      this.hud.layout(w, h, h * HUD_TOP_FRACTION);
      this.pauseRect.setSize(w, h);
      this.pauseText.setPosition(w / 2, h / 2);
    };
    this.scale.on(Phaser.Scale.Events.RESIZE, onResize);
    this.cleanupFns.push(() => this.scale.off(Phaser.Scale.Events.RESIZE, onResize));
  }

  update(_time: number, delta: number) {
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
      // small deterministic per-customer nudge so seats aren't a perfect grid
      const jitter = ((customer.id * 53) % 39) - 19;
      const view = new CustomerView(this, customer, this.slotX(customer.slot) + jitter, this.counterY() + CUSTOMER_SINK);
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

  private drawDiner(width: number, height: number) {
    const counterY = height * COUNTER_Y_FRACTION;
    const shiftIndex = SHIFTS.findIndex((s) => s.id === this.config.id);
    const menuIndex = shiftIndex >= 0 ? shiftIndex : SHIFTS.length; // overtime -> weirdest menu

    // wall scene (window, menu board, big neon marquee) behind everything
    this.backdrop = new DinerBackdrop(this, width, counterY, menuIndex);

    // shift-name subtitle, tucked just under the neon marquee
    this.add.text(width / 2, counterY * 0.22 + 36, this.config.name.toUpperCase(), {
      fontFamily: FONTS.sans, fontSize: '15px', fontStyle: 'bold', color: COLORS.cream,
    }).setOrigin(0.5, 0);

    // starburst wall clock
    const clock = makeStarburst(this, width - 64, 64, 44, '');
    this.clockText = this.add.text(0, 0, clockLabel(this.config.durationMs, this.shiftElapsedMs), {
      fontFamily: FONTS.sans, fontSize: '17px', fontStyle: 'bold', color: COLORS.dark,
    }).setOrigin(0.5);
    clock.add(this.clockText);

    // counter with red trim — explicit depth so it occludes customer legs (set later)
    this.add.container(0, 0, [
      this.add.rectangle(0, counterY, width, 6, COLORS.redHex).setOrigin(0),
      this.add.rectangle(0, counterY + 6, width, 12, COLORS.counterEdge).setOrigin(0),
      this.add.rectangle(0, counterY + 18, width, height * 0.1, COLORS.counter).setOrigin(0),
    ]).setDepth(DEPTH.counter);

    // counter clutter: repeated condiment trios (reordered) plus a few props
    const propY = counterY + 14;
    [0.18, 0.46, 0.74].forEach((fx, i) =>
      makeCondimentGroup(this, width * fx, propY, i).setDepth(DEPTH.counter + 1),
    );
    [[0.34, 2], [0.6, 0], [0.92, 3]].forEach(([fx, kind]) =>
      makeCounterProp(this, width * fx, propY, kind).setDepth(DEPTH.counter + 1),
    );

    // receipt spindle near the left end of the counter; served orders pile here
    this.spikeX = width * 0.06;
    this.spikeY = counterY + 12;
    makeReceiptSpike(this, this.spikeX, this.spikeY).setDepth(DEPTH.counter + 2);

    // receding checker floor between counter and HUD
    const floorY = counterY + 18 + height * 0.1;
    drawPerspectiveFloor(this, floorY, height * HUD_TOP_FRACTION, width);
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
    const receipt = makeSmallReceipt(this, fromX, fromY).setDepth(DEPTH.counter + 3);
    const restY = this.spikeY - 40 - Math.min(this.spikeCount, 12) * 2.2;
    const restX = this.spikeX + Phaser.Math.Between(-3, 3);
    this.spikeCount += 1;
    this.tweens.add({
      targets: receipt,
      x: restX,
      y: restY,
      angle: Phaser.Math.Between(-8, 8),
      duration: 380,
      ease: 'Quad.In',
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
