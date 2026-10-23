import Phaser from 'phaser';
import { COLORS, FONTS } from './palette';
import { starburstPoints, wrapOrder } from './geom';

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

export interface LiveTicket {
  container: Phaser.GameObjects.Container;
  /** Re-render with the first `typedCount` chars green and a caret after them. */
  update(typedCount: number): void;
  /** Snap the whole order green (caret gone) and pop — the "order's up!" beat. */
  complete(): void;
  /** Resting scale the pop animations spring back to (responsive shrink). */
  setBaseScale(s: number): void;
}

/** Order ticket whose text shows typed (green) vs remaining (ink) with a caret; long orders wrap. */
export function makeLiveTicket(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  maxWidth = 230,
  hiddenChars = 0,
): LiveTicket {
  const style = { fontFamily: FONTS.mono, fontSize: '22px', align: 'center' as const };
  const probe = scene.add.text(0, 0, '', style);
  const ranges = wrapOrder(text, (line) => probe.setText(line).width + 28 <= maxWidth);
  // Size the paper for the fully revealed order, which can be wider than its
  // hidden form ("? pancakes" -> "three pancakes").
  const widest = Math.max(...ranges.map(([a, b]) => probe.setText(text.slice(a, b).trimEnd()).width));
  const lineH = probe.setText('Mg').height;
  probe.destroy();

  const lines = ranges.map(([start, end], i) => {
    const ly = (i - (ranges.length - 1) / 2) * lineH;
    return {
      start,
      end,
      typed: scene.add.text(0, ly, '', { ...style, color: COLORS.green }).setOrigin(0, 0.5),
      caret: scene.add.text(0, ly, '_', { ...style, color: COLORS.red }).setOrigin(0, 0.5),
      rest: scene.add.text(0, ly, '', { ...style, color: COLORS.dark }).setOrigin(0, 0.5),
    };
  });

  const w = widest + 28;
  const h = lineH * lines.length + 16;
  const shadow = scene.add.rectangle(3, 3, w, h, COLORS.darkHex, 0.35).setOrigin(0.5);
  const tail = scene.add.triangle(0, h / 2 + 4, 0, 0, 14, 0, 7, 9, COLORS.darkHex).setOrigin(0.5, 0);
  const paper = scene.add.rectangle(0, 0, w, h, COLORS.creamHex).setStrokeStyle(2, COLORS.darkHex).setOrigin(0.5);
  const textGroup = scene.add.container(0, 0, lines.flatMap((l) => [l.typed, l.caret, l.rest]));
  const container = scene.add.container(x, y, [shadow, tail, paper, textGroup]);
  let baseScale = 1;

  function update(typedCount: number) {
    for (const line of lines) {
      const local = Math.max(0, Math.min(typedCount, line.end) - line.start);
      const done = text.slice(line.start, line.start + local);
      let remaining = text.slice(line.start + local, line.end).trimEnd();
      // The first `hiddenChars` stay a single "?" until the player has typed past them.
      if (line.start === 0 && typedCount < hiddenChars) remaining = `?${text.slice(hiddenChars, line.end).trimEnd()}`;
      line.typed.setText(done);
      line.rest.setText(remaining);
      // The caret sits on the line holding the next character to type.
      line.caret.setVisible(typedCount < text.length && typedCount >= line.start && typedCount < line.end);
      const caretW = line.caret.visible ? line.caret.width : 0;
      const total = line.typed.width + caretW + line.rest.width;
      const startX = -total / 2;
      line.typed.setX(startX);
      line.caret.setX(startX + line.typed.width);
      line.rest.setX(startX + line.typed.width + caretW);
    }
    if (typedCount > 0) {
      scene.tweens.add({
        targets: textGroup, scaleX: 1.06, scaleY: 1.06, duration: 60, yoyo: true,
      });
    }
  }

  function complete() {
    update(text.length); // whole order green, caret hidden
    paper.setStrokeStyle(3, 0x27ae60); // green confirm border
    scene.tweens.add({
      targets: container, scaleX: baseScale * 1.18, scaleY: baseScale * 1.18,
      duration: 130, yoyo: true, ease: 'Quad.Out',
    });
  }

  function setBaseScale(s: number) {
    baseScale = s;
  }

  update(0);
  return { container, update, complete, setBaseScale };
}
