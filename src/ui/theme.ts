import Phaser from 'phaser';
import { COLORS, FONTS } from './palette';

export { COLORS, FONTS };
/** @deprecated transitional alias; scenes migrate to FONTS.* in later tasks */
export const FONT = FONTS.sans;

export function makeButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onClick: () => void,
  enabled = true,
): Phaser.GameObjects.Text {
  const btn = scene.add
    .text(x, y, label, {
      fontFamily: FONT,
      fontSize: '26px',
      fontStyle: 'bold',
      color: COLORS.cream,
      backgroundColor: enabled ? COLORS.red : '#8a8a8a',
      padding: { x: 20, y: 10 },
    })
    .setOrigin(0.5);
  if (enabled) {
    btn.setInteractive({ useHandCursor: true });
    btn.on('pointerover', () => btn.setAlpha(0.85));
    btn.on('pointerout', () => btn.setAlpha(1));
    btn.on('pointerdown', onClick);
  }
  return btn;
}
