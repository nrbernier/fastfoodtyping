import type { Pace } from './difficulty';
import type { KeyTally } from './typingStats';

export interface Order {
  /** Display words, e.g. ['zebra', 'soufflé'] */
  words: string[];
  /** Display text: words joined with single spaces */
  text: string;
  /** Accent-stripped form used for matching; lowercased unless `exact` */
  normalized: string;
  /** Menu tier the order was drawn from; 3 = the weird generated dishes */
  tier: 1 | 2 | 3;
  /**
   * Finger-Counter special: how many he wants (1–5). The first word is that
   * count spelled out ("three pancakes"); the ticket hides it, so the player
   * has to read it off his raised fingers.
   */
  fingers?: number;
  /** House order: capitals and punctuation must be typed exactly as written. */
  exact?: boolean;
  /** Menu language, when not English */
  lang?: 'fr';
}

export interface CustomerState {
  id: number;
  /** Counter position index, 0-based from the left */
  slot: number;
  order: Order;
  patienceTotalMs: number;
  patienceMs: number;
  /** True once served or stormed out */
  resolved: boolean;
  /**
   * A special customer: `fickle` changes their mind halfway through being
   * typed; `diner` stays on for coffee or dessert; `rush` came in with a
   * drink rush.
   */
  special?: 'fickle' | 'diner' | 'rush';
  /** Fickle: already changed their mind once */
  changed?: boolean;
  /** Diner: follow-up orders still to come */
  courses?: number;
  /** Diner: enjoying the last course; no order to type and no patience lost meanwhile */
  eatingMs?: number;
}

export interface TierWeights {
  t1: number;
  t2: number;
  t3: number;
}

export interface OrderParams {
  tierWeights: TierWeights;
  /** Fractional 1..3; e.g. 1.4 = 40% chance of 2 words (tier 3 only) */
  wordsPerOrder: number;
  /** 0..1 chance a non-weird order becomes a Finger-Counter special; default 0 */
  countChance?: number;
  /** 0..1 chance an order is a house order with capitals and punctuation; default 0 */
  houseChance?: number;
}

export interface ShiftConfig {
  id: string;
  name: string;
  /** Shift length; Infinity for Overtime (ends only on 3 strikes) */
  durationMs: number;
  /** Time over which params interpolate start→end (clamped at 1) */
  rampMs: number;
  maxCustomers: { start: number; end: number };
  spawnIntervalMs: { start: number; end: number };
  patienceMs: { start: number; end: number };
  tierWeights: { start: TierWeights; end: TierWeights };
  wordsPerOrder: { start: number; end: number };
  countChance: { start: number; end: number };
  houseChance: { start: number; end: number };
  /** Special customers and rushes; none when absent */
  specials?: ShiftSpecials;
}

export interface ShiftSpecials {
  /** Chance a customer changes their mind halfway through */
  fickle: number;
  /** Chance a customer stays on for coffee or dessert */
  courses: number;
  /** Shift times (ms) at which a drink rush starts */
  rushAtMs: readonly number[];
}

export interface LiveParams {
  spawnIntervalMs: number;
  patienceMs: number;
  maxCustomers: number;
  order: OrderParams;
}

export interface OrderTiming {
  text: string;
  /** Lock-on to serve */
  ms: number;
  wpm: number;
}

export interface ShiftResult {
  shiftId: string;
  won: boolean;
  score: number;
  served: number;
  strikes: number;
  /** 0..1 */
  accuracy: number;
  wpm: number;
  bestCombo: number;
  elapsedMs: number;
  /** Pace the shift was played at */
  pace: Pace;
  /** Keystrokes per expected letter, for the report and next shift's focus */
  tally: KeyTally;
  fastest: OrderTiming | null;
  slowest: OrderTiming | null;
}

export interface GameEvents extends Record<string, unknown> {
  customerArrived: { customer: CustomerState };
  orderLocked: { customerId: number };
  /** The player let go of (or switched away from) an order; its progress is kept. */
  orderReleased: { customerId: number };
  orderProgress: { customerId: number; typedCount: number };
  wordCompleted: { customerId: number; wordIndex: number };
  /** `patienceLeft` is the share of patience the customer still had (0..1). */
  orderServed: { customerId: number; tip: number; finalWordIndex: number; patienceLeft: number; stays?: boolean };
  customerLeft: { customerId: number; strikes: number };
  mistake: { customerId: number | null };
  shiftEnded: { result: ShiftResult };
  /** A fickle customer changed their order; typing on it starts over */
  orderChanged: { customer: CustomerState };
  /** A diner finished eating and orders the next course */
  nextCourse: { customer: CustomerState };
  /** A drink rush: `count` short orders, filling every free seat */
  rushStarted: { count: number };
  /** The rush is over; `bonus` (cents) is paid when nobody walked out */
  rushEnded: { cleared: boolean; bonus: number };
}
