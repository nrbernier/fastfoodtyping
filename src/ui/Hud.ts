import Phaser from 'phaser';
import { COLORS, FONTS } from './theme';
import { makePlateIcon } from './scenery';

export class Hud {
  private bg: Phaser.GameObjects.Rectangle;
  private rail: Phaser.GameObjects.Rectangle;
  private strikeRow: Phaser.GameObjects.Container;
  private scoreText: Phaser.GameObjects.Text;

  constructor(private scene: Phaser.Scene) {
    this.bg = scene.add.rectangle(0, 0, 10, 10, COLORS.hud).setOrigin(0, 0);
    this.rail = scene.add.rectangle(0, 0, 10, 3, COLORS.mustardHex).setOrigin(0, 0);
    this.strikeRow = scene.add.container(0, 0);
    this.scoreText = scene.add
      .text(0, 0, '$ 0', { fontFamily: FONTS.sans, fontSize: '22px', fontStyle: 'bold', color: COLORS.mustard })
      .setOrigin(1, 0.5);
    this.setStrikes(0);
  }

  layout(width: number, height: number, hudTop: number) {
    const cy = hudTop + (height - hudTop) / 2;
    this.bg.setPosition(0, hudTop).setSize(width, height - hudTop);
    this.rail.setPosition(0, hudTop).setSize(width, 3);
    this.strikeRow.setPosition(20, cy);
    this.scoreText.setPosition(width - 16, cy);
  }

  setStrikes(n: number) {
    this.strikeRow.removeAll(true);
    for (let i = 0; i < 3; i++) {
      this.strikeRow.add(makePlateIcon(this.scene, i * 24, 0, i < n));
    }
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
