import Phaser from 'phaser';
import { COLORS } from './palette';
import { makeMenuBoard, makeNeonSign, makeWindowBlinds } from './scenery';

/**
 * The wall behind the counter: flat teal field, a wainscoting band at the
 * bottom, a window, a wall menu board, and a neon "EAT" sign. Drawn once and
 * left static (the neon flicker is animated separately by the scene).
 */
export class DinerBackdrop {
  readonly neon: Phaser.GameObjects.Container;
  private objects: Phaser.GameObjects.GameObject[] = [];

  constructor(scene: Phaser.Scene, width: number, wallBottom: number, shiftIndex = 0, uiScale = 1) {
    const keep = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      this.objects.push(o);
      return o;
    };
    keep(scene.add.rectangle(0, 0, width, wallBottom, COLORS.wall).setOrigin(0));
    // wainscoting band gives the flat wall depth
    const bandH = Math.min(46, wallBottom * 0.16);
    keep(scene.add.rectangle(0, wallBottom - bandH, width, bandH, COLORS.wallDark).setOrigin(0));
    keep(scene.add.rectangle(0, wallBottom - bandH, width, 3, COLORS.counterEdge).setOrigin(0));

    // Wall furniture shrinks on small/narrow viewports so it doesn't crowd the
    // marquee or collide with the customers' order tickets.
    keep(makeWindowBlinds(scene, width * 0.2, wallBottom * 0.42, 150, 110)).setScale(uiScale);
    keep(makeMenuBoard(scene, width * 0.82, wallBottom * 0.44, shiftIndex)).setScale(uiScale);
    // The big house sign: large neon script, the marquee for the whole diner.
    this.neon = keep(makeNeonSign(scene, width * 0.5, wallBottom * 0.2, "Mel's Diner", 60)).setScale(uiScale);
  }

  /** Tear down every wall object so the scene can rebuild it at a new size. */
  destroy() {
    for (const o of this.objects) o.destroy();
    this.objects = [];
  }
}
