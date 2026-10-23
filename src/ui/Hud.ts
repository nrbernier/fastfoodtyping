import Phaser from 'phaser';
import { makePlateIcon } from './scenery';
import { COLORS, FONTS } from './palette';

const PLATE_RADIUS = 17;
const PLATE_GAP = 46;

/** Top-left strike plates. Score moved to the cash register; bottom bar removed. */
export class Hud {
  private strikeRow: Phaser.GameObjects.Container;
  private strikes = 0;
  private soundToggle?: Phaser.GameObjects.Text;

  constructor(private scene: Phaser.Scene) {
    // Strikes live near the top of the screen so a broken plate is impossible to miss.
    this.strikeRow = scene.add.container(28, 34).setDepth(1000);
    this.renderStrikes();
  }

  /** Re-assert the strike row's fixed top-left position after a viewport resize. */
  layout(_width: number, _height: number) {
    this.strikeRow.setPosition(28, 34);
    this.soundToggle?.setPosition(28 + 2 * PLATE_GAP + 40, 34);
  }

  /** A small speaker button beside the strike plates. */
  addSoundToggle(on: boolean, onChange: (on: boolean) => void) {
    const label = (v: boolean) => (v ? '♪ on' : '♪ off');
    this.soundToggle = this.scene.add
      .text(28 + 2 * PLATE_GAP + 40, 34, label(on), {
        fontFamily: FONTS.mono, fontSize: '15px', color: COLORS.dark,
        backgroundColor: COLORS.cream, padding: { x: 6, y: 3 },
      })
      .setOrigin(0, 0.5)
      .setDepth(1000)
      .setInteractive({ useHandCursor: true });
    this.soundToggle.on('pointerdown', () => {
      on = !on;
      this.soundToggle!.setText(label(on));
      onChange(on);
    });
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
