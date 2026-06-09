import { describe, expect, it } from 'vitest';
import { mulberry32, pick } from '../../src/core/rng';

describe('mulberry32', () => {
  it('is deterministic for a given seed', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it('returns values in [0, 1)', () => {
    const rng = mulberry32(7);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('pick', () => {
  it('picks an element of the array', () => {
    const rng = mulberry32(1);
    const items = ['a', 'b', 'c'];
    for (let i = 0; i < 50; i++) {
      expect(items).toContain(pick(rng, items));
    }
  });
});
