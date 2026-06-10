import Phaser from 'phaser';

export const COLORS = {
  wall: 0x7fd4cf,
  wallDark: 0x5bbab5,
  counter: 0xd9d9d9,
  counterEdge: 0x9e9e9e,
  hud: 0x2e2a26,
  cream: '#fdf3e3',
  creamHex: 0xfdf3e3,
  red: '#c0392b',
  redHex: 0xc0392b,
  dark: '#2e2a26',
  green: '#27ae60',
  yellow: '#f1c40f',
  white: '#ffffff',
};

export const FONT = 'Verdana, Geneva, sans-serif';

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
