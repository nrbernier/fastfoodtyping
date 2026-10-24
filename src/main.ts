import Phaser from 'phaser';
import { BootScene } from './ui/scenes/BootScene';
import { TitleScene } from './ui/scenes/TitleScene';
import { ShiftSelectScene } from './ui/scenes/ShiftSelectScene';
import { GameScene } from './ui/scenes/GameScene';
import { ResultsScene } from './ui/scenes/ResultsScene';
import { ScrapbookScene } from './ui/scenes/ScrapbookScene';
import { TestLabScene } from './ui/scenes/TestLabScene';

// Keep the canvas exactly the size of the *visual* viewport so the mobile
// keyboard never covers gameplay (interactive-widget=resizes-content helps,
// visualViewport is the belt to those braces).
function fitToViewport() {
  const app = document.getElementById('app')!;
  const vv = window.visualViewport;
  if (vv) app.style.height = `${vv.height}px`;
}
window.visualViewport?.addEventListener('resize', fitToViewport);
fitToViewport();

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'app',
  backgroundColor: '#f4e8cf',
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, TitleScene, ShiftSelectScene, GameScene, ResultsScene, ScrapbookScene, TestLabScene],
});

// Dev-only handle so browser scripts can jump straight to a scene.
if (import.meta.env.DEV) (window as unknown as { __game: Phaser.Game }).__game = game;

// Branch previews wear a ribbon so they are never mistaken for the real game.
const previewBranch: string | undefined = import.meta.env.VITE_PREVIEW_BRANCH;
if (previewBranch) {
  const ribbon = document.createElement('div');
  ribbon.textContent = `PREVIEW · ${previewBranch}`;
  ribbon.style.cssText =
    'position:fixed;left:50%;bottom:0;transform:translateX(-50%);z-index:10;pointer-events:none;' +
    'background:#26221e;color:#e3a51c;font:600 11px/1 sans-serif;padding:4px 10px;border-radius:6px 6px 0 0;opacity:.85';
  document.body.appendChild(ribbon);
}
