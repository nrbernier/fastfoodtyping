import Phaser from 'phaser';
import { PACE_ORDER, PACES, type Pace } from '../../core/difficulty';
import { LANG_LABELS, type Lang } from '../../core/lang';
import { BOSSES, bossUnlocked, SHIFTS, WEEK } from '../../core/shifts';
import { formatMoney } from '../../core/money';
import { SaveStore, safeLocalStorage } from '../../persistence/storage';
import { COLORS, FONTS, makeButton } from '../theme';
import { applyPaperGrain } from '../texture';
import { UNLOCK_ALL } from '../preview';

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

    // The week: five shifts with a boss night after Wednesday and Friday.
    const rowH = Math.min(62, height * 0.074);
    WEEK.forEach((shift, i) => {
      const day = SHIFTS.indexOf(shift);
      const boss = BOSSES.find((b) => b.id === shift.id);
      const unlocked = UNLOCK_ALL || (boss ? bossUnlocked(boss, save.unlockedShift) : day <= save.unlockedShift);
      const y = height * 0.25 + i * rowH;
      const start = () => this.scene.start('game', { config: shift });
      const best = save.highScores[shift.id];
      const label = best ? `${shift.name}  ·  ${formatMoney(best)}` : shift.name;
      const btn = makeButton(this, width / 2, y, label, start, unlocked, boss
        ? { fontSize: 16, fill: COLORS.mustardHex, color: COLORS.dark }
        : { fontSize: 18 });
      if (btn.width > boardW - 16) btn.setScale((boardW - 16) / btn.width);
      if (!unlocked) {
        this.add
          .text(width / 2 + boardW * 0.36, y - 12, "86'd", { fontFamily: FONTS.slab, fontSize: '16px', color: COLORS.red })
          .setOrigin(0.5)
          .setAngle(-14);
      }
    });
    const settingsY = height * 0.25 + WEEK.length * rowH;

    // Pace: tap to cycle how patient customers are and how fast they arrive.
    const paceLabel = (p: Pace) => `Pace: < ${PACES[p].label} >`;
    const paceText = this.add
      .text(width / 2, settingsY + 30, paceLabel(store.settings().pace), {
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

    // Language of the orders: tap to switch.
    const langLabel = (l: Lang) => `Orders in: < ${LANG_LABELS[l]} >`;
    const langText = this.add
      .text(width / 2, settingsY, langLabel(store.settings().lang), {
        fontFamily: FONTS.mono,
        fontSize: '17px',
        color: COLORS.cream,
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    langText.on('pointerdown', () => {
      const next: Lang = store.settings().lang === 'en' ? 'fr' : 'en';
      langText.setText(langLabel(store.updateSettings({ lang: next }).lang));
    });

    // Thursday's house orders (capitals and punctuation) can be switched off.
    const toggleLabel = (on: boolean) => `[${on ? 'x' : ' '}] Caps & punctuation (Thursday)`;
    const toggle = this.add
      .text(width / 2, settingsY + 60, toggleLabel(store.settings().fancyOrders), {
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
