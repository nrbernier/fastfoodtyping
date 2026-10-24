import Phaser from 'phaser';
import type { CustomerState, Order } from '../core/types';
import { PLACEHOLDER_KEY } from './assets';
import { HEADS, type PoseDef } from './cast';
import { COLORS, FONTS, makeLiveTicket, makeStarburst, type LiveTicket } from './theme';
import { fitPose, SPRITE_HEIGHT } from './headFit';

const TICKET_GAP = 30;
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

    // The order ticket is NOT a child of this container: it lives at scene level
    // on a high depth so the order you're typing is never hidden behind the
    // counter, props, or HUD. It trails the customer via positionTicket().
    this.ticketStaggerPx = ticketStaggerPx;
    this.ticket = this.buildTicket(customer.order);
    this.ticket.container.setScale(0);

    this.bar = scene.add.graphics();
    this.add([this.bar, this.sprite]);
    scene.add.existing(this);

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
   * A comic speech balloon floating above the customer's order ticket, its
   * tail pointing down at them. It sits in the wall space over the tickets,
   * so it never covers an order or a face.
   */
  say(phrase: string, hold = 900, color: string = COLORS.dark) {
    const scene = this.scene;
    if (!scene) return;
    const ts = this.ticketScale();
    const label = scene.add.text(0, 0, phrase, {
      fontFamily: FONTS.slab, fontSize: '17px', color, align: 'center', wordWrap: { width: 200 },
    }).setOrigin(0.5);
    const w = label.width + 22;
    const h = label.height + 12;
    const g = scene.add.graphics();
    g.fillStyle(COLORS.darkHex, 0.3).fillRoundedRect(-w / 2 + 3, -h / 2 + 3, w, h, 14);
    g.fillStyle(0xfffaf0, 1).fillRoundedRect(-w / 2, -h / 2, w, h, 14);
    g.lineStyle(2.5, COLORS.darkHex, 1).strokeRoundedRect(-w / 2, -h / 2, w, h, 14);
    // tail: a little wedge down toward the ticket, outlined on its two sides
    const tx = -w * 0.18;
    g.fillStyle(0xfffaf0, 1).fillTriangle(tx - 7, h / 2 - 2, tx + 7, h / 2 - 2, tx - 2, h / 2 + 12);
    g.lineStyle(2.5, COLORS.darkHex, 1).lineBetween(tx - 7, h / 2, tx - 2, h / 2 + 12).lineBetween(tx + 7, h / 2, tx - 2, h / 2 + 12);
    const ticket = this.ticket.container;
    const top = ticket.y - this.ticketHalf1 * ts;
    const half = (w / 2) * ts;
    const x = Phaser.Math.Clamp(ticket.x + w * 0.18 * ts, half + 4, scene.scale.width - half - 4);
    const bubble = scene.add.container(x, Math.max(60 + (h / 2) * ts, top - (h / 2 + 16) * ts), [g, label])
      .setDepth(this.ticketDepth + 5).setScale(0).setAngle(-2);
    scene.tweens.add({ targets: bubble, scale: ts, duration: 170, ease: 'Back.Out' });
    scene.tweens.add({ targets: bubble, alpha: 0, y: bubble.y - 8, delay: hold, duration: 220, onComplete: () => bubble.destroy() });
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
