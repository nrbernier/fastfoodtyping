import Phaser from 'phaser';
import { SHIFTS } from '../../core/shifts';
import { formatMoney } from '../../core/money';
import { SaveStore, safeLocalStorage } from '../../persistence/storage';
import { COLORS, FONTS, makeButton } from '../theme';
import { applyPaperGrain } from '../texture';

export class ShiftSelectScene extends Phaser.Scene {
  constructor() {
    super('shiftselect');
  }

  create() {
    const { width, height } = this.scale;
    const store = new SaveStore(safeLocalStorage());
    const save = store.load();

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
          .text(width / 2, y + 26, `best ......... ${formatMoney(best)}`, {
            fontFamily: FONTS.mono,
            fontSize: '14px',
            color: COLORS.cream,
          })
          .setOrigin(0.5, 0);
      }
    });

    // House orders (capitals and punctuation, from Wednesday on) can be switched off.
    const toggleLabel = (on: boolean) => `[${on ? 'x' : ' '}] Caps & punctuation orders (Wed on)`;
    const toggle = this.add
      .text(width / 2, height * 0.83, toggleLabel(store.settings().fancyOrders), {
        fontFamily: FONTS.mono,
        fontSize: '15px',
        color: COLORS.mustard,
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    toggle.on('pointerdown', () => {
      const { fancyOrders } = store.updateSettings({ fancyOrders: !store.settings().fancyOrders });
      toggle.setText(toggleLabel(fancyOrders));
    });

    makeButton(this, width / 2, height * 0.9, 'BACK', () => this.scene.start('title'));

    applyPaperGrain(this);
  }
}
