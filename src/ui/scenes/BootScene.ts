import Phaser from 'phaser';
import { CHARACTERS, PLACEHOLDER_KEY } from '../assets';
import { COLORS, FONTS } from '../theme';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  preload() {
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => {
      console.warn(`character art failed to load: ${file.key} (${file.url})`);
    });
    for (const c of CHARACTERS) this.load.image(c.key, c.file);
  }

  create() {
    this.makePlaceholderTexture();
    // Wait for webfonts so Phaser never rasterizes fallback fonts into text
    // objects. fonts.ready resolves even when a font fails — safe offline.
    const ready: Promise<unknown> = document.fonts?.ready ?? Promise.resolve();
    ready.finally(() => this.scene.start('title'));
  }

  /** Cream card with a slab "?" — used when a character texture is missing. */
  private makePlaceholderTexture() {
    if (this.textures.exists(PLACEHOLDER_KEY)) return;
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(COLORS.creamHex, 1).fillRoundedRect(0, 0, 96, 128, 10);
    g.lineStyle(3, COLORS.darkHex, 1).strokeRoundedRect(2, 2, 92, 124, 10);
    const q = this.make.text(
      { x: 0, y: 0, text: '?', style: { fontFamily: FONTS.slab, fontSize: '64px', color: COLORS.dark } },
      false,
    );
    const rt = this.make.renderTexture({ x: 0, y: 0, width: 96, height: 128 }, false);
    rt.draw(g, 0, 0);
    rt.draw(q, 48 - q.width / 2, 64 - q.height / 2);
    rt.saveTexture(PLACEHOLDER_KEY);
    g.destroy();
    q.destroy();
    rt.destroy();
  }
}
