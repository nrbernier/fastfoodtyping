import Phaser from 'phaser';
import type { CustomerState, Order } from '../core/types';
import { PLACEHOLDER_KEY } from './assets';
import { HEADS, type PoseDef } from './cast';
import { COLORS, FONTS, makeLiveTicket, makeStarburst, type LiveTicket } from './theme';
import { fitPose, SPRITE_HEIGHT } from './headFit';

const TICKET_GAP = 30;

/** Speech balloons on screen, per scene, so a new one can move clear of them. */
const VIEWS = new WeakMap<Phaser.Scene, Set<CustomerView>>();
/** Each new balloon tucks just behind the ones already up, so their words stay whole. */
let balloonCount = 0;
const LIVE_BALLOONS = new WeakMap<Phaser.Scene, Set<{ x: number; y: number; hw: number; hh: number }>>();

/**
 * Head centre and half-width in each pose's image, from the run of figure
 * pixels at eye level nearest the image centre (at that height the row is
 * mostly head, where lower down it can catch arms and props).
 */
const MOUTH_X = new Map<string, { x: number; half: number }>();
function mouthX(scene: Phaser.Scene, key: string, rowY: number, headH: number): { x: number; half: number } {
  const cached = MOUTH_X.get(key);
  if (cached !== undefined) return cached;
  const w = scene.textures.get(key).getSourceImage().width;
  const runs: { start: number; len: number }[] = [];
  let start = -1;
  for (let x = 0; x <= w; x++) {
    const solid = x < w && scene.textures.getPixelAlpha(x, Math.round(rowY), key) > 128;
    if (solid && start < 0) start = x;
    if (!solid && start >= 0) {
      if (x - start > 6) runs.push({ start, len: x - start });
      start = -1;
    }
  }
  const best = runs.sort((a, b) => Math.abs(a.start + a.len / 2 - w / 2) - Math.abs(b.start + b.len / 2 - w / 2))[0];
  const half = Math.min(best ? best.len / 2 : headH * 0.4, headH * 0.5);
  const found = best ? { x: best.start + best.len / 2, half } : { x: w / 2, half };
  MOUTH_X.set(key, found);
  return found;
}
// The customer sprite may shrink to uiScale 0.5 on a phone, but the order
// bubble must stay readable, so the ticket scales on its own higher floor.
const MIN_TICKET_SCALE = 0.78;

export class CustomerView extends Phaser.GameObjects.Container {
  readonly customerId: number;
  /** Who is standing here, so the scene never seats the same person twice. */
  readonly character: string;
  private ticket: LiveTicket;
  private bar: Phaser.GameObjects.Graphics;
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
  private ticketStaggerPx: number;
  private ticketDepth: number;
  private activeTicketDepth: number;
  private uiScale: number;
  private locked = false;
  private barY = -(SPRITE_HEIGHT + 12);
  /** Local y of the top of the head, for speech bubbles and hearts. */
  private headY = -SPRITE_HEIGHT;
  /** Mouth in the container's unscaled coordinates, relative to its origin. */
  private mouth = { x: 0, y: -SPRITE_HEIGHT * 0.6, half: 30 };
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
    ticketStaggerPx = 0,
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
    this.barY = Math.max(fit.top, -SPRITE_HEIGHT) - 12;
    this.headY = fit.bottom - (this.sprite.height - (HEADS[pose.key]?.[0] ?? 0)) * fit.scale;
    const head = key === pose.key ? HEADS[pose.key] : undefined;
    if (head) {
      const row = head[0] + (head[1] - head[0]) * 0.72;
      const m = mouthX(scene, key, head[0] + (head[1] - head[0]) * 0.4, head[1] - head[0]);
      this.mouth = {
        x: (m.x - this.sprite.width / 2) * fit.scale,
        y: fit.bottom - (this.sprite.height - row) * fit.scale,
        half: m.half * fit.scale,
      };
    }

    // The order ticket is NOT a child of this container: it lives at scene level
    // on a high depth so the order you're typing is never hidden behind the
    // counter, props, or HUD. It trails the customer via positionTicket().
    this.ticketStaggerPx = ticketStaggerPx;
    this.ticket = this.buildTicket(customer.order);
    this.ticket.container.setScale(0);

