import Phaser from 'phaser';
import { PACE_ORDER, PACES, type Pace } from '../../core/difficulty';
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
      const y = height * 0.26 + i * Math.min(72, height * 0.105);
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

    // Pace: tap to cycle how patient customers are and how fast they arrive.
    const paceLabel = (p: Pace) => `Pace: < ${PACES[p].label} >`;
    const paceText = this.add
      .text(width / 2, height * 0.79, paceLabel(store.settings().pace), {
        fontFamily: FONTS.mono,
        fontSize: '17px',
        color: COLORS.cream,
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    paceText.on('pointerdown', () => {
      const next = PACE_ORDER[(PACE_ORDER.indexOf(store.settings().pace) + 1) % PACE_ORDER.length];
      paceText.setText(paceLabel(store.updateSettings({ pace: next }).pace));
    });

    // House orders (capitals and punctuation, from Wednesday on) can be switched off.
    const toggleLabel = (on: boolean) => `[${on ? 'x' : ' '}] Caps & punctuation orders (Wed on)`;
    const toggle = this.add
      .text(width / 2, height * 0.835, toggleLabel(store.settings().fancyOrders), {
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

    makeButton(this, width / 2, height * 0.91, 'BACK', () => this.scene.start('title'));

    applyPaperGrain(this);
  }
}
