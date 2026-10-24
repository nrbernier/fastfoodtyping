import Phaser from 'phaser';
import { ShiftEngine } from '../../core/shiftEngine';
import { practiceFocus } from '../../core/typingStats';
import { VOCABULARIES, type Lang } from '../../core/lang';
import { bossLine, line, reaction } from '../reactions';
import { POSES } from '../cast';
import { TipJar } from '../TipJar';
import { SaveStore, safeLocalStorage } from '../../persistence/storage';
import type { ShiftConfig } from '../../core/types';
import { attachPhysicalKeyboard, createHiddenInput, isTouchDevice, type HiddenInput } from '../../input/inputAdapter';
import { formatMoney } from '../../core/money';
import { clockLabel } from '../clock';
import { CustomerView, MIN_TICKET_SCALE } from '../CustomerView';
import { pickPose } from '../assets';
import { Hud } from '../Hud';
import { Kitchen, type KitchenLayout } from '../Kitchen';
import { COLORS, FONTS, makeStarburst } from '../theme';
import { DinerBackdrop } from '../DinerBackdrop';
import { makeCashRegister, makeCondimentGroup, makeReceiptSpike, makeSmallReceipt } from '../scenery';
import { applyPaperGrain } from '../texture';
import { isMuted, play, setMuted, unlockAudio } from '../sound';
import { SHIFTS } from '../../core/shifts';
import { mulberry32 } from '../../core/rng';

const COUNTER_Y_FRACTION = 0.68;  // counter line low, so customers and tickets get most of the screen
const STOVE_Y_FRACTION = 0.95;    // burner level in the front panel — spike + register flank the pot
const COUNTER_TOP_FRACTION = 0.065; // depth of the counter top, seen in perspective
const COUNTER_INSET = 22;          // how far the back edge of the counter top narrows in, per side
// Tickets float above scenery (50). The order being typed jumps above the strike
// plates (1000) too, but stays below the pause overlay (1100).
// Dishes slide at lane depth: above the counter top, behind the condiments on its near edge.
// Tip pops float above the scenery but under every ticket, so they never hide an order.
const DEPTH = { backdrop: 0, customer: 5, counter: 10, lane: 10.5, condiments: 11, dropped: 11.5, prep: 12, hud: 20, tip: 40, overlay: 100, ticket: 50, ticketActive: 1001 } as const;
const CUSTOMER_SINK = 36; // px the customer's feet drop behind the counter, so it occludes their legs

