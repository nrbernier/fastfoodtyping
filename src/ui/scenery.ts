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

/**
 * Wall menus by shift. Early shifts are wholesome diner fare; later shifts read
 * like the kitchen has gone feral, echoing the strange tier-3 orders.
 */
const MENUS: ReadonlyArray<{ header: string; rows: string[] }> = [
  { header: 'TODAY • 5¢ COFFEE', rows: ['BURGER ....... 25¢', 'SHAKE ........ 15¢', 'PIE .......... 10¢', 'COFFEE ........ 5¢'] },
  { header: 'LUNCH COUNTER', rows: ['TUNA MELT .... 30¢', 'CLUB ......... 25¢', 'MALT ......... 15¢', 'SOUP ......... 10¢'] },
  { header: 'BLUE PLATE', rows: ['POT ROAST .... 40¢', 'GUMBO ........ 30¢', 'BISQUE ....... 20¢', 'ASPIC ........ 15¢'] },
  { header: 'GRAVEYARD MENU', rows: ['PICKLED EEL .. 55¢', 'SMOKED KELP .. 45¢', 'JELLIED YAM .. 30¢', 'COLD GRUEL ... 10¢'] },
  { header: 'FULL MOON ☾', rows: ['HAUNTED HAM .. 99¢', 'LIVE OCTOPUS . 80¢', 'MOONBEAM MALT  ??', 'SENTIENT STEW  ??'] },
];

