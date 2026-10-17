// Cast manifest: every pose in cast.ts becomes a Phaser texture keyed by its
// scan id; files are relative to public/.
import type { Order } from '../core/types';
import { POSES, type PoseDef } from './cast';

export interface CharacterDef {
  key: string;
  file: string;
}

export const CHARACTERS: CharacterDef[] = POSES.map((p) => ({ key: p.key, file: `characters/${p.key}.png` }));

export const PLACEHOLDER_KEY = 'char-placeholder';

/** Poses standing on the title-screen checkerboard, left to right. */
export const TITLE_LINEUP = ['s-13-128', 's-07-056', 's-29-313', 's-11-114', 's-09-080'];

/** Share of weird (tier 3) orders brought by a wacky pose; the rest get a regular. */
export const WACKY_SHARE = 0.75;

const REGULARS = POSES.filter((p) => !p.wacky && !p.fingers);
const ODDBALLS = POSES.filter((p) => p.wacky);

/**
 * Choose who walks up with this order. The Finger-Counter brings his special
 * (holding up the matching number of fingers); weird orders mostly come from
 * the wacky poses; everything else from the regulars. Characters already at
 * the counter (`seated`) are skipped while anyone else is free.
 */
export function pickPose(
  order: Pick<Order, 'tier' | 'fingers'>,
  seated: ReadonlySet<string>,
  rng: () => number,
): PoseDef {
  if (order.fingers) {
    const counter = POSES.find((p) => p.fingers === order.fingers);
    if (counter) return counter;
  }
  const pool = order.tier === 3 && rng() < WACKY_SHARE ? ODDBALLS : REGULARS;
  const free = pool.filter((p) => !seated.has(p.character));
  const from = free.length > 0 ? free : pool;
  return from[Math.floor(rng() * from.length)];
}