    this.bar = scene.add.graphics();
    this.add([this.bar, this.sprite]);
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
    const barTopWorld = this.y + this.barY * this.uiScale;
    // The bubble's own height clears by ticketScale() (its floored scale); the
    // bar anchor and stagger clear by uiScale (they track the shrinking sprite).
    const y =
      barTopWorld -
      TICKET_GAP * this.uiScale -
      this.ticketHalf1 * this.ticketScale() +
      this.ticketStaggerPx * this.uiScale;
    // Keep long tickets on screen at the end seats.
    const half = this.ticketHalfW1 * this.ticketScale() * (this.locked ? 1.12 : 1);
    const w = this.scene.scale.width;
    const x = half * 2 + 8 < w ? Phaser.Math.Clamp(this.x, half + 4, w - half - 4) : w / 2;
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
   * sprite shrinks, while the per-seat stagger lifts alternating seats so long
   * neighbouring tickets don't collide.
   */
  private buildTicket(order: Order): LiveTicket {
    const hidden = order.fingers ? order.words[0].length : 0;
    const ticket = makeLiveTicket(this.scene, this.x, this.y, order.text, undefined, hidden);
    this.ticketHalf1 = ticket.height / 2;
    this.ticketHalfW1 = ticket.width / 2;
    ticket.setBaseScale(this.ticketScale());
    ticket.container.setDepth(this.ticketDepth);
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

    // Beside the head at mouth height, on the outer side when it fits, then
    // stacked upward clear of any balloon already up.
    let live = LIVE_BALLOONS.get(scene);
    if (!live) {
      live = new Set();
      LIVE_BALLOONS.set(scene, live);
      scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => LIVE_BALLOONS.delete(scene));
    }
    const balloons = live;
    const u = this.uiScale;
    const W = scene.scale.width;
    const mx = this.x + this.mouth.x * u;
    const my = this.y + this.mouth.y * u;
    const reach = this.mouth.half * u + 16 * sc + hw;
    const outer = mx < W / 2 ? -1 : 1;
    const minY = 58 + hh;
    // Try spots beside the head (outer side first), stepping up, and take the
    // first that covers no ticket and no other balloon; failing that, the one
    // that covers least.
    const obstacles = [
      ...balloons,
      ...[...(VIEWS.get(scene) ?? [])].filter((v) => v.ticket.container.visible).map((v) => {
        const b = v.ticket.container.getBounds();
        return { x: b.centerX, y: b.centerY, hw: b.width / 2, hh: b.height / 2 };
      }),
    ];
    // Faces matter less than tickets, but a balloon shouldn't sit on one.
    const faces = [...(VIEWS.get(scene) ?? [])].map((v) => {
      const half = v.mouth.half * v.uiScale;
      return { x: v.x + v.mouth.x * v.uiScale, y: v.y + v.mouth.y * v.uiScale - half * 0.5, hw: half, hh: half * 1.2, weight: 0.5 };
    });
    const all: { x: number; y: number; hw: number; hh: number; weight?: number }[] = [...obstacles, ...faces];
    const overlap = (cx: number, cy: number) => all.reduce((sum, o) => {
      const ox = Math.max(0, Math.min(cx + hw, o.x + o.hw) - Math.max(cx - hw, o.x - o.hw));
      const oy = Math.max(0, Math.min(cy + hh, o.y + o.hh) - Math.max(cy - hh, o.y - o.hh));
      return sum + ox * oy * (o.weight ?? 1);
    }, 0);
    let best = { x: 0, y: 0, side: outer, cost: Infinity };
    for (const side of [outer, -outer]) {
      const cx = Phaser.Math.Clamp(mx + side * reach, hw + 4, W - hw - 4);
      // pushed into the head by the screen edge: a poor spot
      const squeezed = Math.abs(cx - (mx + side * reach)) > hw * 0.5 ? hw * hh : 0;
      for (let step = 0; step < 6; step++) {
        const cy = Math.max(minY, my - hh * 0.7 - step * hh * 1.1);
        // Rising is cheap; crossing to the far side stretches the tail.
        const cost = overlap(cx, cy) + squeezed + step * hw * 2 + (side === outer ? 0 : hw * hh * 0.6);
        if (cost < best.cost) best = { x: cx, y: cy, side, cost };
      }
    }
    const { x, y, side } = best;
    const slot = { x, y, hw, hh };
    balloons.add(slot);

