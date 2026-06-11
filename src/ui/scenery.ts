import Phaser from 'phaser';
import { COLORS } from './palette';
import { FONTS } from './theme';
import { dishOutline, perspectiveFloorQuads } from './geom';

const FLOOR_DARK = 0x2f6e6a;  // dark teal — recedes instead of vibrating
const FLOOR_LIGHT = COLORS.creamHex;

/** Draw a receding checker floor into a graphics object owned by the caller. */
export function drawPerspectiveFloor(
  scene: Phaser.Scene,
  topY: number,
  bottomY: number,
  width: number,
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  const quads = perspectiveFloorQuads({
    width, top: topY, bottom: bottomY, rows: 6, cols: 10, vanishInset: 0.32,
  });
  for (const q of quads) {
    g.fillStyle(q.dark ? FLOOR_DARK : FLOOR_LIGHT, 1);
    g.beginPath();
    g.moveTo(q.points[0].x, q.points[0].y);
    for (const pt of q.points.slice(1)) g.lineTo(pt.x, pt.y);
    g.closePath();
    g.fillPath();
  }
  return g;
}

/** Venetian-blind window: frame, daylight fill, slat lines. */
export function makeWindowBlinds(
  scene: Phaser.Scene, x: number, y: number, w: number, h: number,
): Phaser.GameObjects.Container {
  const frame = scene.add.rectangle(0, 0, w, h, COLORS.counterEdge).setStrokeStyle(4, COLORS.darkHex);
  const pane = scene.add.rectangle(0, 0, w - 12, h - 12, 0x5fb6af); // pale daylight teal
  const slats = scene.add.graphics();
  slats.lineStyle(2, COLORS.darkHex, 0.18);
  for (let sy = -h / 2 + 10; sy < h / 2 - 6; sy += 9) {
    slats.lineBetween(-w / 2 + 8, sy, w / 2 - 8, sy);
  }
  return scene.add.container(x, y, [frame, pane, slats]);
}

/** Wall menu board: charcoal slate, red header, mono price rows. */
export function makeMenuBoard(
  scene: Phaser.Scene, x: number, y: number,
): Phaser.GameObjects.Container {
  const w = 220;
  const h = 150;
  const board = scene.add.rectangle(0, 0, w, h, COLORS.darkHex).setStrokeStyle(5, COLORS.mustardHex);
  const header = scene.add.rectangle(0, -h / 2 + 18, w - 12, 26, COLORS.redHex);
  const title = scene.add
    .text(0, -h / 2 + 18, 'TODAY • 5¢ COFFEE', {
      fontFamily: FONTS.sans, fontSize: '13px', fontStyle: 'bold', color: COLORS.cream,
    })
    .setOrigin(0.5);
  const rows = ['BURGER ........ 25¢', 'SHAKE ......... 15¢', 'PIE ........... 10¢', 'COFFEE ........ 5¢'];
  const items = rows.map((r, i) =>
    scene.add
      .text(-w / 2 + 16, -h / 2 + 44 + i * 24, r, {
        fontFamily: FONTS.mono, fontSize: '15px', color: COLORS.cream,
      })
      .setOrigin(0, 0),
  );
  return scene.add.container(x, y, [board, header, title, ...items]);
}

/** Glowing tube sign; returns container whose first child is the tube for flicker. */
export function makeNeonSign(
  scene: Phaser.Scene, x: number, y: number, label: string,
): Phaser.GameObjects.Container {
  const tube = scene.add
    .text(0, 0, label, {
      fontFamily: FONTS.script, fontSize: '34px', color: COLORS.mustard,
    })
    .setOrigin(0.5);
  const glow = scene.add
    .text(0, 0, label, { fontFamily: FONTS.script, fontSize: '34px', color: COLORS.red })
    .setOrigin(0.5)
    .setAlpha(0.35)
    .setScale(1.08);
  return scene.add.container(x, y, [glow, tube]);
}

/** A plated burger/shake that pops out of the bowl. */
export function makeDish(scene: Phaser.Scene, x: number, y: number): Phaser.GameObjects.Container {
  const plate = scene.add.graphics();
  const ring = dishOutline(30).map((p) => new Phaser.Math.Vector2(p.x, p.y));
  plate.fillStyle(COLORS.creamHex, 1).fillPoints(ring, true);
  plate.lineStyle(2, COLORS.darkHex, 1).strokePoints(ring, true);
  const food = scene.add.graphics();
  food.fillStyle(COLORS.redHex, 1).fillEllipse(0, -5, 30, 13);   // patty
  food.fillStyle(COLORS.mustardHex, 1).fillEllipse(0, -10, 24, 8); // bun top
  return scene.add.container(x, y, [plate, food]);
}

/** Small counter prop selected by index (ketchup, napkins, cake stand, cup). */
export function makeCounterProp(scene: Phaser.Scene, x: number, y: number, kind: number): Phaser.GameObjects.Container {
  const g = scene.add.graphics();
  switch (kind % 4) {
    case 0: // ketchup bottle
      g.fillStyle(COLORS.redHex, 1).fillRoundedRect(-6, -22, 12, 22, 3);
      g.fillStyle(COLORS.darkHex, 1).fillRect(-3, -28, 6, 6);
      break;
    case 1: // napkin dispenser
      g.fillStyle(COLORS.counterEdge, 1).fillRect(-12, -14, 24, 14);
      g.fillStyle(COLORS.creamHex, 1).fillRect(-3, -20, 6, 8);
      break;
    case 2: // cake stand
      g.fillStyle(COLORS.creamHex, 1).fillEllipse(0, 0, 34, 8);
      g.fillStyle(COLORS.mustardHex, 1).fillTriangle(-12, 0, 12, 0, 0, -20);
      break;
    default: // coffee cup
      g.fillStyle(COLORS.creamHex, 1).fillRoundedRect(-8, -12, 16, 12, 2);
      g.lineStyle(2, COLORS.darkHex, 1).strokeCircle(11, -6, 4);
      break;
  }
  return scene.add.container(x, y, [g]);
}

/** A plate icon for the strike counter; `cracked` greys + splits it. */
export function makePlateIcon(scene: Phaser.Scene, x: number, y: number, cracked: boolean): Phaser.GameObjects.Container {
  const g = scene.add.graphics();
  g.fillStyle(cracked ? COLORS.disabledHex : COLORS.creamHex, 1).fillCircle(0, 0, 9);
  g.lineStyle(2, COLORS.darkHex, 1).strokeCircle(0, 0, 9);
  if (cracked) g.lineStyle(2, COLORS.redHex, 1).lineBetween(-6, -4, 5, 6);
  return scene.add.container(x, y, [g]);
}
