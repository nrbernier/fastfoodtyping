import { describe, expect, it } from 'vitest';
import { OrderGenerator } from '../../src/core/orderGenerator';
import { mulberry32 } from '../../src/core/rng';
import { COUNT_WORDS, COUNTABLE, TIER1 } from '../../src/core/vocabulary';
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

  it('records which tier each order came from', () => {
    const gen = new OrderGenerator(mulberry32(6));
    expect(gen.next(T1_ONLY, new Set()).tier).toBe(1);
    expect(gen.next(T3_ONLY, new Set()).tier).toBe(3);
  });

  it('never makes Finger-Counter specials unless asked', () => {
    const gen = new OrderGenerator(mulberry32(10));
    for (let i = 0; i < 200; i++) expect(gen.next(T1_ONLY, new Set()).fingers).toBeUndefined();
  });

  it('spells the count first and pluralizes the dish to match the fingers', () => {
    const gen = new OrderGenerator(mulberry32(11));
    const ALWAYS: OrderParams = { ...T1_ONLY, countChance: 1 };
    const seen = new Set<number>();
    for (let i = 0; i < 200; i++) {
      const order = gen.next(ALWAYS, new Set());
      const f = order.fingers!;
      seen.add(f);
      expect(order.words).toHaveLength(2);
      expect(order.words[0]).toBe(COUNT_WORDS[f - 1]);
      const pair = COUNTABLE.find((p) => p.includes(order.words[1]))!;
      expect(order.words[1]).toBe(f === 1 ? pair[0] : pair[1]);
    }
    expect([...seen].sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it('keeps weird tier-3 orders free of the special', () => {
    const gen = new OrderGenerator(mulberry32(12));
    for (let i = 0; i < 100; i++) {
      expect(gen.next({ ...T3_ONLY, countChance: 1 }, new Set()).fingers).toBeUndefined();
    }
  });
});
