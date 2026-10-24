import Phaser from 'phaser';
import { OVERTIME, SHIFTS } from '../../core/shifts';
import { formatMoney } from '../../core/money';
import { SaveStore, safeLocalStorage } from '../../persistence/storage';
import { UNLOCK_ALL } from '../preview';
import { COLORS, FONTS, makeButton, makeStarburst } from '../theme';
import { applyPaperGrain } from '../texture';
import { PLACEHOLDER_KEY, TITLE_LINEUP, TITLE_LINEUP_WIDE } from '../assets';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('title');
  }

  create() {
    const { width, height } = this.scale;
    const save = new SaveStore(safeLocalStorage()).load();
    const overtimeUnlocked = UNLOCK_ALL || save.unlockedShift >= SHIFTS.length;

    // teal poster field with checkerboard floor strip
    this.add.rectangle(0, 0, width, height, COLORS.wall).setOrigin(0);
    this.drawCheckerboard(height - 64, 64);

    // a couple of regulars at the counter, head and shoulders, bobbing gently
    // sized to the space between the last button and the floor
    const lineupH = Phaser.Math.Clamp(height - 64 - (height * 0.575 + 34), 90, 200);
    const lineup = width >= 700 ? TITLE_LINEUP_WIDE : TITLE_LINEUP;
    lineup.forEach((pose, i) => {
      const key = this.textures.exists(pose) ? pose : PLACEHOLDER_KEY;
      const x = width / 2 + (i - (lineup.length - 1) / 2) * Math.min(190, width * 0.38);
      const img = this.add.image(x, height - 60, key).setOrigin(0.5, 1);
      img.setScale(lineupH / img.height);
      this.tweens.add({
        targets: img, y: height - 66, duration: 1300 + i * 170, yoyo: true, repeat: -1, ease: 'Sine.InOut',
      });
    });

    this.buildNeonSign(width / 2, height * 0.15, Math.min(width - 40, 460));

    this.add
      .text(width / 2, height * 0.3, '★ TYPE FAST — SERVE WEIRD ★', {
        fontFamily: FONTS.sans,
        fontSize: '18px',
        fontStyle: 'bold',
        color: COLORS.dark,
      })
      .setOrigin(0.5);

    makeStarburst(this, width - 46, Math.max(44, height * 0.15 - 64), 34, '24 HR\nSERVICE').setDepth(2).setAngle(12);

    makeButton(this, width / 2, height * 0.375, 'START SHIFT', () =>
      this.scene.start('shiftselect'),
    );
    makeButton(
      this,
      width / 2,
      height * 0.475,
      overtimeUnlocked ? 'OVERTIME' : 'OVERTIME (LOCKED)',
      () => this.scene.start('game', { config: OVERTIME }),
      overtimeUnlocked,
    );

    makeButton(this, width / 2, height * 0.575, 'SCRAPBOOK', () => this.scene.start('scrapbook'));

    const best = save.highScores[OVERTIME.id];
    if (best) {
      this.add
        .text(width / 2, height * 0.522, `Overtime best: ${formatMoney(best)}`, {
          fontFamily: FONTS.mono,
          fontSize: '17px',
          color: COLORS.dark,
        })
        .setOrigin(0.5);
    }

    applyPaperGrain(this);
  }

  /**
   * The name in red neon script on a dark sign with a mustard border. The text
   * is drawn large and the whole sign scales down to fit narrow phones.
   */
  private buildNeonSign(x: number, y: number, maxW: number) {
    const glow = (t: Phaser.GameObjects.Text, color: string, blur: number) =>
      t.setShadow(0, 0, color, blur, true, true);
    const name = this.add.text(0, -8, 'Short-Order Hero', {
      fontFamily: FONTS.script, fontSize: '54px', color: '#ffb3a8', padding: { x: 10, y: 10 },
    }).setOrigin(0.5);
    glow(name, '#d63b2a', 16);
    const tagline = this.add.text(0, 38, "MEL'S DINER · EST. 1955", {
      fontFamily: FONTS.sans, fontSize: '14px', color: '#9fe0dc', fontStyle: 'bold',
    }).setOrigin(0.5).setLetterSpacing(4);
    glow(tagline, '#3fa8a1', 8);
    const w = name.width + 30;
    const h = 120;
    const board = this.add.graphics();
    board.fillStyle(COLORS.darkHex, 0.35).fillRoundedRect(-w / 2 + 6, -h / 2 + 8, w, h, 20);
    board.fillStyle(COLORS.mustardHex, 1).fillRoundedRect(-w / 2 - 6, -h / 2 - 6, w + 12, h + 12, 24);
    board.fillStyle(0x1e1b18, 1).fillRoundedRect(-w / 2, -h / 2, w, h, 18);
    board.lineStyle(3, COLORS.darkHex, 1).strokeRoundedRect(-w / 2 - 6, -h / 2 - 6, w + 12, h + 12, 24);
    const sign = this.add.container(x, y, [board, name, tagline]).setScale(Math.min(1, maxW / (w + 12)));
    // the tube buzzes and flickers now and then
    this.time.addEvent({
      delay: 2600,
      loop: true,
      callback: () => {
        if (Math.random() < 0.6) this.tweens.add({ targets: name, alpha: 0.45, duration: 60, yoyo: true, repeat: Phaser.Math.Between(0, 2) });
      },
    });
    return sign;
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
