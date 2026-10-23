import { describe, expect, it } from 'vitest';
import { OrderGenerator } from '../../src/core/orderGenerator';
import { mulberry32 } from '../../src/core/rng';
import { normalizeText, stripAccents } from '../../src/core/text';
import {
  agree, FR_ADJECTIVES, FR_FORMS, FR_HOUSE_ORDERS, FR_INGREDIENTS, FR_TIER1, FR_TIER2, FRENCH,
} from '../../src/core/vocabularyFr';

const POOLS = [FR_TIER1, FR_TIER2, FR_FORMS, FR_INGREDIENTS, FR_ADJECTIVES];
const WORDS = POOLS.flat().flatMap((e) => e.split(' '));

describe('French vocabulary', () => {
  it('types with plain letters and spaces once accents are dropped, keeping its length', () => {
    for (const entry of POOLS.flat()) {
      expect(normalizeText(entry), entry).toMatch(/^[a-z]+( [a-z]+)*$/);
      expect(normalizeText(entry), entry).toHaveLength(entry.length);
    }
  });

  it('has big menus', () => {
    expect(FR_TIER1.length).toBeGreaterThanOrEqual(150);
    expect(FR_TIER2.length).toBeGreaterThanOrEqual(150);
    for (const pool of [FR_FORMS, FR_INGREDIENTS, FR_ADJECTIVES]) expect(pool.length).toBeGreaterThanOrEqual(100);
    expect(FR_HOUSE_ORDERS.length).toBeGreaterThanOrEqual(50);
  });

  it('has no duplicates within a pool', () => {
    for (const pool of [...POOLS, FR_HOUSE_ORDERS]) expect(new Set(pool).size).toBe(pool.length);
  });

  it('keeps plats du jour to one short word', () => {
    for (const w of FR_TIER1) {
      expect(w).not.toContain(' ');
      expect(w.length, w).toBeLessThanOrEqual(10);
    }
  });

  it('uses every letter of the alphabet', () => {
    for (const letter of 'abcdefghijklmnopqrstuvwxyz') {
      const count = WORDS.filter((w) => normalizeText(w).includes(letter)).length;
      expect(count, letter).toBeGreaterThanOrEqual(3);
    }
  });

  it('only lists ingredients that take a plain "de" (no elision)', () => {
    for (const w of FR_INGREDIENTS) expect(normalizeText(w), w).toMatch(/^[^aeiou]/); // y and h aspiré take "de" too
  });

  it('agrees adjectives with the dish', () => {
    expect(agree('hanté', 'soufflé')).toBe('hanté');
    expect(agree('hanté', 'soupe')).toBe('hantée');
    expect(agree('hanté', 'gaufres')).toBe('hantées');
    expect(agree('hanté', 'beignets')).toBe('hantés');
    expect(agree('moelleux', 'beignets')).toBe('moelleux');
    expect(agree('moelleux', 'crêpes')).toBe('moelleuses');
    expect(agree('radioactif', 'tarte')).toBe('radioactive');
  });

  it('writes house orders with keyboard characters, starting on a letter', () => {
    for (const entry of FR_HOUSE_ORDERS) {
      const plain = stripAccents(entry);
      expect(plain, entry).toMatch(/^[A-Za-z][A-Za-z.,'!?:& -]*$/);
      expect(plain, entry).toHaveLength(entry.length);
      expect(entry, entry).not.toMatch(/ {2}|^ | $/);
    }
  });
});

describe('French orders', () => {
  const T3 = (words: number) => ({ tierWeights: { t1: 0, t2: 0, t3: 1 }, wordsPerOrder: words });

  it('builds weird dishes the French way: dish, de, ingredient, adjective', () => {
    const gen = new OrderGenerator(mulberry32(31), {}, FRENCH);
    for (let i = 0; i < 50; i++) {
      const o = gen.next(T3(3), new Set());
      expect(o.words).toHaveLength(4);
      expect(o.words[1]).toBe('de');
      expect(FR_FORMS).toContain(o.words[0]);
      expect(FR_INGREDIENTS).toContain(o.words[2]);
      expect(o.words[3]).toBe(agree(FR_ADJECTIVES.find((a) => agree(a, o.words[0]) === o.words[3])!, o.words[0]));
      expect(o.lang).toBe('fr');
    }
  });

  it('counts with un or une to match the dish', () => {
    const gen = new OrderGenerator(mulberry32(32), {}, FRENCH);
    const counted = { tierWeights: { t1: 1, t2: 0, t3: 0 }, wordsPerOrder: 1, countChance: 1 };
    for (let i = 0; i < 200; i++) {
      const o = gen.next(counted, new Set());
      const n = o.fingers!;
      if (n === 1) expect(['un', 'une']).toContain(o.words[0]);
      else expect(o.words[0]).toBe(['deux', 'trois', 'quatre', 'cinq'][n - 2]);
      if (o.words[1] === 'crêpe' || o.words[1] === 'tarte') expect(o.words[0]).toBe('une');
      if (o.words[1] === 'croissant') expect(o.words[0]).toBe('un');
    }
  });

  it('keeps "de" out of the freshness window so weird dishes keep coming', () => {
    const gen = new OrderGenerator(mulberry32(33), {}, FRENCH);
    const seen = new Set<string>();
    for (let i = 0; i < 12; i++) {
      const o = gen.next(T3(3), new Set());
      for (const w of [o.words[0], o.words[2]]) {
        expect(seen.has(w), w).toBe(false);
        seen.add(w);
      }
    }
  });
});
