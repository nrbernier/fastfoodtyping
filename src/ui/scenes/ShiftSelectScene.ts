import Phaser from 'phaser';
import { SHIFTS } from '../../core/shifts';
import { makeButton } from '../theme';

export class ShiftSelectScene extends Phaser.Scene {
  constructor() {
    super('shiftselect');
  }

  create() {
    const { width } = this.scale;
    makeButton(this, width / 2, 120, SHIFTS[0].name, () =>
      this.scene.start('game', { config: SHIFTS[0] }),
    );
  }
}
