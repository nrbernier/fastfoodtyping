import Phaser from 'phaser';
import { formatMoney } from '../core/money';
import { COLORS, FONTS } from './theme';
import { makePlateIcon } from './scenery';

const PLATE_RADIUS = 17;
const PLATE_GAP = 46;

export class Hud {
  private bg: Phaser.GameObjects.Rectangle;
  private rail: Phaser.GameObjects.Rectangle;
  private strikeRow: Phaser.GameObjects.Container;
  private scoreText: Phaser.GameObjects.Text;
  private strikes = 0;

  constructor(private scene: Phaser.Scene) {
    this.bg = scene.add.rectangle(0, 0, 10, 10, COLORS.hud).setOrigin(0, 0);
    this.rail = scene.add.rectangle(0, 0, 10, 3, COLORS.mustardHex).setOrigin(0, 0);
    // Strikes live near the top of the screen so a broken plate is impossible to miss.
    this.strikeRow = scene.add.container(0, 0).setDepth(1000);
    this.scoreText = scene.add
      .text(0, 0, '0¢', { fontFamily: FONTS.sans, fontSize: '22px', fontStyle: 'bold', color: COLORS.mustard })
      .setOrigin(1, 0.5);
    this.renderStrikes();
  }

  layout(width: number, height: number, hudTop: number) {
    const cy = hudTop + (height - hudTop) / 2;
    this.bg.setPosition(0, hudTop).setSize(width, height - hudTop);
    this.rail.setPosition(0, hudTop).setSize(width, 3);
    this.strikeRow.setPosition(28, 34);
    this.scoreText.setPosition(width - 16, cy);
  }

  setStrikes(n: number) {
    const broke = n > this.strikes;
    this.strikes = n;
    this.renderStrikes();
    if (broke) this.crackAnim(n - 1);
  }

  private renderStrikes() {
    this.strikeRow.removeAll(true);
    for (let i = 0; i < 3; i++) {
      this.strikeRow.add(makePlateIcon(this.scene, i * PLATE_GAP, 0, i < this.strikes, PLATE_RADIUS));
    }
  }

  /** Punch + jitter the plate that just shattered. */
  private crackAnim(index: number) {
    const plate = this.strikeRow.list[index] as Phaser.GameObjects.Container | undefined;
    if (!plate) return;
    this.scene.tweens.add({
      targets: plate, scaleX: 1.5, scaleY: 1.5, angle: -12,
      duration: 90, yoyo: true, ease: 'Quad.Out',
    });
  }

  setScore(n: number) {
    this.scoreText.setText(formatMoney(n));
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
