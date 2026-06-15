// Self-contained design-preview entry. Boots straight into a frozen "busy
// mid-shift" GameScene at phone size, with all art + fonts inlined (see
// gen-assets.mjs) so the built HTML is a single shareable file.
import Phaser from 'phaser';
import { GameScene } from '../src/ui/scenes/GameScene';
import { CHARACTERS } from '../src/ui/assets';
import { buildPaperGrain } from '../src/ui/texture';
import { SHIFTS } from '../src/core/shifts';
import { CHARACTER_DATA_URIS, FONT_FACE_CSS } from './assets.generated';

// Register the inlined webfonts so Phaser text rasterizes the real diner fonts.
const fontStyle = document.createElement('style');
fontStyle.textContent = FONT_FACE_CSS;
document.head.appendChild(fontStyle);

// Wednesday: a full 3-seat counter on phones, short orders — reads as "busy".
const DEMO_SHIFT = SHIFTS[2];
const DEMO_SEED = 7;

/** Boot scene that loads the cast from inlined data URIs, then starts the
 *  frozen demo. No placeholder texture needed — every character is present. */
class DemoBoot extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  preload() {
    for (const c of CHARACTERS) this.load.image(c.key, CHARACTER_DATA_URIS[c.key]);
  }

  create() {
    buildPaperGrain(this);
    const ready: Promise<unknown> = document.fonts?.ready ?? Promise.resolve();
    ready.finally(() => this.scene.start('game', { config: DEMO_SHIFT, demo: true, seed: DEMO_SEED }));
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'app',
  backgroundColor: '#f4e8cf',
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [DemoBoot, GameScene],
});
