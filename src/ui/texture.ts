import Phaser from 'phaser';

const KEY = 'paper-grain';
const TILE = 256;

/** Build a tiling low-contrast speckle texture once (idempotent). */
export function buildPaperGrain(scene: Phaser.Scene): void {
  if (scene.textures.exists(KEY)) return;
  // Draw the speckles straight onto a CanvasTexture. A RenderTexture's GL
  // framebuffer is not reliably flushed before saveTexture in every WebGL
  // context, which leaves a TileSprite sampling the missing-texture debug
  // grid; a CPU-backed canvas uploads deterministically.
  const canvasTex = scene.textures.createCanvas(KEY, TILE, TILE);
  if (!canvasTex) return;
  const ctx = canvasTex.getContext();
  for (let i = 0; i < 1400; i++) {
    const a = Phaser.Math.FloatBetween(0.02, 0.07);
    ctx.fillStyle = `rgba(0,0,0,${a})`;
    ctx.fillRect(Phaser.Math.Between(0, TILE), Phaser.Math.Between(0, TILE), 1, 1);
  }
  canvasTex.refresh();
}

/** Overlay the grain across the whole canvas with multiply blend. */
export function applyPaperGrain(scene: Phaser.Scene): Phaser.GameObjects.TileSprite {
  const { width, height } = scene.scale;
  const grain = scene.add
    .tileSprite(0, 0, width, height, KEY)
    .setOrigin(0)
    .setDepth(1000)
    .setBlendMode(Phaser.BlendModes.MULTIPLY)
    .setAlpha(0.5);
  grain.setActive(false);
  const onResize = () => grain.setSize(scene.scale.width, scene.scale.height);
  scene.scale.on(Phaser.Scale.Events.RESIZE, onResize);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.scale.off(Phaser.Scale.Events.RESIZE, onResize));
  return grain;
}
