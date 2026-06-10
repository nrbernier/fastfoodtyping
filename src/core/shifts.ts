import type { ShiftConfig } from './types';

export const SHIFTS: readonly ShiftConfig[] = [
  {
    id: 'monday',
    name: 'Monday: Breakfast Rush',
    durationMs: 90_000,
    rampMs: 90_000,
    maxCustomers: { start: 2, end: 2 },
    spawnIntervalMs: { start: 6000, end: 4500 },
    patienceMs: { start: 14_000, end: 11_000 },
    tierWeights: { start: { t1: 1, t2: 0, t3: 0 }, end: { t1: 0.7, t2: 0.3, t3: 0 } },
    wordsPerOrder: { start: 1, end: 1 },
  },
  {
    id: 'tuesday',
    name: 'Tuesday: Lunch Counter',
    durationMs: 100_000,
    rampMs: 100_000,
    maxCustomers: { start: 2, end: 3 },
    spawnIntervalMs: { start: 5000, end: 4000 },
    patienceMs: { start: 12_000, end: 9500 },
    tierWeights: { start: { t1: 0.6, t2: 0.4, t3: 0 }, end: { t1: 0.3, t2: 0.6, t3: 0.1 } },
    wordsPerOrder: { start: 1, end: 1.5 },
  },
  {
    id: 'wednesday',
    name: 'Wednesday: Dinner Bell',
    durationMs: 110_000,
    rampMs: 110_000,
    maxCustomers: { start: 3, end: 3 },
    spawnIntervalMs: { start: 4500, end: 3500 },
    patienceMs: { start: 11_000, end: 8500 },
    tierWeights: { start: { t1: 0.3, t2: 0.5, t3: 0.2 }, end: { t1: 0.1, t2: 0.4, t3: 0.5 } },
    wordsPerOrder: { start: 1.5, end: 2 },
  },
  {
    id: 'thursday',
    name: 'Thursday: Graveyard Shift',
    durationMs: 120_000,
    rampMs: 120_000,
    maxCustomers: { start: 3, end: 4 },
    spawnIntervalMs: { start: 4000, end: 3000 },
    patienceMs: { start: 10_000, end: 7500 },
    tierWeights: { start: { t1: 0.1, t2: 0.4, t3: 0.5 }, end: { t1: 0, t2: 0.2, t3: 0.8 } },
    wordsPerOrder: { start: 2, end: 2.5 },
  },
  {
    id: 'friday',
    name: 'Friday: Full Moon Special',
    durationMs: 135_000,
    rampMs: 135_000,
    maxCustomers: { start: 4, end: 4 },
    spawnIntervalMs: { start: 3500, end: 2500 },
    patienceMs: { start: 9000, end: 6500 },
    tierWeights: { start: { t1: 0, t2: 0.3, t3: 0.7 }, end: { t1: 0, t2: 0, t3: 1 } },
    wordsPerOrder: { start: 2, end: 3 },
  },
];

/**
 * Endless mode. Ends only on 3 strikes. Difficulty ramps to its brutal
 * maximum over 3 minutes and stays there (floors: 1500ms spawns, 4000ms patience).
 */
export const OVERTIME: ShiftConfig = {
  id: 'overtime',
  name: 'Overtime',
  durationMs: Infinity,
  rampMs: 180_000,
  maxCustomers: { start: 2, end: 4 },
  spawnIntervalMs: { start: 5000, end: 1500 },
  patienceMs: { start: 12_000, end: 4000 },
  tierWeights: { start: { t1: 0.5, t2: 0.4, t3: 0.1 }, end: { t1: 0, t2: 0, t3: 1 } },
  wordsPerOrder: { start: 1, end: 3 },
};
