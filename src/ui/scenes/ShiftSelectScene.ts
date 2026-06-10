import Phaser from 'phaser';
import { SHIFTS } from '../../core/shifts';
import { SaveStore, safeLocalStorage } from '../../persistence/storage';
import { COLORS, FONT, makeButton } from '../theme';

export class ShiftSelectScene extends Phaser.Scene {
  constructor() {
    super('shiftselect');
  }

  create() {
    const { width, height } = this.scale;
    const save = new SaveStore(safeLocalStorage()).load();

    this.add.rectangle(0, 0, width, height, COLORS.creamHex).setOrigin(0);
    this.add
      .text(width / 2, height * 0.08, 'PICK YOUR SHIFT', {
        fontFamily: FONT,
        fontSize: '32px',
        fontStyle: 'bold',
        color: COLORS.red,
      })
      .setOrigin(0.5);

    SHIFTS.forEach((shift, i) => {
      const unlocked = i <= save.unlockedShift;
      const y = height * 0.2 + i * Math.min(70, height * 0.11);
      const label = unlocked ? shift.name : `🔒 ${shift.name}`;
      makeButton(this, width / 2, y, label, () => this.scene.start('game', { config: shift }), unlocked);
      const best = save.highScores[shift.id];
      if (best) {
        this.add
          .text(width / 2 + 10, y + 26, `best $${best}`, {
            fontFamily: FONT,
            fontSize: '14px',
            color: COLORS.dark,
          })
          .setOrigin(0.5, 0);
      }
    });

    makeButton(this, width / 2, height * 0.9, 'BACK', () => this.scene.start('title'));
  }
}
