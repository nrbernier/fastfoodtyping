import Phaser from 'phaser';
import { COLORS, FONTS } from './theme';

export class Hud {
  private bg: Phaser.GameObjects.Rectangle;
  private strikesText: Phaser.GameObjects.Text;
  private scoreText: Phaser.GameObjects.Text;

  constructor(private scene: Phaser.Scene) {
    this.bg = scene.add.rectangle(0, 0, 10, 10, COLORS.hud).setOrigin(0, 0);
    this.strikesText = scene.add
      .text(0, 0, '', { fontFamily: FONTS.slab, fontSize: '20px', color: COLORS.red })
      .setOrigin(0, 0.5);
    this.scoreText = scene.add
      .text(0, 0, '$ 0', { fontFamily: FONTS.sans, fontSize: '22px', fontStyle: 'bold', color: COLORS.mustard })
      .setOrigin(1, 0.5);
    this.setStrikes(0);
  }

  layout(width: number, height: number, hudTop: number) {
    const cy = hudTop + (height - hudTop) / 2;
    this.bg.setPosition(0, hudTop).setSize(width, height - hudTop);
    this.strikesText.setPosition(16, cy);
    this.scoreText.setPosition(width - 16, cy);
  }

  setStrikes(n: number) {
    this.strikesText.setText('✗'.repeat(n) + '·'.repeat(Math.max(0, 3 - n)));
  }

  setScore(n: number) {
    this.scoreText.setText(`$ ${n}`);
  }

  flashMistake() {
    this.scene.tweens.add({
      targets: this.scoreText,
      scaleX: 1.3,
      scaleY: 1.3,
      duration: 60,
      yoyo: true,
      repeat: 1,
    });
  }
}