/** Wall menu board: charcoal slate, red header, mono price rows. */
export function makeMenuBoard(
  scene: Phaser.Scene, x: number, y: number, shiftIndex = 0,
): Phaser.GameObjects.Container {
  const menu = MENUS[Math.min(Math.max(shiftIndex, 0), MENUS.length - 1)];
  const w = 220;
  const h = 150;
  const board = scene.add.rectangle(0, 0, w, h, COLORS.darkHex).setStrokeStyle(5, COLORS.mustardHex);
  const header = scene.add.rectangle(0, -h / 2 + 18, w - 12, 26, COLORS.redHex);
  const title = scene.add
    .text(0, -h / 2 + 18, menu.header, {
      fontFamily: FONTS.sans, fontSize: '13px', fontStyle: 'bold', color: COLORS.cream,
    })
    .setOrigin(0.5);
  const items = menu.rows.map((r, i) =>
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
  scene: Phaser.Scene, x: number, y: number, label: string, fontSize = 34,
): Phaser.GameObjects.Container {
  const px = `${fontSize}px`;
  const tube = scene.add
    .text(0, 0, label, { fontFamily: FONTS.script, fontSize: px, color: COLORS.mustard })
    .setOrigin(0.5);
  const glow = scene.add
    .text(0, 0, label, { fontFamily: FONTS.script, fontSize: px, color: COLORS.red })
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

/** Height of the steel spindle, exported so receipt stacking can reach the tip. */
export const RECEIPT_SPIKE_HEIGHT = 100;

/** Metal receipt spindle: a weighted base and a vertical spike served orders pile onto. */
export function makeReceiptSpike(scene: Phaser.Scene, x: number, y: number): Phaser.GameObjects.Container {
  const H = RECEIPT_SPIKE_HEIGHT;
  const g = scene.add.graphics();
  g.fillStyle(COLORS.counterEdge, 1).fillEllipse(0, 0, 46, 16); // weighted base
  g.fillStyle(COLORS.darkHex, 1).fillEllipse(0, -2, 30, 9);
  g.fillStyle(0x9a9488, 1).fillRect(-2.5, -H, 5, H);            // steel spindle
  g.fillStyle(0xc7c2b6, 1).fillRect(-2.5, -H, 2, H);            // highlight edge
  g.fillStyle(COLORS.creamHex, 1).fillCircle(0, -H, 4);         // tip glint
  return scene.add.container(x, y, [g]);
}

/** A small served-order receipt that gets impaled on the spike. */
export function makeSmallReceipt(scene: Phaser.Scene, x: number, y: number): Phaser.GameObjects.Container {
  const w = 24;
  const h = 16;
  const paper = scene.add.rectangle(0, 0, w, h, COLORS.creamHex).setStrokeStyle(1, COLORS.darkHex);
  const lines = scene.add.graphics();
  lines.lineStyle(1, COLORS.darkHex, 0.55);
  for (let ly = -4; ly <= 4; ly += 4) lines.lineBetween(-w / 2 + 3, ly, w / 2 - 3, ly);
  // punch hole where the spike goes through
  const hole = scene.add.circle(0, -h / 2 + 3, 1.5, COLORS.darkHex, 1);
  return scene.add.container(x, y, [paper, lines, hole]);
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

/** One condiment bottle/shaker centered at `dx` within a group. */
function drawCondiment(g: Phaser.GameObjects.Graphics, dx: number, kind: 'ketchup' | 'mustard' | 'salt') {
  if (kind === 'salt') {
    g.fillStyle(COLORS.creamHex, 1).fillRoundedRect(dx - 5, -14, 10, 14, 2);
    g.fillStyle(COLORS.counterEdge, 1).fillRect(dx - 5, -16, 10, 3);
    g.fillStyle(COLORS.darkHex, 1).fillRect(dx - 1, -18, 2, 2);
    return;
  }
  const body = kind === 'ketchup' ? COLORS.redHex : COLORS.mustardHex;
  g.fillStyle(body, 1).fillRoundedRect(dx - 5, -20, 10, 20, 3);
  g.fillStyle(COLORS.creamHex, 1).fillRect(dx - 4, -13, 8, 6); // paper label
  g.fillStyle(COLORS.darkHex, 1).fillRect(dx - 2, -24, 4, 4);  // cap
}

/**
 * A ketchup/mustard/salt trio. `variant` rotates the left-to-right ordering so
 * repeated groups along the counter don't look stamped from one mold.
 */
export function makeCondimentGroup(
  scene: Phaser.Scene, x: number, y: number, variant = 0,
): Phaser.GameObjects.Container {
  const base: Array<'ketchup' | 'mustard' | 'salt'> = ['ketchup', 'mustard', 'salt'];
  const order = base.map((_, i) => base[(i + variant) % 3]);
  const xs = [-15, 0, 15];
  const g = scene.add.graphics();
  order.forEach((kind, i) => drawCondiment(g, xs[i], kind));
  return scene.add.container(x, y, [g]);
}

/** A plate icon for the strike counter; `cracked` greys it and splits it with jagged cracks. */
export function makePlateIcon(
  scene: Phaser.Scene, x: number, y: number, cracked: boolean, radius = 9,
): Phaser.GameObjects.Container {
  const g = scene.add.graphics();
  g.fillStyle(cracked ? COLORS.disabledHex : COLORS.creamHex, 1).fillCircle(0, 0, radius);
  g.lineStyle(Math.max(2, radius * 0.18), COLORS.darkHex, 1).strokeCircle(0, 0, radius);
  // rim ring for a little plate detail
  g.lineStyle(1, COLORS.darkHex, 0.5).strokeCircle(0, 0, radius * 0.62);
  if (cracked) {
    const r = radius;
    g.lineStyle(Math.max(2, radius * 0.16), COLORS.darkHex, 1);
    // a forked crack running across the plate
    g.beginPath();
    g.moveTo(-r * 0.85, -r * 0.2);
    g.lineTo(-r * 0.2, r * 0.1);
    g.lineTo(r * 0.15, -r * 0.25);
    g.lineTo(r * 0.85, r * 0.15);
    g.strokePath();
    g.beginPath();
    g.moveTo(-r * 0.2, r * 0.1);
    g.lineTo(-r * 0.05, r * 0.8);
    g.strokePath();
  }
  return scene.add.container(x, y, [g]);
}

/**
 * Vintage mechanical cash register (FCM line-art): brass body, a cream display
 * window the score sits in, a hint of a key bank, a drawer, and a side crank.
 * Returns the container plus the display text so the scene can drive the score.
 */
export function makeCashRegister(
  scene: Phaser.Scene, x: number, y: number, scoreLabel = '0¢',
): { container: Phaser.GameObjects.Container; scoreText: Phaser.GameObjects.Text } {
  const g = scene.add.graphics();
  // drawer base
  g.fillStyle(COLORS.counter, 1).fillRect(-32, 0, 64, 16);
  g.lineStyle(2, COLORS.darkHex, 1).strokeRect(-32, 0, 64, 16);
  g.fillStyle(COLORS.darkHex, 1).fillCircle(0, 8, 2);
  // upper body
  g.fillStyle(COLORS.counterEdge, 1).fillRoundedRect(-30, -44, 60, 44, 5);
  g.lineStyle(2, COLORS.darkHex, 1).strokeRoundedRect(-30, -44, 60, 44, 5);
  // display window (cream pane the score sits in)
  g.fillStyle(COLORS.creamHex, 1).fillRoundedRect(-24, -40, 48, 20, 3);
  g.lineStyle(2, COLORS.darkHex, 1).strokeRoundedRect(-24, -40, 48, 20, 3);
  // key bank hint
  g.fillStyle(COLORS.darkHex, 0.5);
  for (let kx = -20; kx <= 20; kx += 10) g.fillCircle(kx, -12, 2);
  // side crank
  g.lineStyle(3, COLORS.darkHex, 1).lineBetween(30, -34, 42, -34);
  g.fillStyle(COLORS.redHex, 1).fillCircle(42, -34, 3.5);
  const scoreText = scene.add
    .text(0, -30, scoreLabel, {
      fontFamily: FONTS.sans, fontSize: '15px', fontStyle: 'bold', color: COLORS.dark,
    })
    .setOrigin(0.5);
  const container = scene.add.container(x, y, [g, scoreText]);
  return { container, scoreText };
}
