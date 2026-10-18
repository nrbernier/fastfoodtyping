import type { Focus } from './orderGenerator';

/** Keystroke tallies, keyed by the character the order asked for. */
export interface KeyTally {
  hits: Record<string, number>;
  misses: Record<string, number>;
  /** Misses keyed by the pair ending on the missed letter, e.g. "th" when "h" was missed after "t". */
  pairMisses: Record<string, number>;
}

export function emptyTally(): KeyTally {
  return { hits: {}, misses: {}, pairMisses: {} };
}

const bump = (rec: Record<string, number>, key: string, by = 1) => {
  rec[key] = (rec[key] ?? 0) + by;
};

const isLetter = (c: string | undefined): c is string => c !== undefined && /^[a-z]$/i.test(c);

/** Count one keystroke against the character the order expected at `index`. */
export function recordKey(tally: KeyTally, text: string, index: number, correct: boolean): void {
  const expected = text[index]?.toLowerCase();
  if (!isLetter(expected)) return;
  if (correct) return bump(tally.hits, expected);
  bump(tally.misses, expected);
  const prev = text[index - 1]?.toLowerCase();
  if (isLetter(prev)) bump(tally.pairMisses, prev + expected);
}

/**
 * Fold a shift's tally into the long-running one. Older shifts fade by
 * `keep` so the focus follows the player's current weak spots.
 */
export function mergeTally(history: KeyTally, shift: KeyTally, keep = 0.6): KeyTally {
  const fold = (a: Record<string, number>, b: Record<string, number>) => {
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(a)) if (v * keep >= 0.05) out[k] = Math.round(v * keep * 100) / 100;
    for (const [k, v] of Object.entries(b)) bump(out, k, v);
    return out;
  };
  return {
    hits: fold(history.hits, shift.hits),
    misses: fold(history.misses, shift.misses),
    pairMisses: fold(history.pairMisses, shift.pairMisses),
  };
}

/** Letters ranked by miss rate (needs a couple of misses to count), worst first. */
export function weakLetters(tally: KeyTally, limit = 3): string[] {
  return Object.entries(tally.misses)
    .filter(([, m]) => m >= 2)
    .map(([k, m]) => [k, m / (m + (tally.hits[k] ?? 0))] as const)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([k]) => k);
}

/** The most-missed letter pair, if any was missed twice. */
export function trickiestPair(tally: KeyTally): string | null {
  const best = Object.entries(tally.pairMisses)
    .filter(([, m]) => m >= 2)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
  return best ? best[0] : null;
}

/** Order-generator focus built from the weakest letters and pair. */
export function practiceFocus(tally: KeyTally): Focus {
  const focus: Record<string, number> = {};
  weakLetters(tally).forEach((k, i) => (focus[k] = 2 - i * 0.5));
  const pair = trickiestPair(tally);
  if (pair) focus[pair] = 2;
  return focus;
}
