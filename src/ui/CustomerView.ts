import Phaser from 'phaser';
import type { CustomerState } from '../core/types';
import { PLACEHOLDER_KEY } from './assets';
import { HEADS, type PoseDef } from './cast';
import { COLORS, makeLiveTicket, makeStarburst, type LiveTicket } from './theme';
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
  private ticketHalf1: number; // ticket half-height measured at scale 1
  private ticketHalfW1: number; // and half-width
  private ticketStaggerPx: number;
  private ticketDepth: number;
  private activeTicketDepth: number;
  private uiScale: number;
  private locked = false;
  private barY = -(SPRITE_HEIGHT + 12);
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
  ) {
    super(scene, x, y);
    this.customerId = customer.id;
    this.character = pose.character;
    this.ticketDepth = ticketDepth;
    this.activeTicketDepth = activeTicketDepth;
    this.uiScale = uiScale;

    const key = scene.textures.exists(pose.key) ? pose.key : PLACEHOLDER_KEY;
    this.sprite = scene.add.image(0, 0, key).setOrigin(0.5, 1);
    const fit = fitPose(key === pose.key ? HEADS[pose.key] : undefined, this.sprite.height);
    this.sprite.setScale(fit.scale).setY(fit.bottom);
    // Patience bar just above the figure, but never higher than for a full-height pose.
    this.barY = Math.max(fit.top, -SPRITE_HEIGHT) - 12;

    // The order ticket is NOT a child of this container: it lives at scene level
    // on a high depth so the order you're typing is never hidden behind the
    // counter, props, or HUD. It trails the customer via positionTicket().
    // A Finger-Counter special hides its count word: read it off his hand.
    const { order } = customer;
    const hidden = order.fingers ? order.words[0].length : 0;
    this.ticket = makeLiveTicket(scene, x, y, order.text, undefined, hidden);
    // ticketHalf1 is the ticket's half-height at scale 1. positionTicket scales
    // it by ticketScale() (which floors at MIN_TICKET_SCALE) so the bubble stays
    // legible even when the customer sprite shrinks; the per-seat stagger still
    // scales with uiScale (it's a layout offset, not a bubble dimension) and lifts
    // alternating seats so long neighbouring tickets never collide horizontally.
    const bounds = this.ticket.container.getBounds();
    this.ticketHalf1 = bounds.height / 2;
    this.ticketHalfW1 = bounds.width / 2;
    this.ticketStaggerPx = ticketStaggerPx;
    this.ticket.setBaseScale(this.ticketScale());
    this.ticket.container.setDepth(ticketDepth).setScale(0);

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

  /** Tapping the customer or their ticket calls `onTap` (switch to / let go of this order). */
  onTap(onTap: () => void) {
    const { width: w, height: h } = this.ticket;
    this.sprite.setInteractive({ useHandCursor: true }).on('pointerdown', onTap);
    this.ticket.container
      .setInteractive(new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h), Phaser.Geom.Rectangle.Contains)
      .on('pointerdown', onTap);
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
    this.setDepth(this.depth - 0.5); // and step behind whoever sits down next
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
