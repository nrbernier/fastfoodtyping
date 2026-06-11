import Phaser from 'phaser';
import { OVERTIME, SHIFTS } from '../../core/shifts';
import type { ShiftConfig, ShiftResult } from '../../core/types';
import { SaveStore, safeLocalStorage } from '../../persistence/storage';
import { COLORS, FONTS, makeButton } from '../theme';
import { applyPaperGrain } from '../texture';

export class ResultsScene extends Phaser.Scene {
  private config!: ShiftConfig;
  private result!: ShiftResult;

  constructor() {
    super('results');
  }

  init(data: { config: ShiftConfig; result: ShiftResult }) {
    this.config = data.config;
    this.result = data.result;
  }

  create() {
    const { width, height } = this.scale;
    const r = this.result;
    const store = new SaveStore(safeLocalStorage());
    const newHigh = store.recordScore(r.shiftId, r.score);
    const shiftIndex = SHIFTS.findIndex((s) => s.id === r.shiftId);
    if (r.won && shiftIndex >= 0) store.unlockShift(shiftIndex + 1);

    this.add.rectangle(0, 0, width, height, COLORS.wall).setOrigin(0);

    const lines = [
      "      MEL'S DINER      ",
      '     shift receipt     ',
      '------------------------',
      this.config.name,
      '------------------------',
      `customers served ... ${r.served}`,
      `tips earned ........ $${r.score}`,
      `accuracy ........... ${Math.round(r.accuracy * 100)}%`,
      `speed .............. ${Math.round(r.wpm)} wpm`,
      `best combo ......... x${r.bestCombo}`,
      `walkouts ........... ${r.strikes}`,
      '------------------------',
      r.won ? '   SHIFT SURVIVED! ✔   ' : "      YOU'RE FIRED      ",
      ...(r.won ? [] : ['  (see you tomorrow.)  ']),
      ...(newHigh ? ['    ★ NEW BEST! ★    '] : []),
    ];
    this.add
      .text(width / 2, height * 0.08, lines.join('\n'), {
        fontFamily: FONTS.mono,
        fontSize: '17px',
        color: COLORS.dark,
        backgroundColor: COLORS.cream,
        padding: { x: 18, y: 16 },
        align: 'left',
      })
      .setOrigin(0.5, 0);

    const buttonsY = height * 0.82;
    const isLastShift = shiftIndex === SHIFTS.length - 1;
    if (r.won && shiftIndex >= 0 && !isLastShift) {
      makeButton(this, width * 0.5, buttonsY, 'NEXT SHIFT', () =>
        this.scene.start('game', { config: SHIFTS[shiftIndex + 1] }),
      );
    } else if (r.won && isLastShift) {
      makeButton(this, width * 0.5, buttonsY, 'OVERTIME!', () =>
        this.scene.start('game', { config: OVERTIME }),
      );
    } else {
      makeButton(this, width * 0.5, buttonsY, 'TRY AGAIN', () =>
        this.scene.start('game', { config: this.config }),
      );
    }
    makeButton(this, width * 0.5, buttonsY + Math.min(64, height * 0.1), 'MENU', () =>
      this.scene.start('title'),
    );

    applyPaperGrain(this);
  }
}
