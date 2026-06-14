import Phaser from 'phaser';
import type { CustomerState } from '../core/types';
import { characterKeyFor, PLACEHOLDER_KEY } from './assets';
import { COLORS, makeLiveTicket, makeStarburst, type LiveTicket } from './theme';

const SPRITE_HEIGHT = 175;
const BAR_Y = -(SPRITE_HEIGHT + 12);
const TICKET_GAP = 30;

export class CustomerView extends Phaser.GameObjects.Container {
  readonly customerId: number;
  private ticket: LiveTicket;
  private bar: Phaser.GameObjects.Graphics;
  private sprite: Phaser.GameObjects.Image;
  private baseOffsetY: number;
  private ticketDepth: number;
  private activeTicketDepth: number;
  private uiScale: number;
  private locked = false;

  constructor(
    scene: Phaser.Scene,
    customer: CustomerState,
    x: number,
    y: number,
    ticketDepth = 50,
    activeTicketDepth = ticketDepth + 1,
    uiScale = 1,
    ticketStaggerPx = 0,
  ) {
    super(scene, x, y);
    this.customerId = customer.id;
    this.ticketDepth = ticketDepth;
    this.activeTicketDepth = activeTicketDepth;
    this.uiScale = uiScale;

    const wanted = characterKeyFor(customer.id);
    const key = scene.textures.exists(wanted) ? wanted : PLACEHOLDER_KEY;
    this.sprite = scene.add.image(0, 0, key).setOrigin(0.5, 1);
    this.sprite.setScale(SPRITE_HEIGHT / this.sprite.height);

    // The order ticket is NOT a child of this container: it lives at scene level
    // on a high depth so the order you're typing is never hidden behind the
    // counter, props, or HUD. It trails the customer via positionTicket().
    this.ticket = makeLiveTicket(scene, x, y, customer.order.text);
    // offset measured at scale 1; positionTicket multiplies by uiScale so the
    // ticket stays just above the (possibly shrunk) head on small viewports.
    // The per-seat stagger lifts alternating seats so neighbouring tickets never
    // collide horizontally even when an order's text is long.
    this.baseOffsetY = BAR_Y - TICKET_GAP - this.ticket.container.getBounds().height / 2 + ticketStaggerPx;
    this.ticket.setBaseScale(uiScale);
    this.ticket.container.setDepth(ticketDepth).setScale(0);

    this.bar = scene.add.graphics();
    this.add([this.bar, this.sprite]);
    scene.add.existing(this);

    // The whole customer (sprite + bar) shrinks with the viewport via container
    // scale; the detached ticket is scaled to match.
    this.setScale(0);
    this.positionTicket();
    scene.tweens.add({ targets: this, scale: uiScale, duration: 250, ease: 'Back.Out' });
    scene.tweens.add({ targets: this.ticket.container, scale: uiScale, duration: 250, ease: 'Back.Out' });
    scene.tweens.add({
      targets: this.sprite, y: '-=4', duration: 1100 + (customer.id % 5) * 90,
      yoyo: true, repeat: -1, ease: 'Sine.InOut',
    });

    scene.events.on(Phaser.Scenes.Events.UPDATE, this.positionTicket, this);
  }

  /** Keep the floating ticket pinned above the customer (position + fade only;
   *  scale is left to the intro/lock/complete tweens). */
  private positionTicket = () => {
    this.ticket.container.setPosition(this.x, this.y + this.baseOffsetY * this.uiScale);
    this.ticket.container.setAlpha(this.alpha);
  };

  /** Re-seat the customer and its trailing ticket after a viewport resize. */
  reposition(x: number, y: number) {
    this.setPosition(x, y);
    this.positionTicket();
  }

  /** Re-scale the customer + ticket when the viewport (and thus uiScale) changes. */
  setUiScale(s: number) {
    this.uiScale = s;
    this.setScale(s);
    this.ticket.setBaseScale(s);
    this.ticket.container.setScale(this.locked ? s * 1.12 : s);
    this.positionTicket();
  }

  setLocked(locked: boolean) {
    this.locked = locked;
    // The order being typed jumps above every other ticket (and the HUD).
    this.ticket.container.setDepth(locked ? this.activeTicketDepth : this.ticketDepth);
    this.scene.tweens.add({
      targets: this.ticket.container,
      scaleX: locked ? this.uiScale * 1.12 : this.uiScale,
      scaleY: locked ? this.uiScale * 1.12 : this.uiScale,
      duration: 120,
    });
  }

  updateTyping(typedCount: number) {
    this.ticket.update(typedCount);
  }

  /** Order's up: flash the whole ticket green so the finish is unmistakable. */
  flashComplete() {
    this.ticket.complete();
  }

  updatePatience(fraction: number) {
    const f = Math.max(0, fraction);
    const color = f > 0.5 ? 0x27ae60 : f > 0.2 ? COLORS.mustardHex : COLORS.redHex;
    this.bar.clear();
    this.bar.lineStyle(1, COLORS.darkHex, 1).strokeRect(-40, BAR_Y, 80, 8);
    this.bar.fillStyle(COLORS.darkHex, 0.15).fillRect(-40, BAR_Y, 80, 8);
    this.bar.fillStyle(color, 1).fillRect(-40, BAR_Y, 80 * f, 8);
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