export class GameScene extends Phaser.Scene {
  private config!: ShiftConfig;
  private engine!: ShiftEngine;
  private views = new Map<number, CustomerView>();
  private orderWords = new Map<number, string[]>();
  private hud!: Hud;
  private kitchen!: Kitchen;
  private tipJar!: TipJar;
  private appetiteText?: Phaser.GameObjects.Text;
  private bossMeter?: Phaser.GameObjects.Graphics;
  private bossMeterLabel?: Phaser.GameObjects.Text;
  /** Bottom of the boss panel, so headlines can sit just under it. */
  private bossPanelBottom = 0;
  /** The headline on screen; a new one replaces it rather than piling on. */
  private headline?: Phaser.GameObjects.Text;
  private store!: SaveStore;
  private lang: Lang = 'en';
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
  private score = 0;
  private registerScore?: Phaser.GameObjects.Text;
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
    const store = new SaveStore(safeLocalStorage());
    this.store = store;
    setMuted(this.demo || !store.settings().sound);
    this.lang = this.demo ? 'en' : store.settings().lang;
    this.engine = new ShiftEngine({
      config: this.config,
      maxCustomersCap: this.maxSlots,
      // A fixed seed makes the frozen demo state reproducible shot-to-shot.
      rng: this.demo ? mulberry32(this.demoSeed) : undefined,
      // Weak keys from earlier shifts turn up in more of this shift's orders.
      focus: this.demo ? undefined : practiceFocus(store.typingTally()),
      houseOrders: store.settings().fancyOrders,
      // The design preview keeps the original full-speed pacing.
      pace: this.demo ? 'rush' : store.settings().pace,
      vocabulary: VOCABULARIES[this.lang],
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
    this.kitchen = new Kitchen(this, this.kitchenLayout(), { pot: DEPTH.prep, lane: DEPTH.lane, dropped: DEPTH.dropped });
    this.tipJar = new TipJar(this, ...this.tipJarPlace(), DEPTH.prep + 2);
    this.hud = new Hud(this);
    this.hud.layout(width, height);
    if (this.config.boss) {
      // How much the boss still wants, under the shift name.
      this.appetiteText = this.add.text(width / 2, this.counterY() * 0.17 + 44 * this.uiScale, '', {
        fontFamily: FONTS.slab, fontSize: '22px', color: COLORS.mustard, stroke: COLORS.dark, strokeThickness: 5,
      }).setOrigin(0.5, 0).setScale(this.uiScale).setDepth(DEPTH.hud);
      // His patience as a wide meter under the counter of dishes.
      const bossName = this.config.id === 'boss-lou' ? (this.lang === 'fr' ? 'PATIENCE DU GROS LOU' : "BIG LOU'S PATIENCE")
        : this.lang === 'fr' ? 'PATIENCE DE GROS-SOUS' : "MONEYBAGS' PATIENCE";
      this.bossMeterLabel = this.add.text(0, 0, bossName, {
        fontFamily: FONTS.sans, fontSize: '13px', fontStyle: 'bold', color: COLORS.cream, stroke: COLORS.dark, strokeThickness: 4,
      }).setOrigin(0.5, 1).setDepth(DEPTH.hud);
      this.bossMeter = this.add.graphics().setDepth(DEPTH.hud - 1);
    }
    if (!this.demo) {
      this.hud.addSoundToggle(!isMuted(), (on) => {
        setMuted(!on);
        store.updateSettings({ sound: on });
        if (on) {
          unlockAudio();
          play('bell');
        }
      });
    }
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
        unlockAudio();
        if (this.gamePaused) this.resumeGame();
        // Keep the phone keyboard up when the player taps a customer.
        else this.hidden?.focus();
      });

