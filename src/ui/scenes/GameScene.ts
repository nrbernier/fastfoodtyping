import Phaser from 'phaser';
import { ShiftEngine } from '../../core/shiftEngine';
import type { ShiftConfig } from '../../core/types';
import { attachPhysicalKeyboard, createHiddenInput, isTouchDevice, type HiddenInput } from '../../input/inputAdapter';
import { CustomerView } from '../CustomerView';
import { Hud } from '../Hud';
import { PrepStation } from '../PrepStation';
import { COLORS, FONTS, makeStarburst } from '../theme';

const HUD_TOP_FRACTION = 0.86;
const COUNTER_Y_FRACTION = 0.58;

export class GameScene extends Phaser.Scene {
  private config!: ShiftConfig;
  private engine!: ShiftEngine;
  private views = new Map<number, CustomerView>();
  private orderTexts = new Map<number, string>();
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

  constructor() {
    super('game');
  }

  init(data: { config: ShiftConfig }) {
    this.config = data.config;
  }

  create() {
    const { width, height } = this.scale;
    this.views.clear();
    this.orderTexts.clear();
    this.orderWords.clear();
    this.gamePaused = false;
    this.cleanupFns = [];
    this.maxSlots = width < 700 ? 3 : 4;
    this.engine = new ShiftEngine({ config: this.config, maxCustomersCap: this.maxSlots });
    this.shiftElapsedMs = 0;

    this.drawDiner(width, height);
    this.prep = new PrepStation(this, width / 2, height * 0.78);
    this.hud = new Hud(this);
    this.hud.layout(width, height, height * HUD_TOP_FRACTION);
    this.buildPauseOverlay(width, height);

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
    this.clockText.setText(this.formatClock(this.config.durationMs - this.shiftElapsedMs));
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
      this.orderTexts.set(customer.id, customer.order.text);
      this.orderWords.set(customer.id, customer.order.words);
      const view = new CustomerView(this, customer, this.slotX(customer.slot), this.counterY());
      this.views.set(customer.id, view);
    });

    e.on('orderLocked', ({ customerId }) => {
      this.views.get(customerId)?.setLocked(true);
      this.hud.showOrder(this.orderTexts.get(customerId) ?? '', this.engine.typedCount);
    });

    e.on('orderProgress', ({ customerId, typedCount }) => {
      this.hud.showOrder(this.orderTexts.get(customerId) ?? '', typedCount);
    });

    e.on('wordCompleted', ({ customerId, wordIndex }) => {
      this.hud.showOrder(this.orderTexts.get(customerId) ?? '', this.engine.typedCount);
      const word = this.orderWords.get(customerId)?.[wordIndex];
      if (word) this.prep.dropBox(word);
    });

    e.on('orderServed', ({ customerId, finalWordIndex }) => {
      const word = this.orderWords.get(customerId)?.[finalWordIndex];
      if (word) this.prep.dropBox(word);
      const view = this.views.get(customerId);
      const tx = view?.x ?? this.scale.width / 2;
      const ty = view?.y ?? this.scale.height * 0.4;
      this.prep.serveDish(tx, ty, () => {
        view?.serve(() => this.views.delete(customerId));
      });
      this.hud.setScore(this.engine.score);
      this.hud.showOrder('', 0);
    });

    e.on('customerLeft', ({ customerId, strikes }) => {
      const view = this.views.get(customerId);
      view?.stormOut(() => this.views.delete(customerId));
      this.hud.setStrikes(strikes);
      if (this.engine.lockedCustomerId === null) this.hud.showOrder('', 0);
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
    this.pauseOverlay = this.add.container(0, 0, [this.pauseRect, this.pauseText]).setDepth(100).setVisible(false);
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