    // A short curved tail from the balloon's near edge, ending just short of the mouth.
    const tip = { x: (mx - side * (this.mouth.half * u + 3) - x) / sc, y: (my - y) / sc };
    const ang = Math.atan2(tip.y, tip.x);
    const base = { x: Math.cos(ang) * rx * k * 0.8, y: Math.sin(ang) * ry * k * 0.8 };
    const ctrl = { x: (base.x + tip.x) / 2, y: (base.y + tip.y) / 2 + 10 };
    const curve = new Phaser.Curves.QuadraticBezier(
      new Phaser.Math.Vector2(base.x, base.y), new Phaser.Math.Vector2(ctrl.x, ctrl.y), new Phaser.Math.Vector2(tip.x, tip.y),
    );
    const tail = (grow: number, upto = 1) => {
      const left: Phaser.Math.Vector2[] = [];
      const right: Phaser.Math.Vector2[] = [];
      const n = 16;
      for (let i = 0; i <= n; i++) {
        const t = (i / n) * upto;
        const p = curve.getPoint(t);
        const d = curve.getTangent(t);
        const half = 9 * (1 - t) + grow;
        left.push(new Phaser.Math.Vector2(p.x - d.y * half, p.y + d.x * half));
        right.push(new Phaser.Math.Vector2(p.x + d.y * half, p.y - d.x * half));
      }
      // a pointed tip, pushed out by the outline width
      const end = curve.getTangent(1);
      if (upto === 1) left.push(new Phaser.Math.Vector2(tip.x + end.x * grow, tip.y + end.y * grow));
      return [...left, ...right.reverse()];
    };
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
    const paper = shout ? 0xf0e0b4 : 0xeee4cf;
    // The tail sits on a layer under every balloon, so no tail crosses
    // another balloon's words; a paper stub on the balloon hides the seam.
    const tailG = scene.add.graphics();
    tailG.fillStyle(0x6f6556, 1).fillPoints(tail(2.5), true);
    tailG.fillStyle(paper, 1).fillPoints(tail(0), true);
    const g = scene.add.graphics();
    g.fillStyle(0x6f6556, 1);
    body(g, 2.5);
    g.fillStyle(paper, 1);
    body(g, 0);
    g.fillPoints(tail(0, Math.min(0.5, (Math.min(rx, ry) * k * 0.2 + 5) / curve.getLength())), true);
    // Behind every ticket.
    balloonCount = (balloonCount + 1) % 1000;
    const depth = this.ticketDepth - 2 - balloonCount * 0.0005;
    const tailLayer = scene.add.container(x, y, [tailG]).setDepth(depth - 1).setScale(0);
    const bubble = scene.add.container(x, y, [g, label]).setDepth(depth).setScale(0);
    scene.tweens.add({ targets: [bubble, tailLayer], scale: sc, duration: 170, ease: 'Back.Out' });
    if (shout) scene.tweens.add({ targets: label, angle: 3, duration: 70, yoyo: true, repeat: 3, delay: 170 });
    scene.tweens.add({
      targets: [bubble, tailLayer], alpha: 0, delay: hold, duration: 220,
      onComplete: () => {
        balloons.delete(slot);
        bubble.destroy();
        tailLayer.destroy();
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
    this.bar.clear();
    this.bar.lineStyle(1, COLORS.darkHex, 1).strokeRect(-40, this.barY, 80, 8);
    this.bar.fillStyle(COLORS.darkHex, 0.15).fillRect(-40, this.barY, 80, 8);
    this.bar.fillStyle(color, 1).fillRect(-40, this.barY, 80 * f, 8);
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
