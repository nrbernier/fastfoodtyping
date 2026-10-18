import type { LiveParams, ShiftConfig, TierWeights } from './types';

/**
 * How forgiving the counter is. Slower paces stretch every customer's
 * patience, space out arrivals, and give long orders extra time per letter
 * (phone typists need it most); the orders themselves stay the same.
 */
export type Pace = 'easygoing' | 'steady' | 'rush';

export interface PaceDef {
  label: string;
  /** Multiplies the shift's patience */
  patience: number;
  /** Multiplies the time between arrivals */
  spawn: number;
  /** Extra patience per character past the first LONG_ORDER_FREE */
  perCharMs: number;
}

export const PACES: Readonly<Record<Pace, PaceDef>> = {
  easygoing: { label: 'Easygoing', patience: 1.8, spawn: 1.5, perCharMs: 450 },
  steady: { label: 'Steady', patience: 1.35, spawn: 1.2, perCharMs: 250 },
  rush: { label: 'Rush hour', patience: 1, spawn: 1, perCharMs: 0 },
};

/** Characters an order gets for free before the per-character allowance starts. */
export const LONG_ORDER_FREE = 6;

/** Patience for one order: the shift's patience plus the pace's allowance for its length. */
export function orderPatienceMs(baseMs: number, orderLength: number, pace: Pace): number {
  return baseMs + PACES[pace].perCharMs * Math.max(0, orderLength - LONG_ORDER_FREE);
}

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
