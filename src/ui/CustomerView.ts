import Phaser from 'phaser';
import type { CustomerState, Order } from '../core/types';
import { PLACEHOLDER_KEY } from './assets';
import { HEADS, type PoseDef } from './cast';
import { COLORS, FONTS, makeLiveTicket, makeStarburst, type LiveTicket } from './theme';
import { fitPose, SPRITE_HEIGHT } from './headFit';

const TICKET_GAP = 14;

/** Speech balloons on screen, per scene, so a new one can move clear of them. */
const VIEWS = new WeakMap<Phaser.Scene, Set<CustomerView>>();
/** Each new balloon tucks just behind the ones already up, so their words stay whole. */
let balloonCount = 0;
const LIVE_BALLOONS = new WeakMap<Phaser.Scene, Set<{ x: number; y: number; hw: number; hh: number }>>();

// The customer sprite may shrink to uiScale 0.5 on a phone, but the order
// bubble must stay readable, so the ticket scales on its own higher floor.
export const MIN_TICKET_SCALE = 0.78;

export class CustomerView extends Phaser.GameObjects.Container {
  readonly customerId: number;
  /** Who is standing here, so the scene never seats the same person twice. */
  readonly character: string;
  private ticket: LiveTicket;
  private bar!: Phaser.GameObjects.Graphics;
  private sprite: Phaser.GameObjects.Image;
  private ticketHalf1 = 0; // ticket half-height measured at scale 1
  private ticketHalfW1 = 0; // and half-width
  private tapHandler?: () => void;
  private barHidden = false;
  /** Depth the scene gave this customer (served ones step behind newcomers). */
  private baseDepth = 0;

  setDepth(value: number): this {
    if (this.baseDepth === 0) this.baseDepth = value;
    return super.setDepth(value);
  }
  /** Ticket layout: widest it may wrap to (unscaled), and its x offset from the customer. */
  private ticketMaxWidth: number;
  private ticketDx: number;
  private ticketDepth: number;
  private activeTicketDepth: number;
  private uiScale: number;
  private locked = false;
  private barY = -(SPRITE_HEIGHT + 12);
  /** Local y of the top of the head, for speech bubbles and hearts. */
  private headY = -SPRITE_HEIGHT;
  /** Fades a served order's ticket ahead of the customer, so it never covers a newcomer's. */
  private ticketFade = { alpha: 1 };

  constructor(
    scene: Phaser.Scene,
    customer: CustomerState,
    pose: PoseDef,
    x: number,
    y: number,
    ticketDepth = 50,
    activeTicketDepth = ticketDepth + 1,
    uiScale = 1,
    ticketLayout: { maxWidth?: number; dx?: number } = {},
    /** Draw bigger than everyone else (the boss) */
    sizeBoost = 1,
  ) {
    super(scene, x, y);
    this.customerId = customer.id;
    this.character = pose.character;
    this.ticketDepth = ticketDepth;
    this.activeTicketDepth = activeTicketDepth;
    this.uiScale = uiScale;

    const key = scene.textures.exists(pose.key) ? pose.key : PLACEHOLDER_KEY;
    this.sprite = scene.add.image(0, 0, key).setOrigin(0.5, 1);
    const base = fitPose(key === pose.key ? HEADS[pose.key] : undefined, this.sprite.height);
    const fit = { scale: base.scale * sizeBoost, bottom: base.bottom * sizeBoost, top: base.top * sizeBoost };
    this.sprite.setScale(fit.scale).setY(fit.bottom);
    // Patience bar just above the figure, but never higher than for a full-height pose.
    // The patience bar (and the ticket above it) sit on one line for everyone,
    // whatever the pose (a hat or raised hand may tuck behind the ticket);
    // only an outsized figure (the boss) goes higher.
    this.barY = (sizeBoost > 1 ? Math.min(fit.top, -SPRITE_HEIGHT) : -SPRITE_HEIGHT) - 12;
    this.headY = fit.bottom - (this.sprite.height - (HEADS[pose.key]?.[0] ?? 0)) * fit.scale;

    // The order ticket is NOT a child of this container: it lives at scene level
    // on a high depth so the order you're typing is never hidden behind the
    // counter, props, or HUD. It trails the customer via positionTicket().
    this.ticketMaxWidth = ticketLayout.maxWidth ?? 230;
    this.ticketDx = ticketLayout.dx ?? 0;
    this.ticket = this.buildTicket(customer.order);
    this.ticket.container.setScale(0);

    this.add(this.sprite);
    scene.add.existing(this);
    const views = VIEWS.get(scene) ?? new Set();
    VIEWS.set(scene, views);
    views.add(this);

    // The whole customer (sprite + bar) shrinks with the viewport via container
    // scale; the detached ticket is scaled to match.
    this.setScale(0);
    this.positionTicket();
    scene.tweens.add({ targets: this, scale: uiScale, duration: 250, ease: 'Back.Out' });
    scene.tweens.add({ targets: this.ticket.container, scale: this.ticketScale(), duration: 250, ease: 'Back.Out' });
    scene.tweens.add({
      targets: this.sprite, y: '-=4', duration: 1100 + (customer.id % 5) * 90,
      yoyo: true, repeat: -1, ease: 'Sine.InOut',
    });

    scene.events.on(Phaser.Scenes.Events.UPDATE, this.positionTicket, this);
  }

