import Phaser from 'phaser';
import type { ShiftConfig, ShiftResult } from '../../core/types';
import { FONT, makeButton } from '../theme';

export class ResultsScene extends Phaser.Scene {
  private result!: ShiftResult;

  constructor() {
    super('results');
  }

  init(data: { config: ShiftConfig; result: ShiftResult }) {
    this.result = data.result;
  }

  create() {
    const { width, height } = this.scale;
    this.add
      .text(width / 2, height * 0.4, `RESULT: $${this.result.score}`, { fontFamily: FONT, fontSize: '28px', color: '#2e2a26' })
      .setOrigin(0.5);
    makeButton(this, width / 2, height * 0.6, 'MENU', () => this.scene.start('title'));
  }
}
