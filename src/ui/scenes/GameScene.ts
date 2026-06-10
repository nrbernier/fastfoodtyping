import Phaser from 'phaser';
import type { ShiftConfig } from '../../core/types';
import { FONT, makeButton } from '../theme';

export class GameScene extends Phaser.Scene {
  private config!: ShiftConfig;

  constructor() {
    super('game');
  }

  init(data: { config: ShiftConfig }) {
    this.config = data.config;
  }

  create() {
    const { width, height } = this.scale;
    this.add
      .text(width / 2, height * 0.4, `GAME: ${this.config.name}`, { fontFamily: FONT, fontSize: '28px', color: '#2e2a26' })
      .setOrigin(0.5);
    makeButton(this, width / 2, height * 0.6, 'END (stub)', () =>
      this.scene.start('results', {
        config: this.config,
        result: {
          shiftId: this.config.id,
          won: true,
          score: 123,
          served: 5,
          strikes: 1,
          accuracy: 0.95,
          wpm: 30,
          bestCombo: 3,
          elapsedMs: 60_000,
        },
      }),
    );
  }
}
