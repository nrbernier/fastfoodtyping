import { describe, expect, it } from 'vitest';
import { normalizeText } from '../../src/core/text';
import { DISH_FORMS, INGREDIENTS, PREPARATIONS, TIER1, TIER2 } from '../../src/core/vocabulary';

const ALL_POOLS = [TIER1, TIER2, PREPARATIONS, INGREDIENTS, DISH_FORMS];
const ALL_WORDS = ALL_POOLS.flat().flatMap((entry) => entry.split(' '));

describe('vocabulary', () => {
  it('normalizes to a-z and spaces only (no hyphens, apostrophes, digits)', () => {
    for (const entry of ALL_POOLS.flat()) {
      expect(normalizeText(entry)).toMatch(/^[a-z]+( [a-z]+)*$/);
    }
  });

  it('covers every letter of the alphabet in at least 2 words', () => {
    for (const letter of 'abcdefghijklmnopqrstuvwxyz') {
      const count = ALL_WORDS.filter((w) => normalizeText(w).includes(letter)).length;
      expect(count, `letter "${letter}" appears in ${count} words`).toBeGreaterThanOrEqual(2);
    }
  });

  it('has no duplicate entries within a pool', () => {
    for (const pool of ALL_POOLS) {
      expect(new Set(pool).size).toBe(pool.length);
    }
  });

  it('has large enough pools', () => {
    expect(TIER1.length).toBeGreaterThanOrEqual(25);
    expect(TIER2.length).toBeGreaterThanOrEqual(20);
    expect(PREPARATIONS.length).toBeGreaterThanOrEqual(60);
    expect(INGREDIENTS.length).toBeGreaterThanOrEqual(60);
    expect(DISH_FORMS.length).toBeGreaterThanOrEqual(60);
  });

  it('keeps TIER1 single-word and short', () => {
    for (const w of TIER1) {
      expect(w).not.toContain(' ');
      expect(w.length).toBeLessThanOrEqual(8);
    }
  });
});
