import Phaser from 'phaser';
import type { Order } from '../core/types';
import { COLORS, FONTS } from './theme';
import {
  ART_SCALE, BURNER_KEY, kitchenArt, CLOCHE_BASE_KEY, CLOCHE_LID_KEY, DRINKS, dishTextureKey, FLAME_KEY, POT_KEY, SMOKE_COLORS,
} from './dishArt';
import { servingFor } from './dishes';

/** Rasterize every kitchen drawing (dishes, pot, cloche) into a texture. */
export function loadKitchenArt(scene: Phaser.Scene): Promise<unknown> {
  return Promise.allSettled(kitchenArt().map(({ key, svg }) => {
    if (scene.textures.exists(key)) return Promise.resolve();
    return new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        scene.textures.addImage(key, img);
        resolve();
      };
      img.onerror = () => {
        console.warn(`kitchen art failed to render: ${key}`);
        reject(new Error(key));
      };
      img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    });
  }));
}

export interface KitchenLayout {
  /** Pot centre and the y its burner stands on, in the front panel. */
  potX: number;
  potBaseY: number;
  /** Depth line at the back of the counter where dishes slide. */
  laneY: number;
  /** Responsive scale (uiScale). */
  scale: number;
}

/** Drawing units → screen px for the pot (84 units wide) and dishes (80 units wide). */
const POT_UNITS_PX = 1.5;
const DISH_UNITS_PX = 0.85;

/**
 * The red enamel stockpot on its burner in the front panel. Finished words
 * fall in behind the rim and the pot answers with a jolt and a puff of steam;
 * served orders come up on the counter above it and slide along the back of
 * the counter to their customer. Weird dishes ride under a silver cloche whose
 * lid tips up in a puff of coloured smoke.
 */
export class Kitchen {
  private pot: Phaser.GameObjects.Image;
  private burner: Phaser.GameObjects.Image;
  private flames: Phaser.GameObjects.Image[] = [];
  private layout!: KitchenLayout;

  constructor(
    private scene: Phaser.Scene,
    layout: KitchenLayout,
    private depths: { pot: number; lane: number; dropped: number },
  ) {
    this.burner = scene.add.image(0, 0, BURNER_KEY).setOrigin(0.5, 0).setDepth(depths.pot);
    for (let i = 0; i < 4; i++) {
      const flame = scene.add.image(0, 0, FLAME_KEY).setOrigin(0.5, 1).setDepth(depths.pot - 0.1);
      scene.tweens.add({ targets: flame, scaleY: { from: flame.scaleY, to: flame.scaleY * 0.7 }, duration: 260 + i * 40, yoyo: true, repeat: -1 });
      this.flames.push(flame);
    }
    this.pot = scene.add.image(0, 0, POT_KEY).setOrigin(0.5, 1).setDepth(depths.pot);
    this.reposition(layout);
    scene.time.addEvent({ delay: 700, loop: true, callback: () => this.steam(false) });
  }

  private get potScale(): number {
    return (POT_UNITS_PX * this.layout.scale) / ART_SCALE;
  }

  private get dishScale(): number {
    return (DISH_UNITS_PX * this.layout.scale) / ART_SCALE;
  }

  /** Top of the rim, where words disappear and steam escapes. */
  private get rimY(): number {
    return this.pot.y - this.pot.displayHeight + 4 * POT_UNITS_PX * this.layout.scale;
  }

  reposition(layout: KitchenLayout) {
    this.layout = layout;
    const s = this.potScale;
    this.burner.setScale(s).setPosition(layout.potX, layout.potBaseY);
    this.pot.setScale(s).setPosition(layout.potX, layout.potBaseY + 1);
    this.flames.forEach((f, i) => {
      f.setScale(s).setPosition(layout.potX + (i - 1.5) * 9 * POT_UNITS_PX * layout.scale, layout.potBaseY + 1);
    });
  }

  /** A soft cloud of steam drifting up from the rim; `big` for the puff after a word lands. */
  private steam(big: boolean) {
    const s = this.layout.scale;
    const x = this.layout.potX + (big ? 0 : Phaser.Math.Between(-14, 14) * s);
    const r = (big ? 13 : 6) * s;
    const parts = big
      ? [[-1.1, 0.2, 0.9], [1, 0, 1], [0, -0.8, 1.1], [-0.4, 0.5, 0.8], [0.6, 0.6, 0.8]]
      : [[0, 0, 1], [0.9, -0.5, 0.8], [-0.8, -0.7, 0.7]];
    const cloud = this.scene.add.container(x, this.rimY - 4 * s,
      parts.map(([dx, dy, k]) => this.scene.add.circle(dx * r, dy * r, r * k, 0xffffff, 1).setStrokeStyle(1.5, COLORS.darkHex, 0.18)),
    ).setDepth(this.depths.pot + 0.5).setAlpha(big ? 0.95 : 0.7).setScale(big ? 0.4 : 1);
    this.scene.tweens.add({
      targets: cloud,
      y: cloud.y - (big ? 38 : 46) * s,
      scale: big ? 1.6 : 1.7,
      alpha: 0,
      duration: big ? 900 : 1700,
      ease: 'Sine.Out',
      onComplete: () => cloud.destroy(),
    });
  }

