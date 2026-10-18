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

  it('has at least 150 entries in every pool', () => {
    for (const pool of ALL_POOLS) expect(pool.length).toBeGreaterThanOrEqual(150);
  });

  it('gives the rare letters x, z, q, j, k and v plenty of words', () => {
    for (const letter of 'xzqjkv') {
      const count = ALL_WORDS.filter((w) => normalizeText(w).includes(letter)).length;
      expect(count, `letter "${letter}" appears in ${count} words`).toBeGreaterThanOrEqual(40);
    }
  });

  it('covers common letter pairs and awkward reaches', () => {
    const minimum: Record<string, number> = {
      th: 20, er: 20, in: 20, ou: 20, ing: 20, tion: 10, ui: 20, ce: 20, ex: 10, br: 20, my: 10,
    };
    for (const [pair, min] of Object.entries(minimum)) {
      const count = ALL_WORDS.filter((w) => normalizeText(w).includes(pair)).length;
      expect(count, `"${pair}" appears in ${count} words`).toBeGreaterThanOrEqual(min);
    }
  });

  it('keeps TIER1 single-word and short', () => {
    for (const w of TIER1) {
      expect(w).not.toContain(' ');
      expect(w.length).toBeLessThanOrEqual(8);
    }
  });
});
