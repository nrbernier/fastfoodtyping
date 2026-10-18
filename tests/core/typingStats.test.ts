import { describe, expect, it } from 'vitest';
import { emptyTally, mergeTally, practiceFocus, recordKey, trickiestPair, weakLetters } from '../../src/core/typingStats';

describe('typing stats', () => {
  it('tallies hits and misses by expected letter, and misses by pair', () => {
    const t = emptyTally();
    recordKey(t, 'the broth', 0, true);
    recordKey(t, 'the broth', 1, false);
    recordKey(t, 'the broth', 4, false); // "b" after a space: no pair
    recordKey(t, 'the broth', 3, false); // the space itself is not tallied
    expect(t.hits).toEqual({ t: 1 });
    expect(t.misses).toEqual({ h: 1, b: 1 });
    expect(t.pairMisses).toEqual({ th: 1 });
  });

  it('ranks weak letters by miss rate and ignores one-off slips', () => {
    const t = { hits: { a: 20, q: 2, z: 10 }, misses: { a: 4, q: 2, z: 3, x: 1 }, pairMisses: {} };
    expect(weakLetters(t)).toEqual(['q', 'z', 'a']);
  });

  it('names the most-missed pair once it was missed twice', () => {
    expect(trickiestPair({ hits: {}, misses: {}, pairMisses: { ui: 1 } })).toBeNull();
    expect(trickiestPair({ hits: {}, misses: {}, pairMisses: { ui: 3, th: 2 } })).toBe('ui');
  });

  it('builds a focus from the weakest letters and pair', () => {
    const t = { hits: { q: 1, z: 1, j: 1 }, misses: { q: 4, z: 3, j: 2 }, pairMisses: { qu: 3 } };
    expect(practiceFocus(t)).toEqual({ q: 2, z: 1.5, j: 1, qu: 2 });
  });

  it('fades older shifts when merging', () => {
    const merged = mergeTally({ hits: { a: 10 }, misses: { q: 5 }, pairMisses: {} }, { hits: { a: 1 }, misses: {}, pairMisses: { th: 2 } }, 0.5);
    expect(merged).toEqual({ hits: { a: 6 }, misses: { q: 2.5 }, pairMisses: { th: 2 } });
  });
});
