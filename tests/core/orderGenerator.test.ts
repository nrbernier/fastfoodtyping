import { describe, expect, it } from 'vitest';
import { OrderGenerator } from '../../src/core/orderGenerator';
import { mulberry32 } from '../../src/core/rng';
import { TIER1 } from '../../src/core/vocabulary';
import type { OrderParams } from '../../src/core/types';

const T1_ONLY: OrderParams = { tierWeights: { t1: 1, t2: 0, t3: 0 }, wordsPerOrder: 1 };
const T3_ONLY: OrderParams = { tierWeights: { t1: 0, t2: 0, t3: 1 }, wordsPerOrder: 3 };

describe('OrderGenerator', () => {
  it('generates tier-1 orders from TIER1', () => {
    const gen = new OrderGenerator(mulberry32(1));
    for (let i = 0; i < 20; i++) {
      const order = gen.next(T1_ONLY, new Set());
      expect(order.words).toHaveLength(1);
      expect(TIER1).toContain(order.words[0]);
    }
  });

  it('generates 3-word tier-3 orders when wordsPerOrder is 3', () => {
    const gen = new OrderGenerator(mulberry32(2));
    const order = gen.next(T3_ONLY, new Set());
    expect(order.words).toHaveLength(3);
    expect(order.text).toBe(order.words.join(' '));
  });

  it('normalizes accents in the normalized field', () => {
    const gen = new OrderGenerator(mulberry32(3));
    for (let i = 0; i < 50; i++) {
      const order = gen.next(T3_ONLY, new Set());
      expect(order.normalized).toMatch(/^[a-z]+( [a-z]+)*$/);
      expect(order.normalized).toHaveLength(order.text.length);
    }
  });

  it('respects excluded first letters', () => {
    const gen = new OrderGenerator(mulberry32(4));
    const exclude = new Set(['b', 'p', 's']);
    for (let i = 0; i < 200; i++) {
      const order = gen.next(T1_ONLY, exclude);
      expect(exclude.has(order.normalized[0])).toBe(false);
    }
  });

  it('avoids repeating tier-3 pool words within the recent window', () => {
    const gen = new OrderGenerator(mulberry32(5));
    const seen = new Set<string>();
    // 15 orders x 3 words = 45 marks, under the 50-word buffer:
    // every word must be unique.
    for (let i = 0; i < 15; i++) {
      const order = gen.next(T3_ONLY, new Set());
      for (const w of order.words) {
        expect(seen.has(w), `repeated word "${w}"`).toBe(false);
        seen.add(w);
      }
    }
  });
});
