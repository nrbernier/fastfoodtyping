// Fit a customer pose to the counter by its head: scale toward a common head
// size and hang the head at a common height, letting the body run down behind
// the counter. Coordinates are local to the customer (y = 0 at the counter
// line, up is negative), before the responsive uiScale.

/** Height a pose's image is drawn at before head matching. */
export const SPRITE_HEIGHT = 175;
/** Head height (skull to chin, in 256px image units) every pose is scaled toward. */
export const TARGET_HEAD = 100;
/** How strongly head sizes are evened out: 1 makes them equal, 0 leaves them be. */
const EVENNESS = 0.75;
const MIN_FIT = 0.6;
const MAX_FIT = 1.9;
/** Where the top of every head hangs. */
export const HEAD_TOP_Y = -150;

export interface PoseFit {
  /** Image scale. */
  scale: number;
  /** Local y of the image's bottom edge (never above the counter line). */
  bottom: number;
  /** Local y of the image's top edge. */
  top: number;
}

export function fitPose(head: readonly [number, number] | undefined, imageHeight: number): PoseFit {
  const base = SPRITE_HEIGHT / imageHeight;
  if (!head) return { scale: base, bottom: 0, top: -SPRITE_HEIGHT };
  const [skull, chin] = head;
  const size = Math.max(1, chin - skull) * (256 / imageHeight);
  const fit = Math.min(MAX_FIT, Math.max(MIN_FIT, (TARGET_HEAD / size) ** EVENNESS));
  const scale = base * fit;
  // Hang the head at HEAD_TOP_Y; a shrunken close-up that would then float
  // above the counter rests on it instead.
  const bottom = Math.max(0, HEAD_TOP_Y + (imageHeight - skull) * scale);
  return { scale, bottom, top: bottom - imageHeight * scale };
}
