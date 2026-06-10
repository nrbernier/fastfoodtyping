import type { LiveParams, ShiftConfig, TierWeights } from './types';

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
export function paramsAt(config: ShiftConfig, elapsedMs: number): LiveParams {
  const t = Math.min(elapsedMs / config.rampMs, 1);
  return {
    spawnIntervalMs: lerp(config.spawnIntervalMs.start, config.spawnIntervalMs.end, t),
    patienceMs: lerp(config.patienceMs.start, config.patienceMs.end, t),
    maxCustomers: Math.round(lerp(config.maxCustomers.start, config.maxCustomers.end, t)),
    order: {
      tierWeights: mixTiers(config.tierWeights.start, config.tierWeights.end, t),
      wordsPerOrder: lerp(config.wordsPerOrder.start, config.wordsPerOrder.end, t),
    },
  };
}
