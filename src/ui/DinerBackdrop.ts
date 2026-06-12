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

  constructor(scene: Phaser.Scene, width: number, wallBottom: number, shiftIndex = 0) {
    scene.add.rectangle(0, 0, width, wallBottom, COLORS.wall).setOrigin(0);
    // wainscoting band gives the flat wall depth
    const bandH = Math.min(46, wallBottom * 0.16);
    scene.add.rectangle(0, wallBottom - bandH, width, bandH, COLORS.wallDark).setOrigin(0);
    scene.add.rectangle(0, wallBottom - bandH, width, 3, COLORS.counterEdge).setOrigin(0);

    makeWindowBlinds(scene, width * 0.2, wallBottom * 0.42, 150, 110);
    makeMenuBoard(scene, width * 0.8, wallBottom * 0.46, shiftIndex);
    // The big house sign: large neon script, the marquee for the whole diner.
    this.neon = makeNeonSign(scene, width * 0.5, wallBottom * 0.22, "Mel's Diner", 60);
  }
}
