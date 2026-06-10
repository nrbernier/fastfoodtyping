import Phaser from 'phaser';
import { BootScene } from './ui/scenes/BootScene';
import { TitleScene } from './ui/scenes/TitleScene';
import { ShiftSelectScene } from './ui/scenes/ShiftSelectScene';
import { GameScene } from './ui/scenes/GameScene';
import { ResultsScene } from './ui/scenes/ResultsScene';

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

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'app',
  backgroundColor: '#f4e8cf',
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, TitleScene, ShiftSelectScene, GameScene, ResultsScene],
});