  /** A finished word falls from its ticket into the pot, then a jolt and a puff. */
  dropWord(word: string, fromX: number, fromY: number) {
    const label = this.scene.add.text(fromX, fromY, word, {
      fontFamily: FONTS.mono, fontSize: '18px', color: COLORS.dark,
      backgroundColor: COLORS.cream, padding: { x: 4, y: 1 },
    }).setOrigin(0.5).setDepth(this.depths.dropped).setScale(this.layout.scale);
    this.scene.tweens.add({
      targets: label,
      x: this.layout.potX,
      y: this.rimY + 14 * this.layout.scale,
      scale: 0.55 * this.layout.scale,
      duration: 420,
      ease: 'Quad.In',
      onComplete: () => {
        label.destroy();
        this.jolt();
        this.steam(true);
      },
    });
  }

  private jolt() {
    this.scene.tweens.killTweensOf(this.pot);
    this.pot.setAngle(0);
    this.scene.tweens.chain({
      targets: this.pot,
      tweens: [
        { angle: -2.5, duration: 60 },
        { angle: 2, duration: 70 },
        { angle: -1, duration: 70 },
        { angle: 0, duration: 60 },
      ],
    });
  }

  /** Rattle the pot on a wrong keystroke. */
  shake() {
    const x = this.layout.potX;
    this.scene.tweens.add({
      targets: this.pot, x: x + 4 * this.layout.scale, duration: 40, yoyo: true, repeat: 2,
      onComplete: () => this.pot.setX(x),
    });
  }

  /**
   * Bring the order up on the counter above the pot and slide it along the
   * back of the counter to `targetX`. `onArrive` fires once it has settled
   * (and for a mystery dish, once the lid is off).
   */
  serve(order: Pick<Order, 'text' | 'tier' | 'exact'>, targetX: number, onArrive?: () => void) {
    const serving = servingFor(order);
    const { potX, laneY } = this.layout;
    const s = this.dishScale;
    const parts: Phaser.GameObjects.GameObject[] = [];
    let lid: Phaser.GameObjects.Image | undefined;
    let smoke: Phaser.GameObjects.Container | undefined;
    if (serving.kind === 'dish') {
      parts.push(this.scene.add.image(0, 0, dishTextureKey(serving.dish)));
    } else {
      parts.push(this.scene.add.image(0, 0, CLOCHE_BASE_KEY));
      smoke = this.smokeCloud(SMOKE_COLORS[serving.smoke]).setScale(0.3).setAlpha(0);
      lid = this.scene.add.image(0, 0, CLOCHE_LID_KEY);
      parts.push(smoke, lid);
    }
    // Dish art is centred on (0,0) with the plate around y = 12 of a 56-unit box.
    const dish = this.scene.add.container(potX, laneY + 14 * this.layout.scale, parts)
      .setScale(s).setAlpha(0).setDepth(this.depths.lane);
    const drink = serving.kind === 'dish' && DRINKS.has(serving.dish);
    const dir = Math.sign(targetX - potX) || 1;
    const settle = () => {
      if (!lid || !smoke) return onArrive?.();
      this.scene.tweens.add({ targets: lid, x: 18 * ART_SCALE, y: -40 * ART_SCALE, angle: 24, duration: 260, ease: 'Quad.Out' });
      this.scene.tweens.add({ targets: lid, alpha: 0, delay: 500, duration: 300 });
      this.scene.tweens.add({ targets: smoke, scale: 1, alpha: 1, duration: 280, ease: 'Back.Out', onComplete: () => onArrive?.() });
    };
    this.scene.tweens.chain({
      targets: dish,
      tweens: [
        { y: laneY, alpha: 1, duration: 160, ease: 'Quad.Out' },
        { x: targetX + dir * (drink ? 6 : 3) * this.layout.scale, duration: drink ? 300 : 420, ease: 'Quad.Out' },
        { x: targetX, duration: drink ? 160 : 90, ease: drink ? 'Back.Out' : 'Sine.Out' },
      ],
      onComplete: settle,
    });
    // Clear the counter once the customer has had it.
    this.scene.tweens.add({
      targets: dish, alpha: 0, delay: 1700, duration: 300,
      onComplete: () => dish.destroy(),
    });
  }

  /** Coloured smoke that fills the plate when the cloche comes off (in art pixels). */
  private smokeCloud(color: number): Phaser.GameObjects.Container {
    const A = ART_SCALE;
    const puffs = [[-16, 6, 9], [16, 6, 9], [-8, 0, 11], [9, -1, 11], [0, -8, 12], [0, 7, 12]].map(([x, y, r]) =>
      this.scene.add.circle(x * A, y * A, r * A, color, 1).setStrokeStyle(A, COLORS.darkHex, 0.35),
    );
    return this.scene.add.container(0, 0, puffs);
  }
}
