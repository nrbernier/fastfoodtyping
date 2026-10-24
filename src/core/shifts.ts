import type { ShiftConfig } from './types';

const NONE = { start: 0, end: 0 };

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
    countChance: { start: 0, end: 0 },
    houseChance: { start: 0, end: 0 },
    specials: { fickle: 0, courses: 0.1, rushAtMs: [] },
    // Monday is regulars only, whatever they order.
    maxCustomerTier: 1,
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
    countChance: { start: 0.04, end: 0.08 },
    houseChance: { start: 0, end: 0 },
    specials: { fickle: 0.06, courses: 0.12, rushAtMs: [50_000] },
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
    countChance: { start: 0.08, end: 0.08 },
    houseChance: NONE,
    specials: { fickle: 0.08, courses: 0.12, rushAtMs: [45_000] },
  },
  {
    // The one night of house orders: every regular writes their own ticket,
    // and it must be typed exactly, capitals and punctuation included.
    id: 'thursday',
    name: 'Thursday: Supper Club',
    durationMs: 120_000,
    rampMs: 120_000,
    maxCustomers: { start: 3, end: 3 },
    spawnIntervalMs: { start: 4500, end: 3500 },
    patienceMs: { start: 12_000, end: 9000 },
    // Only used when house orders are switched off in the settings.
    tierWeights: { start: { t1: 0.2, t2: 0.6, t3: 0.2 }, end: { t1: 0.1, t2: 0.5, t3: 0.4 } },
    wordsPerOrder: { start: 2, end: 2.5 },
    countChance: NONE,
    houseChance: { start: 1, end: 1 },
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
    countChance: { start: 0.06, end: 0.06 },
    houseChance: NONE,
    specials: { fickle: 0.1, courses: 0.1, rushAtMs: [40_000, 100_000] },
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
  countChance: { start: 0.03, end: 0.08 },
  houseChance: NONE,
  // a drink rush every minute, for as long as Overtime lasts
  specials: { fickle: 0.08, courses: 0.1, rushAtMs: Array.from({ length: 30 }, (_, i) => (i + 1) * 60_000) },
};

/**
 * Boss nights, one after Wednesday and one after Friday. A single big
 * customer takes the centre seat and orders dish after dish; his patience is
 * a temper bar that each dish calms and each wrong key stokes. Serve his
 * whole appetite to win; if he storms out, the night is lost.
 */
export const BOSSES: readonly (ShiftConfig & { after: string })[] = [
  {
    id: 'boss-lou',
    after: 'wednesday',
    name: "Boss Night: Big Lou's Banquet",
    durationMs: Infinity,
    rampMs: 60_000,
    maxCustomers: { start: 1, end: 1 },
    spawnIntervalMs: { start: 60_000, end: 60_000 },
    patienceMs: { start: 30_000, end: 30_000 },
    tierWeights: { start: { t1: 1, t2: 0, t3: 0 }, end: { t1: 1, t2: 0, t3: 0 } },
    wordsPerOrder: { start: 1, end: 1 },
    countChance: NONE,
    houseChance: NONE,
    boss: {
      poses: ['s-11-114', 's-11-112', 's-19-205'],
      dishes: 14,
      patienceMs: 16_000,
      calmMs: 5000,
      mistakeMs: 1100,
      moves: ['seconds', 'hurry', 'hurry'],
      moveEveryMs: 7000,
      menu: {
        start: { t1: 0.7, t2: 0.3, t3: 0 },
        end: { t1: 0, t2: 0.85, t3: 0.15 },
        wordsPerOrder: { start: 1, end: 1 },
        houseChance: 0,
      },
      bonus: 300,
    },
  },
  {
    id: 'boss-moneybags',
    after: 'friday',
    name: 'Boss Night: Moneybags Showdown',
    durationMs: Infinity,
    rampMs: 60_000,
    maxCustomers: { start: 3, end: 3 },
    spawnIntervalMs: { start: 6000, end: 4500 },
    patienceMs: { start: 12_000, end: 10_000 },
    tierWeights: { start: { t1: 1, t2: 0, t3: 0 }, end: { t1: 0.7, t2: 0.3, t3: 0 } },
    wordsPerOrder: { start: 1, end: 1 },
    countChance: NONE,
    houseChance: NONE,
    boss: {
      poses: ['s-16-165'],
      dishes: 9,
      patienceMs: 26_000,
      calmMs: 8000,
      mistakeMs: 900,
      moves: ['scramble', 'sendBack', 'hurry'],
      moveEveryMs: 8000,
      menu: {
        start: { t1: 0, t2: 0.7, t3: 0.3 },
        end: { t1: 0, t2: 0.2, t3: 0.8 },
        wordsPerOrder: { start: 2, end: 3 },
        houseChance: 0,
      },
      bonus: 600,
    },
  },
];

/** The week in order: each boss night follows the day it is named after, Overtime comes last. */
export const WEEK: readonly ShiftConfig[] = SHIFTS.flatMap((shift) => [shift, ...BOSSES.filter((b) => b.after === shift.id)]);

/** What to play after `id`: the next night of the week, or Overtime after the last. */
export function nextInWeek(id: string): ShiftConfig | undefined {
  const i = WEEK.findIndex((s) => s.id === id);
  if (i < 0) return undefined;
  return WEEK[i + 1] ?? OVERTIME;
}

/** A boss night opens once the day before it has been won. */
export function bossUnlocked(boss: { after: string }, unlockedShift: number): boolean {
  return unlockedShift > SHIFTS.findIndex((s) => s.id === boss.after);
}
