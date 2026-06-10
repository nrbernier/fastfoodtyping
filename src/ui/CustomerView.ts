import Phaser from 'phaser';
import { COLORS, FONT } from './theme';
import type { CustomerState } from '../core/types';

const FACES = ['🧔', '👵', '👦', '👩', '🤠', '👨‍🦰', '👸', '🧑‍🎤', '👽', '🤖'];

export class CustomerView extends Phaser.GameObjects.Container {
  readonly customerId: number;
  private bubble: Phaser.GameObjects.Container;
  private bar: Phaser.GameObjects.Graphics;
  private face: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, customer: CustomerState, x: number, y: number) {
    super(scene, x, y);
    this.customerId = customer.id;

    this.face = scene.add
      .text(0, 0, FACES[customer.id % FACES.length], { fontSize: '56px' })
      .setOrigin(0.5, 1);

    const label = scene.add
      .text(0, -86, customer.order.text, {
        fontFamily: FONT,
        fontSize: '20px',
        fontStyle: 'bold',
        color: COLORS.dark,
        backgroundColor: COLORS.white,
        padding: { x: 10, y: 6 },
        align: 'center',
        wordWrap: { width: 220 },
      })
      .setOrigin(0.5, 1);
    this.bubble = scene.add.container(0, 0, [label]);

    this.bar = scene.add.graphics();
    this.add([this.bubble, this.bar, this.face]);
    scene.add.existing(this);

    this.setScale(0);
    scene.tweens.add({ targets: this, scale: 1, duration: 250, ease: 'Back.Out' });
  }

  setLocked(locked: boolean) {
    this.scene.tweens.add({
      targets: this.bubble,
      scaleX: locked ? 1.12 : 1,
      scaleY: locked ? 1.12 : 1,
      duration: 120,
    });
  }

  updatePatience(fraction: number) {
    const f = Math.max(0, fraction);
    const color = f > 0.5 ? 0x27ae60 : f > 0.2 ? 0xf1c40f : 0xe74c3c;
    this.bar.clear();
    this.bar.fillStyle(0x000000, 0.15).fillRect(-40, -78, 80, 8);
    this.bar.fillStyle(color, 1).fillRect(-40, -78, 80 * f, 8);
    // jitter when about to storm out
    this.face.setAngle(f < 0.2 ? Math.sin(this.scene.time.now / 50) * 4 : 0);
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
    this.face.setText('😡');
    this.scene.tweens.add({
      targets: this,
      x: this.x + this.scene.scale.width * 0.4,
      alpha: 0,
      duration: 450,
      onComplete: () => {
        this.destroy();
        onDone();
      },
    });
  }
}
