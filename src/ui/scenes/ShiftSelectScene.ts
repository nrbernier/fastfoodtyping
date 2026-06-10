import Phaser from 'phaser';
import { SHIFTS } from '../../core/shifts';
import { SaveStore, safeLocalStorage } from '../../persistence/storage';
import { COLORS, FONTS, makeButton } from '../theme';

export class ShiftSelectScene extends Phaser.Scene {
  constructor() {
    super('shiftselect');
  }

  create() {
    const { width, height } = this.scale;
    const save = new SaveStore(safeLocalStorage()).load();

    // charcoal menu board on a teal wall
    this.add.rectangle(0, 0, width, height, COLORS.wall).setOrigin(0);
    const boardW = Math.min(520, width * 0.92);
    this.add
      .rectangle(width / 2, height / 2, boardW, height * 0.86, COLORS.hud)
      .setStrokeStyle(4, COLORS.counterEdge);

    this.add
      .text(width / 2, height * 0.13, "TODAY'S SHIFTS", {
        fontFamily: FONTS.slab,
        fontSize: '30px',
        color: COLORS.mustard,
      })
      .setOrigin(0.5);
    this.add
      .text(width / 2, height * 0.19, '— fine typing since 1955 —', {
        fontFamily: FONTS.mono,
        fontSize: '14px',
        color: COLORS.cream,
      })
      .setOrigin(0.5);

    SHIFTS.forEach((shift, i) => {
      const unlocked = i <= save.unlockedShift;
      const y = height * 0.28 + i * Math.min(76, height * 0.12);
      makeButton(this, width / 2, y, shift.name, () => this.scene.start('game', { config: shift }), unlocked);
      if (!unlocked) {
        this.add
          .text(width / 2 + 80, y - 14, "86'd", {
            fontFamily: FONTS.slab,
            fontSize: '18px',
            color: COLORS.red,
          })
          .setOrigin(0.5)
          .setAngle(-14);
      }
      const best = save.highScores[shift.id];
      if (best) {
        this.add
          .text(width / 2, y + 26, `best ......... $${best}`, {
            fontFamily: FONTS.mono,
            fontSize: '14px',
            color: COLORS.cream,
          })
          .setOrigin(0.5, 0);
      }
    });

    makeButton(this, width / 2, height * 0.9, 'BACK', () => this.scene.start('title'));
  }
}
