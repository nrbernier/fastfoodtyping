import Phaser from 'phaser';
import { OVERTIME, SHIFTS } from '../../core/shifts';
import { SaveStore, safeLocalStorage } from '../../persistence/storage';
import { COLORS, FONT, makeButton } from '../theme';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('title');
  }

  create() {
    const { width, height } = this.scale;
    const save = new SaveStore(safeLocalStorage()).load();
    const overtimeUnlocked = save.unlockedShift >= SHIFTS.length;

    this.add.rectangle(0, 0, width, height, COLORS.creamHex).setOrigin(0);
    this.add
      .text(width / 2, height * 0.18, 'SHORT-ORDER', {
        fontFamily: FONT,
        fontSize: '52px',
        fontStyle: 'bold',
        color: COLORS.red,
      })
      .setOrigin(0.5);
    this.add
      .text(width / 2, height * 0.28, 'HERO', {
        fontFamily: FONT,
        fontSize: '64px',
        fontStyle: 'bold',
        color: COLORS.dark,
      })
      .setOrigin(0.5);
    this.add
      .text(width / 2, height * 0.38, 'type fast · serve weird', {
        fontFamily: FONT,
        fontSize: '20px',
        color: COLORS.dark,
      })
      .setOrigin(0.5);

    makeButton(this, width / 2, height * 0.55, 'START SHIFT', () =>
      this.scene.start('shiftselect'),
    );
    makeButton(
      this,
      width / 2,
      height * 0.67,
      overtimeUnlocked ? 'OVERTIME' : '🔒 OVERTIME',
      () => this.scene.start('game', { config: OVERTIME }),
      overtimeUnlocked,
    );

    const best = save.highScores[OVERTIME.id];
    if (best) {
      this.add
        .text(width / 2, height * 0.78, `Overtime best: $${best}`, {
          fontFamily: FONT,
          fontSize: '18px',
          color: COLORS.dark,
        })
        .setOrigin(0.5);
    }
  }
}
