import Phaser from 'phaser';
import { COLORS, FONTS } from './palette';
import { play } from './sound';

const W = 30;
const H = 38;
/** Tips (in cents) at which the jar looks about two-thirds full. */
const FILL_SCALE = 300;

/**
 * A glass tip jar standing on the cash register. Coins arc into it from each
 * served customer and the pile inside grows with the shift's tips.
 */
export class TipJar {
  private root: Phaser.GameObjects.Container;
  private pile: Phaser.GameObjects.Graphics;
  private fill = 0;

  constructor(private scene: Phaser.Scene, x: number, baseY: number, private scale: number, depth: number) {
    const glass = scene.add.graphics();
    glass.fillStyle(0xdff1f3, 0.45).fillRoundedRect(-W / 2, -H, W, H, 6);
    glass.lineStyle(2, COLORS.darkHex, 0.9).strokeRoundedRect(-W / 2, -H, W, H, 6);
    glass.fillStyle(0xffffff, 0.7).fillRect(-W / 2 + 4, -H + 6, 3, H - 12); // shine
    glass.fillStyle(COLORS.creamHex, 1).fillRect(-W / 2 - 2, -H - 4, W + 4, 6); // rim
    glass.lineStyle(2, COLORS.darkHex, 1).strokeRect(-W / 2 - 2, -H - 4, W + 4, 6);
    const label = scene.add.text(0, -H / 2 + 4, 'TIPS', {
      fontFamily: FONTS.sans, fontSize: '9px', fontStyle: 'bold', color: COLORS.dark, backgroundColor: COLORS.cream,
      padding: { x: 2, y: 0 },
    }).setOrigin(0.5);
    this.pile = scene.add.graphics();
    this.root = scene.add.container(x, baseY, [this.pile, glass, label]).setScale(scale).setDepth(depth);
    this.drawPile();
  }

  reposition(x: number, baseY: number, scale: number) {
    this.scale = scale;
    this.root.setPosition(x, baseY).setScale(scale);
  }

  /** Mouth of the jar in world space, where coins aim. */
  private get mouth(): { x: number; y: number } {
    return { x: this.root.x, y: this.root.y - (H + 2) * this.scale };
  }

  /** Coins arc from (x, y) into the jar; the pile grows to match `totalCents`. */
  addTip(fromX: number, fromY: number, tipCents: number, totalCents: number) {
    const coins = Math.max(2, Math.min(6, Math.round(tipCents / 25)));
    const { x: tx, y: ty } = this.mouth;
    for (let i = 0; i < coins; i++) {
      const coin = this.scene.add.ellipse(fromX, fromY, 10 * this.scale, 10 * this.scale, COLORS.mustardHex)
        .setStrokeStyle(1.5, COLORS.darkHex).setDepth(this.root.depth + 1);
      const peak = Math.min(fromY, ty) - 60 * this.scale;
      const t = { p: 0 };
      this.scene.tweens.add({
        targets: t, p: 1, delay: 250 + i * 70, duration: 520, ease: 'Sine.In',
        onUpdate: () => {
          // A simple arc: linear in x, quadratic through the peak in y.
          const p = t.p;
          coin.setPosition(
            Phaser.Math.Linear(fromX, tx, p),
            (1 - p) * (1 - p) * fromY + 2 * (1 - p) * p * peak + p * p * ty,
          );
          coin.setScale(1, Math.abs(Math.cos(p * 9)) * 0.8 + 0.2); // spinning
        },
        onComplete: () => {
          coin.destroy();
          if (i === coins - 1) {
            play('coin');
            this.fill = 1 - Math.exp(-totalCents / FILL_SCALE);
            this.drawPile();
            this.scene.tweens.add({ targets: this.root, scaleX: this.scale * 1.12, scaleY: this.scale * 0.92, duration: 80, yoyo: true });
          }
        },
      });
    }
  }

  private drawPile() {
    const h = (H - 6) * this.fill;
    this.pile.clear();
    if (h <= 0) return;
    this.pile.fillStyle(COLORS.mustardHex, 1).fillRoundedRect(-W / 2 + 2, -h - 2, W - 4, h, 4);
    this.pile.fillStyle(0xb8860b, 1);
    for (let y = -6; y > -h; y -= 6) {
      for (let x = -W / 2 + 6; x < W / 2 - 4; x += 7) this.pile.fillEllipse(x + ((y / 6) % 2) * 3, y, 6, 3);
    }
  }
}