  /** Keep the floating ticket pinned above the customer (position + fade only;
   *  scale is left to the intro/lock/complete tweens). */
  private positionTicket = () => {
    // A customer destroyed during this frame's update can still get this call.
    if (!this.scene) return;
    // Every ticket hangs from the same line (its bottom), so the orders read as
    // one row; taller, wrapped tickets grow upward.
    const barTopWorld = this.y + this.barY * this.uiScale;
    const y = barTopWorld - TICKET_GAP * this.uiScale - this.ticketHalf1 * this.ticketScale();
    // Keep long tickets on screen at the end seats.
    const half = this.ticketHalfW1 * this.ticketScale() * (this.locked ? 1.12 : 1);
    const w = this.scene.scale.width;
    const cx = this.x + this.ticketDx * this.uiScale;
    const x = half * 2 + 8 < w ? Phaser.Math.Clamp(cx, half + 4, w - half - 4) : w / 2;
    this.ticket.container.setPosition(x, y);
    this.ticket.container.setAlpha(this.alpha * this.ticketFade.alpha);
  };

  /** Where the order ticket floats, so finished words can fall from it into the pot. */
  get ticketPosition(): { x: number; y: number } {
    return { x: this.ticket.container.x, y: this.ticket.container.y };
  }

  /** Re-seat the customer and its trailing ticket after a viewport resize. */
  reposition(x: number, y: number) {
    this.setPosition(x, y);
    this.positionTicket();
  }

  /** Re-scale the customer + ticket when the viewport (and thus uiScale) changes. */
  setUiScale(s: number) {
    this.uiScale = s;
    this.setScale(s);
    const ts = this.ticketScale();
    this.ticket.setBaseScale(ts);
    this.ticket.container.setScale(this.locked ? ts * 1.12 : ts);
    this.positionTicket();
  }

  /** Bubble scale: customer uiScale, but never below a legible floor. */
  private ticketScale(): number {
    return Math.max(this.uiScale, MIN_TICKET_SCALE);
  }

  /**
   * A fresh ticket for `order`. A Finger-Counter special hides its count
   * word: read it off his hand. ticketHalf1 is the ticket's half-height at
   * scale 1; positionTicket scales it by ticketScale() (which floors at
   * MIN_TICKET_SCALE) so the bubble stays legible even when the customer
   * sprite shrinks; it wraps to ticketMaxWidth so neighbouring tickets on the
   * shared row don't collide.
   */
  private buildTicket(order: Order): LiveTicket {
    const hidden = order.fingers ? order.words[0].length : 0;
    const ticket = makeLiveTicket(this.scene, this.x, this.y, order.text, this.ticketMaxWidth, hidden);
    this.ticketHalf1 = ticket.height / 2;
    this.ticketHalfW1 = ticket.width / 2;
    ticket.setBaseScale(this.ticketScale());
    ticket.container.setDepth(this.ticketDepth);
    // The patience strip rides on the ticket, so no art can hide it.
    this.bar = this.scene.add.graphics().setVisible(!this.barHidden);
    ticket.container.add(this.bar);
    if (this.tapHandler) this.makeTicketTappable(ticket);
    return ticket;
  }

