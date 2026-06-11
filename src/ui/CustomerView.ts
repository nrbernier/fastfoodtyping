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

  constructor(scene: Phaser.Scene, customer: CustomerState, x: number, y: number) {
    super(scene, x, y);
    this.customerId = customer.id;

    const wanted = characterKeyFor(customer.id);
    const key = scene.textures.exists(wanted) ? wanted : PLACEHOLDER_KEY;
    this.sprite = scene.add.image(0, 0, key).setOrigin(0.5, 1);
    this.sprite.setScale(SPRITE_HEIGHT / this.sprite.height);

    this.ticket = makeLiveTicket(scene, 0, 0, customer.order.text);
    // place the ticket (its tail points down) just above the patience bar
    this.ticket.container.setY(BAR_Y - TICKET_GAP - this.ticket.container.getBounds().height / 2);

    this.bar = scene.add.graphics();
    this.add([this.ticket.container, this.bar, this.sprite]);
    scene.add.existing(this);

    this.setScale(0);
    scene.tweens.add({ targets: this, scale: 1, duration: 250, ease: 'Back.Out' });
    scene.tweens.add({
      targets: this.sprite, y: '-=4', duration: 1100 + (customer.id % 5) * 90,
      yoyo: true, repeat: -1, ease: 'Sine.InOut',
    });
  }

  setLocked(locked: boolean) {
    this.scene.tweens.add({
      targets: this.ticket.container,
      scaleX: locked ? 1.12 : 1,
      scaleY: locked ? 1.12 : 1,
      duration: 120,
    });
  }

  updateTyping(typedCount: number) {
    this.ticket.update(typedCount);
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