      // Escape lets go of the current order (its progress is kept).
      const onEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && !this.gamePaused) this.engine.releaseLock();
      };
      window.addEventListener('keydown', onEscape);
      this.cleanupFns.push(() => window.removeEventListener('keydown', onEscape));
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
      this.kitchen.reposition(this.kitchenLayout());
      this.tipJar.reposition(...this.tipJarPlace());
      for (const c of this.engine.activeCustomers) {
        const view = this.views.get(c.id);
        view?.setUiScale(this.uiScale);
        view?.reposition(this.slotX(c.slot) + this.jitterFor(c.id), this.customerY());
      }
      this.hud.layout(w, h);
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
    this.drawBossMeter();
  }

  /** The boss's patience, big and centred under the dish counter; it shakes when nearly gone. */
  private drawBossMeter() {
    const boss = this.engine.boss;
    if (!this.bossMeter || !this.bossMeterLabel || !this.appetiteText) return;
    this.bossMeter.clear();
    this.bossMeterLabel.setVisible(Boolean(boss));
    if (!boss) return;
    const f = Math.max(0, boss.patienceMs / boss.patienceTotalMs);
    const w = Math.min(320, this.scale.width * 0.72);
    const h = 16 * Math.max(this.uiScale, 0.8);
    const jitter = f < 0.25 ? Math.sin(this.time.now / 40) * 3 : 0;
    const x = this.scale.width / 2 - w / 2 + jitter;
    const y = this.appetiteText.y + this.appetiteText.displayHeight + 22 * this.uiScale;
    const color = f > 0.5 ? 0x27ae60 : f > 0.25 ? COLORS.mustardHex : COLORS.redHex;
    this.bossMeterLabel.setPosition(this.scale.width / 2 + jitter, y - 2).setScale(Math.max(this.uiScale, 0.8));
    // a dark panel behind the counter and meter, so they read over the neon sign
    const top = this.appetiteText.y - 6;
    this.bossMeter.fillStyle(COLORS.darkHex, 0.7).fillRoundedRect(x - 14, top, w + 28, y + h + 10 - top, 10);
    this.bossPanelBottom = y + h + 10;
    this.bossMeter.fillStyle(COLORS.darkHex, 0.85).fillRoundedRect(x - 3, y - 3, w + 6, h + 6, 6);
    this.bossMeter.fillStyle(0x4a4540, 1).fillRoundedRect(x, y, w, h, 4);
    if (f > 0) this.bossMeter.fillStyle(color, 1).fillRoundedRect(x, y, Math.max(8, w * f), h, 4);
    this.bossMeter.fillStyle(0xffffff, 0.25).fillRect(x + 4, y + 2, Math.max(0, w * f - 8), h * 0.3);
  }

  // ---- input ----

  private onChar(ch: string) {
    unlockAudio();
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
      const seated = new Set([...this.views.values()].map((v) => v.character));
      const boss = customer.special === 'boss' && this.config.boss;
      const bossPose = boss ? POSES.find((p) => p.key === boss.poses[0]) : undefined;
      const pose = bossPose ?? pickPose(customer.order, seated, Math.random, this.config.maxCustomerTier);
      const view = new CustomerView(
        this,
        customer,
        pose,
        this.slotX(customer.slot) + this.jitterFor(customer.id),
        this.customerY(),
        DEPTH.ticket,
        DEPTH.ticketActive,
        this.uiScale,
        bossPose ? {} : this.ticketLayoutFor(customer.id),
        bossPose ? 1.35 : 1,
      );
      view.setDepth(DEPTH.customer);
      if (bossPose) {
        view.hideBar();
        play('rush');
        this.banner(this.config.name.replace(/^.*?:\s*/, '').toUpperCase(), COLORS.mustard);
        this.time.delayedCall(900, () => view.say(bossLine(this.config.id, 'intro', this.lang), 1800));
      }
      // Tap a customer to work on their order instead; tap again to let it go.
      view.onTap(() => {
        if (this.gamePaused) return;
        if (this.engine.lockedCustomerId === customer.id) this.engine.releaseLock();
        else this.engine.selectCustomer(customer.id);
      });
      this.views.set(customer.id, view);
    });

    e.on('orderLocked', ({ customerId }) => {
      play('key');
      this.views.get(customerId)?.setLocked(true);
      this.views.get(customerId)?.updateTyping(this.engine.typedCount);
    });

    e.on('orderReleased', ({ customerId }) => {
      this.views.get(customerId)?.setLocked(false);
    });

    e.on('orderProgress', ({ customerId, typedCount }) => {
      play('key');
      // A paused order picked up again from the keyboard lights up as well.
      const view = this.views.get(customerId);
      if (view && !view.isLocked) view.setLocked(true);
      view?.updateTyping(typedCount);
    });

    e.on('wordCompleted', ({ customerId, wordIndex }) => {
      play('key');
      this.views.get(customerId)?.updateTyping(this.engine.typedCount);
      this.dropWord(customerId, wordIndex);
    });

    e.on('orderServed', ({ customerId, tip, finalWordIndex, patienceLeft, stays }) => {
      this.dropWord(customerId, finalWordIndex);
      const view = this.views.get(customerId);
      if (view && !this.demo) this.store.recordMet(view.character);
      view?.flashComplete();
      const tx = view?.x ?? this.scale.width / 2;
      const ty = view?.y ?? this.scale.height * 0.4;
      const order = this.engine.orderOf(customerId);
      // The dish comes out once the last word has landed in the pot.
      this.time.delayedCall(420, () => {
        if (!order) return view?.serve(() => this.views.delete(customerId));
        this.kitchen.serve(order, tx, () => {
          play('bell');
          // The tip is left on the counter beside the plate, then goes in the jar.
          const side = tx < this.registerX() ? 1 : -1;
          // A Finger-Counter's row of plates is wider, so his coins go further out.
          const spread = (46 + ((order.fingers ?? 1) - 1) * 24) * this.uiScale;
          this.tipJar.addTip(tx + side * spread, this.kitchenLayout().laneY + 8 * this.uiScale, tip, this.engine.score);
          // Served in the green: delighted; yellow: pleased; red: about time.
          const mood = patienceLeft >= 0.5 ? 'delighted' : patienceLeft >= 0.2 ? 'pleased' : 'grumpy';
          if (mood === 'delighted') play('cheer');
          // A diner stays on and munches until the next course; everyone else leaves.
          const after = stays
            ? () => view?.startEating(line('eating', this.lang))
            : () => view?.serve(() => this.views.delete(customerId));
          if (view) view.cheer(mood, reaction(mood, this.lang), after);
          else after();
        });
      });
      this.setRegisterScore(this.engine.score);
      this.impaleReceipt(tx, this.counterY());
      this.popTip(tx, ty - 60, tip);
    });

    e.on('orderChanged', ({ customer }) => {
      play('swap');
      this.orderWords.set(customer.id, customer.order.words);
      const view = this.views.get(customer.id);
      view?.replaceOrder(customer.order, line('changed', this.lang));
      if (this.engine.lockedCustomerId === customer.id) {
        view?.setLocked(true);
        view?.updateTyping(0);
      }
    });

    e.on('nextCourse', ({ customer }) => {
      play('coin');
      const before = this.orderWords.get(customer.id)?.join(' ');
      this.orderWords.set(customer.id, customer.order.words);
      const say = customer.special !== 'boss'
        ? line('course', this.lang)
        : bossLine(this.config.id, before === customer.order.text ? 'sentBack' : 'more', this.lang);
      this.views.get(customer.id)?.replaceOrder(customer.order, say);
    });

    e.on('bossAppetite', ({ left }) => {
      if (!this.appetiteText) return;
      const label = this.lang === 'fr' ? `ENCORE ${left} PLAT${left > 1 ? 'S' : ''}` : `${left} DISH${left === 1 ? '' : 'ES'} TO GO`;
      this.appetiteText.setText(label).setVisible(left > 0);
      this.tweens.add({ targets: this.appetiteText, scale: 1.2 * this.uiScale, duration: 90, yoyo: true });
    });

    e.on('bossMove', ({ kind, customerId }) => {
      const view = this.views.get(customerId);
      const say = bossLine(this.config.id, kind === 'sendBack' ? 'sendBackWarn' : kind, this.lang);
      if (kind === 'hurry') {
        play('grumble');
        this.banner(say, COLORS.red);
        this.cameras.main.shake(200, 0.006);
      } else if (kind === 'scramble') {
        play('swap');
        view?.scrambleTicket(2200);
        view?.say(say, 1600);
      } else {
        play('swap');
        view?.say(say, 1600);
      }
    });

    e.on('rushStarted', () => {
      play('rush');
      this.banner(line('rush', this.lang), COLORS.mustard);
    });

    e.on('rushEnded', ({ cleared, bonus }) => {
      if (cleared) {
        play('cheer');
        this.banner(`${line('rushCleared', this.lang)} +${formatMoney(bonus)}`, COLORS.cream);
        this.setRegisterScore(this.engine.score);
      } else {
        this.banner(line('rushMissed', this.lang), COLORS.cream);
      }
    });

    e.on('customerLeft', ({ customerId, strikes }) => {
      const view = this.views.get(customerId);
      play('grumble');
      view?.stormOut(() => this.views.delete(customerId));
      this.hud.setStrikes(strikes);
      this.cameras.main.shake(150, 0.008);
    });

    e.on('mistake', () => {
      play('mistake');
      this.flashRegister();
      this.kitchen.shake();
    });

    e.on('shiftEnded', ({ result }) => {
      if (this.config.boss) {
        const won = result.won;
        if (won) play('cheer');
        this.banner(bossLine(this.config.id, won ? 'beaten' : 'lost', this.lang), won ? COLORS.mustard : COLORS.red);
      }
      // A boss night lingers so the last dish and the verdict can be seen.
      this.time.delayedCall(this.config.boss ? 2600 : 700, () =>
        this.scene.start('results', { config: this.config, result }),
      );
    });
  }

  /** A finished word falls from its ticket into the pot. */
  private dropWord(customerId: number, wordIndex: number) {
    const word = this.orderWords.get(customerId)?.[wordIndex];
    const view = this.views.get(customerId);
    if (!word || !view) return;
    const { x, y } = view.ticketPosition;
    this.kitchen.dropWord(word, x, y);
  }

  // ---- layout & scenery ----

  private registerX(): number {
    return this.scale.width * 0.82;
  }

  /** The tip jar stands on top of the cash register. */
  private tipJarPlace(): [number, number, number] {
    return [this.registerX() - 8 * this.uiScale, this.stoveY() - 44 * this.uiScale * 1.1, this.uiScale];
  }

  private slotX(slot: number): number {
    const w = this.scale.width;
    return w * (0.1 + (0.8 * (slot + 0.5)) / this.maxSlots);
  }

  private counterY(): number {
    return this.scale.height * COUNTER_Y_FRACTION;
  }

  private stoveX(): number {
    return this.scale.width / 2;
  }

  private stoveY(): number {
    return this.scale.height * STOVE_Y_FRACTION;
  }

  private counterTopHeight(): number {
    return this.scale.height * COUNTER_TOP_FRACTION;
  }

  private kitchenLayout(): KitchenLayout {
    return {
      potX: this.stoveX(),
      potBaseY: this.stoveY(),
      laneY: this.counterY() + this.counterTopHeight() * 0.3,
      scale: this.uiScale,
    };
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

  /**
   * Tickets share one row, centred on their seat (not the customer's nudge),
   * and wrap to the seat's width so neighbours never collide.
   */
  private ticketLayoutFor(id: number): { maxWidth: number; dx: number } {
    const seat = (this.scale.width * 0.8) / this.maxSlots;
    const ts = Math.max(this.uiScale, MIN_TICKET_SCALE);
    return { maxWidth: Math.min(230, seat / ts - 10), dx: -this.jitterFor(id) / this.uiScale };
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
    // A boss night keeps the menu board of the day it follows; overtime gets the weirdest.
    const day = (this.config as { after?: string }).after ?? this.config.id;
    const shiftIndex = SHIFTS.findIndex((s) => s.id === day);
    const menuIndex = shiftIndex >= 0 ? shiftIndex : SHIFTS.length;

    // The register (and its score text) is part of staticScenery and gets
    // destroyed/rebuilt here; kill any in-flight score pop/flash tween first so
    // it never targets the about-to-be-destroyed text after a resize.
    if (this.registerScore) this.tweens.killTweensOf(this.registerScore);
    this.backdrop?.destroy();
    for (const o of this.staticScenery) o.destroy();
    this.staticScenery = [];
    const keep = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      this.staticScenery.push(o);
      return o;
    };

    // wall scene (window, menu board, big neon marquee) behind everything
    this.backdrop = new DinerBackdrop(this, width, counterY, menuIndex, ui, this.lang);

    // shift-name subtitle, between the strike plates and the neon marquee
    // (kept above the neon so it never collides with the centered order bubbles)
    keep(this.add.text(width / 2, counterY * 0.17 + 18 * ui, this.config.name.toUpperCase(), {
      fontFamily: FONTS.sans, fontSize: '15px', fontStyle: 'bold', color: COLORS.cream,
    }).setOrigin(0.5, 0).setScale(ui));

    // starburst wall clock
    const clock = makeStarburst(this, width - 52 * ui, 52 * ui, 44, '').setScale(ui);
    this.clockText = this.add.text(0, 0, clockLabel(this.config.durationMs, this.shiftElapsedMs), {
      fontFamily: FONTS.sans, fontSize: '17px', fontStyle: 'bold', color: COLORS.dark,
    }).setOrigin(0.5);
    clock.add(this.clockText);
    keep(clock);

    // Counter top in perspective (narrower at the back), red trim on the near
    // edge, then the steel front panel down to the bottom. Explicit depth so it
    // occludes the customers' legs.
    const topH = height * COUNTER_TOP_FRACTION;
    const frontY = counterY + topH;
    const inset = COUNTER_INSET * ui;
    const top = this.add.graphics();
    top.fillStyle(COLORS.counter, 1).fillPoints([
      new Phaser.Math.Vector2(inset, counterY), new Phaser.Math.Vector2(width - inset, counterY),
      new Phaser.Math.Vector2(width, frontY), new Phaser.Math.Vector2(0, frontY),
    ], true);
    top.fillStyle(COLORS.redHex, 1).fillRect(0, counterY - 2, width, 4);
    const panel = this.add.graphics();
    panel.fillStyle(COLORS.redHex, 1).fillRect(0, frontY, width, 6);
    // brushed steel, brightest down the middle
    panel.fillGradientStyle(0xc3c8cc, 0xe0e3e5, 0xc3c8cc, 0xe0e3e5, 1).fillRect(0, frontY + 6, width / 2, height - frontY);
    panel.fillGradientStyle(0xe0e3e5, 0xb9bec2, 0xe0e3e5, 0xb9bec2, 1).fillRect(width / 2, frontY + 6, width / 2, height - frontY);
    keep(this.add.container(0, 0, [top, panel]).setDepth(DEPTH.counter));

    // Condiments stand in one row along the near edge, clustered in the gaps
    // between seats so the lane behind them stays clear for sliding dishes.
    const gaps = [0, ...Array.from({ length: this.maxSlots - 1 }, (_, i) => i + 1), this.maxSlots]
      .map((g) => (g === 0 ? width * 0.05 : g === this.maxSlots ? width * 0.95 : (this.slotX(g - 1) + this.slotX(g)) / 2));
    gaps.forEach((gx, i) =>
      keep(makeCondimentGroup(this, gx, frontY - 2, i).setScale(ui).setDepth(DEPTH.condiments)),
    );

    // Spike and register stand in the front panel either side of the pot.
    this.spikeX = width * 0.16;
    this.spikeY = this.stoveY();
    keep(makeReceiptSpike(this, this.spikeX, this.spikeY).setDepth(DEPTH.prep + 1).setScale(ui));

    // vintage cash register right of the pot; the running score lives in its window
    const register = makeCashRegister(this, this.registerX(), this.stoveY(), formatMoney(this.score));
    register.container.setDepth(DEPTH.prep + 1).setScale(ui * 1.1);
    this.registerScore = register.scoreText;
    keep(register.container);

    // re-seat receipts already on the spike against the rebuilt geometry
    for (const r of this.receipts) {
      r.view.setPosition(this.receiptRestX(r.jx), this.receiptRestY(r.index)).setDepth(DEPTH.counter + 3);
    }
  }

  /** A big slab headline across the wall that pops in and fades. */
  /**
   * An event headline (rush, boss lines) in the strip under the plates and
   * clock, above every order ticket, so it never hides an order.
   */
  private banner(text: string, color: string) {
    const { width } = this.scale;
    const s = Math.max(this.uiScale, 0.7);
    // In the top strip, above every ticket; under the boss panel on boss nights.
    if (this.engine.boss && !this.bossPanelBottom) this.drawBossMeter();
    const y = this.engine.boss ? this.bossPanelBottom + 20 * s : 74 * s;
    const label = this.add.text(width / 2, y, text, {
      fontFamily: FONTS.slab, fontSize: '26px', color, stroke: COLORS.dark, strokeThickness: 5, align: 'center',
    }).setOrigin(0.5).setDepth(DEPTH.overlay).setScale(0).setAngle(-3);
    if (this.headline) { this.tweens.killTweensOf(this.headline); this.headline.destroy(); }
    this.headline = label;
    const fit = Math.min(s, (width * 0.92) / label.width);
    this.tweens.add({ targets: label, scale: fit, duration: 240, ease: 'Back.Out' });
    this.tweens.add({ targets: label, alpha: 0, y: label.y - 16, delay: 1500, duration: 400, onComplete: () => label.destroy() });
  }

  /** Big, lingering tip pop above the served customer. */
  private popTip(x: number, y: number, tipCents: number) {
    const label = this.add.text(x, y, `+${formatMoney(tipCents)}`, {
      fontFamily: FONTS.slab, fontSize: '34px', color: COLORS.mustard,
      stroke: COLORS.dark, strokeThickness: 4,
    }).setOrigin(0.5).setDepth(DEPTH.tip).setScale(0);
    this.tweens.add({ targets: label, scale: 1, duration: 180, ease: 'Back.Out' });
    this.tweens.add({
      targets: label, y: y - 120, duration: 1600, ease: 'Sine.Out',
    });
    this.tweens.add({
      targets: label, alpha: 0, delay: 1100, duration: 500,
      onComplete: () => label.destroy(),
    });
  }

  /** Update the cash-register display and pop it. */
  private setRegisterScore(cents: number) {
    if (cents > this.score) play('register');
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
    this.setRegisterScore(1875);
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
