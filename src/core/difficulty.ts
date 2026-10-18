import type { LiveParams, ShiftConfig, TierWeights } from './types';

/**
 * How forgiving the counter is. Slower paces stretch every customer's
 * patience and space out arrivals; the orders themselves stay the same.
 */
export type Pace = 'easygoing' | 'steady' | 'rush';

export const PACES: Readonly<Record<Pace, { label: string; patience: number; spawn: number }>> = {
  easygoing: { label: 'Easygoing', patience: 1.5, spawn: 1.3 },
  steady: { label: 'Steady', patience: 1.25, spawn: 1.15 },
  rush: { label: 'Rush hour', patience: 1, spawn: 1 },
};

export const PACE_ORDER: readonly Pace[] = ['easygoing', 'steady', 'rush'];

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Componentwise lerp, clamped >= 0, normalized to sum 1. */
export function mixTiers(a: TierWeights, b: TierWeights, t: number): TierWeights {
  const raw = {
    t1: Math.max(0, lerp(a.t1, b.t1, t)),
    t2: Math.max(0, lerp(a.t2, b.t2, t)),
    t3: Math.max(0, lerp(a.t3, b.t3, t)),
  };
  const total = raw.t1 + raw.t2 + raw.t3 || 1;
  return { t1: raw.t1 / total, t2: raw.t2 / total, t3: raw.t3 / total };
}

/** Live difficulty parameters at a moment in the shift. t clamps at 1 (ramp end = max difficulty). */
export function paramsAt(config: ShiftConfig, elapsedMs: number, pace: Pace = 'rush'): LiveParams {
  const t = Math.min(elapsedMs / config.rampMs, 1);
  const { patience, spawn } = PACES[pace];
  return {
    spawnIntervalMs: lerp(config.spawnIntervalMs.start, config.spawnIntervalMs.end, t) * spawn,
    patienceMs: lerp(config.patienceMs.start, config.patienceMs.end, t) * patience,
    maxCustomers: Math.round(lerp(config.maxCustomers.start, config.maxCustomers.end, t)),
    order: {
      tierWeights: mixTiers(config.tierWeights.start, config.tierWeights.end, t),
      wordsPerOrder: lerp(config.wordsPerOrder.start, config.wordsPerOrder.end, t),
      countChance: lerp(config.countChance.start, config.countChance.end, t),
      houseChance: lerp(config.houseChance.start, config.houseChance.end, t),
    },
  };
}
