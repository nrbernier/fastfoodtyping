import Phaser from 'phaser';
import { COLORS, FONT } from './theme';

export class Hud {
  private bg: Phaser.GameObjects.Rectangle;
  private strikesText: Phaser.GameObjects.Text;
  private scoreText: Phaser.GameObjects.Text;
  private orderContainer: Phaser.GameObjects.Container;
  private typedText: Phaser.GameObjects.Text;
  private restText: Phaser.GameObjects.Text;

  constructor(private scene: Phaser.Scene) {
    this.bg = scene.add.rectangle(0, 0, 10, 10, COLORS.hud).setOrigin(0, 0);
    this.strikesText = scene.add
      .text(0, 0, '', { fontFamily: FONT, fontSize: '22px', color: COLORS.cream })
      .setOrigin(0, 0.5);
    this.scoreText = scene.add
      .text(0, 0, '$ 0', { fontFamily: FONT, fontSize: '22px', fontStyle: 'bold', color: COLORS.cream })
      .setOrigin(1, 0.5);
    this.typedText = scene.add
      .text(0, 0, '', { fontFamily: FONT, fontSize: '26px', fontStyle: 'bold', color: COLORS.green })
      .setOrigin(0, 0.5);
    this.restText = scene.add
      .text(0, 0, '', { fontFamily: FONT, fontSize: '26px', fontStyle: 'bold', color: '#bdb3a4' })
      .setOrigin(0, 0.5);
    this.orderContainer = scene.add.container(0, 0, [this.typedText, this.restText]);
    this.setStrikes(0);
  }

  layout(width: number, height: number, hudTop: number) {
    const cy = hudTop + (height - hudTop) / 2;
    this.bg.setPosition(0, hudTop).setSize(width, height - hudTop);
    this.strikesText.setPosition(16, cy);
    this.scoreText.setPosition(width - 16, cy);
    this.orderContainer.setY(cy);
    this.centerOrder(width);
  }

  setStrikes(n: number) {
    this.strikesText.setText('😠'.repeat(n) + ' · '.repeat(Math.max(0, 3 - n)));
  }

  setScore(n: number) {
    this.scoreText.setText(`$ ${n}`);
  }

  showOrder(text: string, typedCount: number) {
    this.typedText.setText(text.slice(0, typedCount));
    this.restText.setText(text.slice(typedCount));
    this.restText.setX(this.typedText.width);
    this.centerOrder(this.scene.scale.width);
  }

  flashMistake() {
    this.scene.tweens.add({
      targets: this.orderContainer,
      x: this.orderContainer.x + 8,
      duration: 40,
      yoyo: true,
      repeat: 3,
    });
  }

  private centerOrder(width: number) {
    const total = this.typedText.width + this.restText.width;
    this.orderContainer.setX(width / 2 - total / 2);
  }
}
