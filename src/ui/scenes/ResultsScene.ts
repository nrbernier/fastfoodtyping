import Phaser from 'phaser';
import { OVERTIME, SHIFTS } from '../../core/shifts';
import type { ShiftConfig, ShiftResult } from '../../core/types';
import { SaveStore, safeLocalStorage } from '../../persistence/storage';
import { COLORS, FONTS, makeButton } from '../theme';
import { applyPaperGrain } from '../texture';
import { KEY_ROWS, keyHeat, nextShiftTip, receiptRows } from '../report';

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

    store.recordTally(r.tally);
    const tip = nextShiftTip(store.typingTally());

    this.add.rectangle(0, 0, width, height, COLORS.wall).setOrigin(0);

    const buttonGap = Math.min(64, height * 0.1);
    const buttonsY = height - buttonGap * 1.9;
    this.buildReceipt(width / 2, 14, buttonsY - buttonGap * 0.6 - 14, r, tip, newHigh);

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
    makeButton(this, width * 0.5, buttonsY + buttonGap, 'MENU', () =>
      this.scene.start('title'),
    );

    applyPaperGrain(this);
  }

  /** The receipt: stats, a keyboard of missed keys, next shift's drill and the verdict. */
  private buildReceipt(x: number, top: number, maxH: number, r: ShiftResult, tip: string, newHigh: boolean) {
    const ink = { fontFamily: FONTS.mono, fontSize: '16px', color: COLORS.dark };
    const w = 300;
    const pad = 16;
    const left = -w / 2 + pad;
    const right = w / 2 - pad;
    const lineH = 20;
    const parts: Phaser.GameObjects.GameObject[] = [];
    const dots = this.add.graphics().fillStyle(COLORS.darkHex, 0.7);
    const rule = (y: number) => {
      for (let dx = left; dx < right; dx += 6) dots.fillRect(dx, y, 3, 1.5);
    };
    let y = pad;

    for (const row of receiptRows(r, this.config.name)) {
      if (row.kind === 'rule') rule(y + lineH / 2);
      else if (row.kind === 'title') parts.push(this.add.text(0, y, row.text, ink).setOrigin(0.5, 0));
      else if (row.kind === 'note') parts.push(this.add.text(left + 14, y, row.text, ink));
      else {
        const label = this.add.text(left, y, row.label, ink);
        const value = this.add.text(right, y, row.value, ink).setOrigin(1, 0);
        for (let dx = left + label.width + 6; dx < right - value.width - 6; dx += 5) dots.fillCircle(dx, y + 15, 1);
        parts.push(label, value);
      }
      y += lineH;
    }
    y += 8;

    parts.push(this.add.text(0, y, 'missed keys', { ...ink, fontSize: '13px' }).setOrigin(0.5, 0));
    y += 20;
    const key = Math.floor((w - pad * 2) / 10);
    KEY_ROWS.forEach((keys, i) => {
      const rowX = -(keys.length * key) / 2 + i * key * 0.25;
      [...keys].forEach((k, j) => {
        const cx = rowX + j * key + key / 2;
        parts.push(
          this.add.rectangle(cx, y + key / 2, key - 3, key - 3, keyHeat(r.tally, k)).setStrokeStyle(1, COLORS.darkHex, 0.5),
          this.add.text(cx, y + key / 2, k.toUpperCase(), { ...ink, fontSize: `${Math.round(key * 0.5)}px` }).setOrigin(0.5),
        );
      });
      y += key;
    });
    y += 10;

    const tipText = this.add.text(0, y, tip, { ...ink, align: 'center', wordWrap: { width: w - pad * 2 } }).setOrigin(0.5, 0);
    parts.push(tipText);
    y += tipText.height + 4;
    rule(y + lineH / 2);
    y += lineH;
    const verdict = [
      r.won ? 'SHIFT SURVIVED!' : "YOU'RE FIRED",
      ...(r.won ? [] : ['(see you tomorrow.)']),
      ...(newHigh ? ['★ NEW BEST! ★'] : []),
    ];
    const foot = this.add.text(0, y, verdict.join('\n'), { ...ink, align: 'center' }).setOrigin(0.5, 0);
    parts.push(foot);
    y += foot.height + pad;

    // Torn-edge paper behind everything.
    const paper = this.add.graphics();
    paper.fillStyle(COLORS.darkHex, 0.3).fillRect(-w / 2 + 4, 4, w, y);
    paper.fillStyle(COLORS.creamHex).fillRect(-w / 2, 0, w, y);
    paper.fillStyle(COLORS.wall);
    for (let tx = -w / 2; tx < w / 2; tx += 10) paper.fillTriangle(tx, y, tx + 10, y, tx + 5, y - 5);
    const receipt = this.add.container(x, top, [paper, dots, ...parts]);
    receipt.setScale(Math.min(1, maxH / y, (this.scale.width - 24) / (w + 4)));
  }
}
