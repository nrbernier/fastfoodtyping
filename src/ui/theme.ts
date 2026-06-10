import Phaser from 'phaser';
import { COLORS, FONTS } from './palette';
import { starburstPoints } from './geom';

export { COLORS, FONTS };

/** Diner-sign slab button with a hard offset shadow. */
export function makeButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onClick: () => void,
  enabled = true,
): Phaser.GameObjects.Container {
  const text = scene.add
    .text(0, 0, label, {
      fontFamily: FONTS.slab,
      fontSize: '24px',
      color: COLORS.cream,
      align: 'center',
    })
    .setOrigin(0.5);
  const w = text.width + 44;
  const h = text.height + 18;
  const shadow = scene.add.rectangle(4, 4, w, h, COLORS.darkHex, 0.4).setOrigin(0.5);
  const bg = scene.add
    .rectangle(0, 0, w, h, enabled ? COLORS.redHex : COLORS.disabledHex)
    .setStrokeStyle(3, COLORS.darkHex)
    .setOrigin(0.5);
  const btn = scene.add.container(x, y, [shadow, bg, text]).setSize(w, h);
  if (enabled) {
    btn.setInteractive({ useHandCursor: true });
    btn.on('pointerover', () => btn.setAlpha(0.9));
    btn.on('pointerout', () => btn.setAlpha(1));
    btn.on('pointerdown', onClick);
  }
  return btn;
}

/** Mustard advertising starburst with centered label. */
export function makeStarburst(
  scene: Phaser.Scene,
  x: number,
  y: number,
  radius: number,
  text: string,
  bg = COLORS.mustardHex,
  fg = COLORS.dark,
): Phaser.GameObjects.Container {
  const g = scene.add.graphics();
  const pts = starburstPoints(radius).map((p) => new Phaser.Math.Vector2(p.x, p.y));
  g.fillStyle(bg, 1).fillPoints(pts, true);
  const label = scene.add
    .text(0, 0, text, {
      fontFamily: FONTS.sans,
      fontSize: `${Math.max(11, Math.round(radius * 0.3))}px`,
      fontStyle: 'bold',
      color: fg,
      align: 'center',
    })
    .setOrigin(0.5);
  return scene.add.container(x, y, [g, label]).setAngle(-10);
}

/** Cream order-ticket card with offset shadow and a speech tail at the bottom. */
export function makeTicket(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  maxWidth = 220,
  size?: { width: number; height: number },
): Phaser.GameObjects.Container {
  const label = scene.add
    .text(0, 0, text, {
      fontFamily: FONTS.mono,
      fontSize: '17px',
      color: COLORS.dark,
      align: 'center',
      wordWrap: { width: maxWidth - 24 },
    })
    .setOrigin(0.5);
  // Size to the text by default; callers wanting a fixed card (e.g. an empty
  // backdrop) pass an explicit size instead of padding the text with spaces.
  const w = size?.width ?? label.width + 24;
  const h = size?.height ?? label.height + 16;
  const shadow = scene.add.rectangle(3, 3, w, h, COLORS.darkHex, 0.35).setOrigin(0.5);
  const tail = scene.add
    .triangle(0, h / 2 + 4, 0, 0, 14, 0, 7, 9, COLORS.darkHex)
    .setOrigin(0.5, 0);
  const paper = scene.add
    .rectangle(0, 0, w, h, COLORS.creamHex)
    .setStrokeStyle(2, COLORS.darkHex)
    .setOrigin(0.5);
  return scene.add.container(x, y, [shadow, tail, paper, label]);
}
