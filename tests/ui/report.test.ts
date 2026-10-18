import { describe, expect, it } from 'vitest';
import { emptyTally } from '../../src/core/typingStats';
import type { ShiftResult } from '../../src/core/types';
import { keyHeat, nextShiftTip, QUOTE_MAX, receiptRows } from '../../src/ui/report';

const result: ShiftResult = {
  shiftId: 'monday', won: true, score: 142, served: 9, strikes: 1, accuracy: 0.9, wpm: 31.6,
  bestCombo: 4, elapsedMs: 90_000, pace: 'steady', tally: { hits: { t: 9 }, misses: {}, pairMisses: { th: 2 } },
  fastest: { text: 'malt', ms: 600, wpm: 80 },
  slowest: { text: 'irradiated huckleberry croquettes', ms: 12_000, wpm: 20 },
};

describe('shift report', () => {
  it('cuts long order quotes short', () => {
    for (const row of receiptRows(result, 'Monday: Breakfast Rush')) {
      if (row.kind === 'note') expect(row.text.length, row.text).toBeLessThanOrEqual(QUOTE_MAX + 2);
    }
  });

  it('lists the fastest and slowest orders and the trickiest pair', () => {
    const text = JSON.stringify(receiptRows(result, 'Monday'));
    expect(text).toContain('\\"malt\\"');
    expect(text).toContain('\\"irradiated huckleberr…\\"');
    expect(text).toContain('\\"th\\"');
  });

  it('names the next shift drill from the running tally', () => {
    expect(nextShiftTip(emptyTally())).toBe('Next shift: clean hands, chef!');
    expect(nextShiftTip({ hits: { q: 1 }, misses: { q: 3, z: 2 }, pairMisses: { qu: 2 } })).toBe('Next shift: more Z, Q & "qu"');
  });

  it('heats keys from untyped grey through clean green to red', () => {
    const t = { hits: { a: 10, b: 10, c: 1 }, misses: { b: 1, c: 3 }, pairMisses: {} };
    expect(keyHeat(t, 'z')).toBe(0xd9d1c2);
    expect(keyHeat(t, 'a')).toBe(0xbfdcae);
    expect(keyHeat(t, 'c')).toBe(0xd63b2a);
    expect(keyHeat(t, 'b')).not.toBe(keyHeat(t, 'c'));
  });
});
