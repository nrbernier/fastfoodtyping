import Phaser from 'phaser';
import { COLORS } from './theme';
import { makePlateIcon } from './scenery';

const PLATE_RADIUS = 17;
const PLATE_GAP = 46;

/** Top-left strike plates. Score moved to the cash register; bottom bar removed. */
export class Hud {
  private strikeRow: Phaser.GameObjects.Container;
  private strikes = 0;

  constructor(private scene: Phaser.Scene) {
    // Strikes live near the top of the screen so a broken plate is impossible to miss.
    this.strikeRow = scene.add.container(28, 34).setDepth(1000);
    this.renderStrikes();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  layout(_width: number, _height: number) {
    this.strikeRow.setPosition(28, 34);
  }

  setStrikes(n: number) {
    const broke = n > this.strikes;
    this.strikes = n;
    this.renderStrikes();
    if (broke) this.crackAnim(n - 1);
  }

  private renderStrikes() {
    this.strikeRow.removeAll(true);
    for (let i = 0; i < 3; i++) {
      this.strikeRow.add(makePlateIcon(this.scene, i * PLATE_GAP, 0, i < this.strikes, PLATE_RADIUS));
    }
  }

  /** Punch + jitter the plate that just shattered. */
  private crackAnim(index: number) {
    const plate = this.strikeRow.list[index] as Phaser.GameObjects.Container | undefined;
    if (!plate) return;
    this.scene.tweens.add({
      targets: plate, scaleX: 1.5, scaleY: 1.5, angle: -12,
      duration: 90, yoyo: true, ease: 'Quad.Out',
    });
  }
}
