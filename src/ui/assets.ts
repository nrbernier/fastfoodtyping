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

/** Regulars at the title-screen counter, left to right. */
export const TITLE_LINEUP = ['s-07-056', 's-25-272'];

/** Share of orders brought by a pose of the matching tier; the rest come from a neighbouring tier. */
export const MATCH_SHARE = 0.75;

const BY_TIER = [1, 2, 3].map((t) => POSES.filter((p) => p.tier === t && !p.fingers));

/**
 * Choose who walks up with this order. The Finger-Counter brings his special
 * (holding up the matching number of fingers); otherwise the order's tier
 * picks the crowd: plain items bring regulars, specials bring characters,
 * weird dishes bring wacky poses. A quarter of the time a neighbouring tier
 * steps in instead, but only toward the ordinary: wacky poses come with weird
 * dishes and nothing else, so they never turn up early in the week.
 * Characters already at the counter (`seated`) are skipped while
 * anyone else is free.
 */
export function pickPose(
  order: Pick<Order, 'tier' | 'fingers'>,
  seated: ReadonlySet<string>,
  rng: () => number,
  /** Highest tier allowed to walk in (Monday: regulars only) */
  maxTier = 3,
): PoseDef {
  if (order.fingers) {
    const counter = POSES.find((p) => p.fingers === order.fingers);
    if (counter) return counter;
  }
  let tier: number = order.tier;
  if (rng() >= MATCH_SHARE) tier = tier === 1 ? 2 : tier === 3 ? 2 : 1;
  tier = Math.min(tier, maxTier);
  const pool = BY_TIER[tier - 1];
  const free = pool.filter((p) => !seated.has(p.character));
  const from = free.length > 0 ? free : pool;
  return from[Math.floor(rng() * from.length)];
}