  private makeTicketTappable(ticket: LiveTicket) {
    const { width: w, height: h } = ticket;
    ticket.container
      .setInteractive(new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h), Phaser.Geom.Rectangle.Contains)
      .on('pointerdown', () => this.tapHandler?.());
  }

  /** Tapping the customer or their ticket calls `onTap` (switch to / let go of this order). */
  onTap(onTap: () => void) {
    this.tapHandler = onTap;
    this.sprite.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.tapHandler?.());
    this.makeTicketTappable(this.ticket);
  }

  /**
   * Swap in a new order: a fickle customer changing their mind, or a diner
   * ordering the next course. The old ticket shrinks away, a new one pops up,
   * and the customer says `announce`.
   */
  replaceOrder(order: Order, announce?: string) {
    const old = this.ticket.container;
    this.scene.tweens.add({ targets: old, scale: 0, duration: 150, onComplete: () => old.destroy() });
    this.ticket = this.buildTicket(order);
    this.ticketFade.alpha = 1;
    this.bar.setVisible(!this.barHidden);
    this.setDepth(this.baseDepth);
    this.locked = false;
    this.ticket.container.setScale(0);
    this.positionTicket();
    this.scene.tweens.add({ targets: this.ticket.container, scale: this.ticketScale(), duration: 220, ease: 'Back.Out' });
    if (announce) this.say(announce);
  }

  /** The boss's patience lives in the big meter at the top instead. */
  hideBar() {
    this.bar.setVisible(false);
    this.barHidden = true;
  }

  /** Jumble the ticket's remaining letters for a moment. */
  scrambleTicket(ms: number) {
    this.ticket.scramble(ms);
  }

  /** Munch on the course just served while the next order waits. */
  startEating(phrase: string) {
    this.bar.setVisible(false);
    this.say(phrase, 1400);
    this.scene.tweens.add({ targets: this.sprite, angle: 3, duration: 180, yoyo: true, repeat: 5 });
  }

  /**
   * A comic-book balloon floating above the customer's order ticket, its tail
   * curling down toward them: an oval for talk, a jagged burst for shouting
   * (red lines). Hand-lettered capitals, like the funny pages. It sits in the
   * wall space over the tickets, so it never covers an order or a face.
   */
  say(phrase: string, hold = 900, color: string = COLORS.dark) {
    const scene = this.scene;
    if (!scene) return;
    const ts = this.ticketScale();
    const sc = ts * 0.92;
    const shout = color === COLORS.red;
    // Quieter than the order tickets (softer ink, warmer paper), so the orders
    // stay what the eye goes to, but solid so the words read cleanly.
    const label = scene.add.text(0, 0, phrase.toUpperCase(), {
      fontFamily: FONTS.sans, fontSize: '15px', fontStyle: 'bold', color: shout ? '#a8473a' : '#5a5248', align: 'center',
      wordWrap: { width: 170 }, lineSpacing: -2,
    }).setOrigin(0.5);
    const rx = label.width / 2 + 18;
    const ry = label.height / 2 + 12;
    const k = shout ? 1.22 : 1;
    const hw = rx * k * sc;
    const hh = ry * k * sc;
    const TAIL = 12;

    // Above the speaker's ticket (so never over anyone's art), nudged sideways
    // or further up to keep clear of other tickets and balloons.
    let live = LIVE_BALLOONS.get(scene);
    if (!live) {
      live = new Set();
      LIVE_BALLOONS.set(scene, live);
      scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => LIVE_BALLOONS.delete(scene));
    }
    const balloons = live;
    const W = scene.scale.width;
    const ticket = this.ticket.container;
    const ticketTop = ticket.y - this.ticketHalf1 * ts;
    const obstacles = [
      ...balloons,
      ...[...(VIEWS.get(scene) ?? [])].map((v) => {
        const b = v.ticket.container.getBounds();
        return { x: b.centerX, y: b.centerY, hw: b.width / 2, hh: b.height / 2 };
      }),
    ];
    const overlap = (cx: number, cy: number) => obstacles.reduce((sum, o) => {
      const ox = Math.max(0, Math.min(cx + hw, o.x + o.hw) - Math.max(cx - hw, o.x - o.hw));
      const oy = Math.max(0, Math.min(cy + hh, o.y + o.hh) - Math.max(cy - hh, o.y - o.hh));
      return sum + ox * oy;
    }, 0);
    const minY = 58 + hh;
    let best = { x: ticket.x, y: ticketTop - hh, cost: Infinity };
    for (let step = 0; step < 6; step++) {
      for (const shift of [0, -0.5, 0.5]) {
        const cx = Phaser.Math.Clamp(ticket.x + shift * hw, hw + 4, W - hw - 4);
        const cy = Math.max(minY, ticketTop - (TAIL + 4) * sc - hh - step * (hh + 6));
        const cost = overlap(cx, cy) + step * hw * 3 + Math.abs(shift) * hw * 2;
        if (cost < best.cost) best = { x: cx, y: cy, cost };
      }
    }
    const { x, y } = best;
    const slot = { x, y, hw, hh };
    balloons.add(slot);

    // A short, plain tail pointing down at the speaker's ticket.
    const toward = Phaser.Math.Clamp((ticket.x - x) / sc, -rx * 0.4, rx * 0.4);
    const tail = (grow: number) => [
      new Phaser.Math.Vector2(toward - 9 - grow, ry * k * 0.7),
      new Phaser.Math.Vector2(toward + 9 + grow, ry * k * 0.7),
      new Phaser.Math.Vector2(toward * 1.2, ry * k + TAIL + grow * 1.5),
    ];
    const burst = (grow: number) => {
      const pts: Phaser.Math.Vector2[] = [];
      const n = 18;
      for (let i = 0; i < n * 2; i++) {
        const a = (i / (n * 2)) * Math.PI * 2;
        const r = i % 2 ? 1.0 : 1.22;
        pts.push(new Phaser.Math.Vector2(Math.cos(a) * (rx * r + grow), Math.sin(a) * (ry * r + grow)));
      }
      return pts;
    };
    const body = (g: Phaser.GameObjects.Graphics, grow: number) => {
      if (shout) g.fillPoints(burst(grow), true);
      else g.fillEllipse(0, 0, rx * 2 + grow * 2, ry * 2 + grow * 2);
    };
    const g = scene.add.graphics();
    // ink outline (tail and body drawn 2.5 bigger), then paper over it
    g.fillStyle(0x6f6556, 1);
    g.fillPoints(tail(2.5), true);
    body(g, 2.5);
    g.fillStyle(shout ? 0xf0e0b4 : 0xeee4cf, 1);
    g.fillPoints(tail(0), true);
    body(g, 0);
    // Behind every ticket; each new balloon tucks behind the ones already up.
    balloonCount = (balloonCount + 1) % 1000;
    const bubble = scene.add.container(x, y, [g, label]).setDepth(this.ticketDepth - 2 - balloonCount * 0.0005).setScale(0);
    scene.tweens.add({ targets: bubble, scale: sc, duration: 170, ease: 'Back.Out' });
    if (shout) scene.tweens.add({ targets: label, angle: 3, duration: 70, yoyo: true, repeat: 3, delay: 170 });
    scene.tweens.add({
      targets: bubble, alpha: 0, delay: hold, duration: 220,
      onComplete: () => {
        balloons.delete(slot);
        bubble.destroy();
      },
    });
  }



  get isLocked(): boolean {
    return this.locked;
  }

  setLocked(locked: boolean) {
    this.locked = locked;
    // The order being typed jumps above every other ticket (and the HUD).
    this.ticket.container.setDepth(locked ? this.activeTicketDepth : this.ticketDepth);
    const ts = this.ticketScale();
    this.scene.tweens.add({
      targets: this.ticket.container,
      scaleX: locked ? ts * 1.12 : ts,
      scaleY: locked ? ts * 1.12 : ts,
      duration: 120,
    });
  }

  updateTyping(typedCount: number) {
    this.ticket.update(typedCount);
  }

  /** Order's up: flash the whole ticket green so the finish is unmistakable. */
  /**
   * Flash the finished ticket green, then tuck it under every other ticket
   * and fade it out while the dish is still on its way: the seat is free
   * again at once, and a new customer's ticket must show straight away.
   */
  flashComplete() {
    this.ticket.complete();
    this.locked = false;
    this.ticket.container.setDepth(this.ticketDepth - 1);
    this.bar.setVisible(false);
    this.setDepth(this.baseDepth - 0.5); // and step behind whoever sits down next
    this.scene.tweens.add({ targets: this.ticketFade, alpha: 0, delay: 260, duration: 240 });
  }

  updatePatience(fraction: number) {
    const f = Math.max(0, fraction);
    const color = f > 0.5 ? 0x27ae60 : f > 0.2 ? COLORS.mustardHex : COLORS.redHex;
    // a strip along the top of the ticket, inside its border
    const w = this.ticketHalfW1 * 2 - 8;
    const y = -this.ticketHalf1 + 4;
    this.bar.clear();
    this.bar.fillStyle(COLORS.darkHex, 0.12).fillRect(-w / 2, y, w, 5);
    this.bar.fillStyle(color, 1).fillRect(-w / 2, y, w * f, 5);
    // jitter when about to storm out
    this.sprite.setAngle(f < 0.2 ? Math.sin(this.scene.time.now / 50) * 4 : 0);
  }

  protected preDestroy() {
    VIEWS.get(this.scene)?.delete(this);
    this.scene.events.off(Phaser.Scenes.Events.UPDATE, this.positionTicket, this);
    this.scene.tweens.killTweensOf(this.sprite);
    this.scene.tweens.killTweensOf(this.ticket.container);
    this.ticket.container.destroy();
    super.preDestroy();
  }

  /**
   * React to the dish: delighted customers hop twice with hearts and stars,
   * pleased ones nod with a hop, late ones grumble. A speech bubble says it.
   * `done` fires when the reaction is over.
   */
  cheer(mood: 'delighted' | 'pleased' | 'grumpy', phrase: string, done: () => void) {
    if (!this.scene) return done();
    const scene = this.scene;
    const s = this.uiScale;
    const headX = this.x;
    const headY = this.y + this.headY * s;
    const hops = mood === 'delighted' ? 2 : mood === 'pleased' ? 1 : 0;
    scene.tweens.killTweensOf(this.sprite);
    if (hops) {
      scene.tweens.add({ targets: this.sprite, y: this.sprite.y - 16, duration: 140, yoyo: true, repeat: hops - 1, ease: 'Quad.Out' });
    } else {
      scene.tweens.add({ targets: this.sprite, angle: 4, duration: 60, yoyo: true, repeat: 3 });
    }
    if (mood === 'delighted') {
      for (let i = 0; i < 6; i++) {
        const glyph = scene.add.text(headX, headY + 20 * s, i % 2 ? '★' : '♥', {
          fontFamily: FONTS.sans, fontSize: '20px', color: i % 2 ? COLORS.mustard : COLORS.red,
          stroke: COLORS.dark, strokeThickness: 2,
        }).setOrigin(0.5).setDepth(45).setScale(s);
        const angle = -Math.PI / 2 + (i - 2.5) * 0.45;
        scene.tweens.add({
          targets: glyph, x: headX + Math.cos(angle) * 70 * s, y: headY + 20 * s + Math.sin(angle) * 60 * s,
          alpha: 0, scale: s * 1.4, duration: 800, ease: 'Quad.Out', onComplete: () => glyph.destroy(),
        });
      }
    }
    const hold = mood === 'delighted' ? 900 : 650;
    this.say(phrase, hold, mood === 'grumpy' ? COLORS.red : COLORS.dark);
    scene.time.delayedCall(hold, done);
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
