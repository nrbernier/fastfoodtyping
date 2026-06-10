import Phaser from 'phaser';
import { COLORS, FONT, makeButton } from '../theme';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('title');
  }

  create() {
    const { width, height } = this.scale;
    this.add
      .text(width / 2, height * 0.3, 'SHORT-ORDER HERO', {
        fontFamily: FONT,
        fontSize: '48px',
        fontStyle: 'bold',
        color: COLORS.red,
      })
      .setOrigin(0.5);
    makeButton(this, width / 2, height * 0.55, 'START SHIFT', () =>
      this.scene.start('shiftselect'),
    );
  }
}
