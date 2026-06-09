export interface Order {
  /** Display words, e.g. ['zebra', 'soufflé'] */
  words: string[];
  /** Display text: words joined with single spaces */
  text: string;
  /** Lowercased, accent-stripped form used for matching */
  normalized: string;
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
}

export interface LiveParams {
  spawnIntervalMs: number;
  patienceMs: number;
  maxCustomers: number;
  order: OrderParams;
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
}

export interface GameEvents extends Record<string, unknown> {
  customerArrived: { customer: CustomerState };
  orderLocked: { customerId: number };
  orderProgress: { customerId: number; typedCount: number };
  wordCompleted: { customerId: number; wordIndex: number };
  orderServed: { customerId: number; tip: number; finalWordIndex: number };
  customerLeft: { customerId: number; strikes: number };
  mistake: { customerId: number | null };
  shiftEnded: { result: ShiftResult };
}
