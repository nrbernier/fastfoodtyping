import Phaser from 'phaser';
import { COLORS, FONT } from './theme';

/**
 * The bowl on the prep counter. Completed words drop in as labeled ingredient
 * boxes that pour "powder"; a completed order pops out as a dish that slides
 * to the customer.
 */
export class PrepStation {
  private root: Phaser.GameObjects.Container;
  private bowl: Phaser.GameObjects.Graphics;

  constructor(private scene: Phaser.Scene, private x: number, private y: number) {
    this.bowl = scene.add.graphics();
    this.bowl.fillStyle(0xb0bec5, 1).fillEllipse(0, 0, 150, 44);
    this.bowl.fillStyle(0x78909c, 1).fillEllipse(0, -6, 130, 30);
    this.root = scene.add.container(x, y, [this.bowl]);
  }

  /** A labeled box tips over the bowl and pours powder. */
  dropBox(word: string) {
    const label = this.scene.add
      .text(0, 0, word.toUpperCase(), {
        fontFamily: FONT,
        fontSize: '14px',
        fontStyle: 'bold',
        color: COLORS.cream,
        backgroundColor: '#8d6e63',
        padding: { x: 8, y: 5 },
      })
      .setOrigin(0.5);
    const box = this.scene.add.container(this.x + Phaser.Math.Between(-30, 30), this.y - 130, [label]);

    this.scene.tweens.add({
      targets: box,
      y: this.y - 70,
      angle: 120,
      duration: 280,
      ease: 'Quad.In',
      onComplete: () => {
        this.pourPowder();
        this.scene.tweens.add({
          targets: box,
          alpha: 0,
          y: this.y - 90,
          delay: 250,
          duration: 200,
          onComplete: () => box.destroy(),
        });
      },
    });
  }

  /** The dish pops out of the bowl and slides to the customer. */
  serveDish(targetX: number, targetY: number, onDone?: () => void) {
    const dish = this.scene.add.text(this.x, this.y - 20, '🍽️', { fontSize: '40px' }).setOrigin(0.5);
    this.scene.tweens.chain({
      targets: dish,
      tweens: [
        { y: this.y - 80, duration: 180, ease: 'Quad.Out' },
        { x: targetX, y: targetY - 30, duration: 260, ease: 'Quad.In' },
        { alpha: 0, duration: 150 },
      ],
      onComplete: () => {
        dish.destroy();
        onDone?.();
      },
    });
    this.wiggle();
  }

  /** Buzz feedback on a wrong keystroke. */
  shake() {
    this.scene.tweens.add({
      targets: this.root,
      x: this.x + 6,
      duration: 40,
      yoyo: true,
      repeat: 2,
      onComplete: () => this.root.setX(this.x),
    });
  }

  private pourPowder() {
    for (let i = 0; i < 6; i++) {
      const grain = this.scene.add.circle(
        this.x + Phaser.Math.Between(-20, 20),
        this.y - 60,
        Phaser.Math.Between(2, 4),
        0xfff3e0,
      );
      this.scene.tweens.add({
        targets: grain,
        y: this.y - 10,
        alpha: 0.2,
        delay: i * 40,
        duration: 220,
        ease: 'Quad.In',
        onComplete: () => grain.destroy(),
      });
    }
    this.wiggle();
  }

  private wiggle() {
    this.scene.tweens.add({
      targets: this.root,
      scaleX: 1.06,
      scaleY: 0.94,
      duration: 90,
      yoyo: true,
    });
  }
}
