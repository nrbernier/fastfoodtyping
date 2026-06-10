import Phaser from 'phaser';
import { OVERTIME, SHIFTS } from '../../core/shifts';
import { SaveStore, safeLocalStorage } from '../../persistence/storage';
import { COLORS, FONTS, makeButton, makeStarburst } from '../theme';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('title');
  }

  create() {
    const { width, height } = this.scale;
    const save = new SaveStore(safeLocalStorage()).load();
    const overtimeUnlocked = save.unlockedShift >= SHIFTS.length;

    // teal poster field with checkerboard floor strip
    this.add.rectangle(0, 0, width, height, COLORS.wall).setOrigin(0);
    this.drawCheckerboard(height - 64, 64);

    // script logo with hard offset shadow, slightly rotated
    this.add
      .text(width / 2 + 3, height * 0.2 + 3, 'Short-Order Hero', {
        fontFamily: FONTS.script,
        fontSize: '56px',
        color: COLORS.dark,
      })
      .setOrigin(0.5)
      .setAngle(-4);
    this.add
      .text(width / 2, height * 0.2, 'Short-Order Hero', {
        fontFamily: FONTS.script,
        fontSize: '56px',
        color: COLORS.red,
      })
      .setOrigin(0.5)
      .setAngle(-4);

    this.add
      .text(width / 2, height * 0.34, '★ TYPE FAST — SERVE WEIRD ★', {
        fontFamily: FONTS.sans,
        fontSize: '18px',
        fontStyle: 'bold',
        color: COLORS.dark,
      })
      .setOrigin(0.5);

    makeStarburst(this, width * 0.85, height * 0.12, 48, '24 HR\nSERVICE');

    makeButton(this, width / 2, height * 0.52, 'START SHIFT', () =>
      this.scene.start('shiftselect'),
    );
    makeButton(
      this,
      width / 2,
      height * 0.65,
      overtimeUnlocked ? 'OVERTIME' : 'OVERTIME (LOCKED)',
      () => this.scene.start('game', { config: OVERTIME }),
      overtimeUnlocked,
    );

    const best = save.highScores[OVERTIME.id];
    if (best) {
      this.add
        .text(width / 2, height * 0.76, `Overtime best: $${best}`, {
          fontFamily: FONTS.mono,
          fontSize: '17px',
          color: COLORS.dark,
        })
        .setOrigin(0.5);
    }
  }

  private drawCheckerboard(y: number, h: number) {
    const size = h / 2;
    const g = this.add.graphics();
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col * size < this.scale.width; col++) {
        g.fillStyle((row + col) % 2 === 0 ? COLORS.darkHex : COLORS.creamHex, 1);
        g.fillRect(col * size, y + row * size, size, size);
      }
    }
  }
}
