import { describe, expect, it } from 'vitest';
import { HOUSE_ORDERS, TIER1, TIER2 } from '../../src/core/vocabulary';
import { DISH_KINDS, DISH_SVG, SMOKE_COLORS } from '../../src/ui/dishArt';
import { servingFor } from '../../src/ui/dishes';

const dish = (text: string, tier: 1 | 2 | 3 = 2, exact = false) => servingFor({ text, tier, exact });

describe('servingFor', () => {
  it('reads the dish from the last word that names one', () => {
    expect(dish('apple pie')).toEqual({ kind: 'dish', dish: 'pie' });
    expect(dish('root beer float')).toEqual({ kind: 'dish', dish: 'shake' });
    expect(dish('egg salad sandwich')).toEqual({ kind: 'dish', dish: 'sandwich' });
    expect(dish('coffee with cream')).toEqual({ kind: 'dish', dish: 'coffee' });
  });

  it('checks two-word names first', () => {
    expect(dish('sloppy joe')).toEqual({ kind: 'dish', dish: 'burger' });
    expect(dish('cup of joe')).toEqual({ kind: 'dish', dish: 'coffee' });
    expect(dish('hash browns')).toEqual({ kind: 'dish', dish: 'fries' });
  });

  it('reads house orders through their capitals and punctuation', () => {
    expect(dish("Mel's BLT", 2, true)).toEqual({ kind: 'dish', dish: 'sandwich' });
    expect(dish('coffee, black', 2, true)).toEqual({ kind: 'dish', dish: 'coffee' });
  });

  it('serves anything else as a blue plate dinner', () => {
    expect(dish('meat loaf')).toEqual({ kind: 'dish', dish: 'dinner' });
  });

  it('covers every weird dish with the cloche, smoke coloured by its first word', () => {
    expect(dish('haunted kelp fondue', 3)).toEqual({ kind: 'mystery', smoke: 'purple' });
    expect(dish('frozen walnut bisque', 3)).toEqual({ kind: 'mystery', smoke: 'blue' });
    const odd = dish('xeroxed yam ziti', 3);
    expect(odd.kind).toBe('mystery');
    if (odd.kind === 'mystery') expect(Object.keys(SMOKE_COLORS)).toContain(odd.smoke);
  });

  it('has a drawing for every dish it can pick', () => {
    for (const k of DISH_KINDS) expect(DISH_SVG[k].length, k).toBeGreaterThan(100);
    for (const t of [...TIER1, ...TIER2, ...HOUSE_ORDERS]) {
      const s = dish(t);
      expect(s.kind).toBe('dish');
      if (s.kind === 'dish') expect(DISH_KINDS).toContain(s.dish);
    }
  });
});

describe('servingFor in French', () => {
  const fr = (text: string, tier: 1 | 2 | 3 = 2) => servingFor({ text, tier, exact: false, lang: 'fr' });

  it('reads the dish from the first word that names one', () => {
    expect(fr('tarte aux pommes')).toEqual({ kind: 'dish', dish: 'pie' });
    expect(fr('jus de pomme')).toEqual({ kind: 'dish', dish: 'soda' });
    expect(fr('steak frites')).toEqual({ kind: 'dish', dish: 'fries' });
    expect(fr('café liégeois')).toEqual({ kind: 'dish', dish: 'sundae' });
    expect(fr('boudin noir')).toEqual({ kind: 'dish', dish: 'dinner' });
  });

  it('colours the cloche smoke from the agreed adjective', () => {
    expect(fr('gaufres de zèbre hantées', 3)).toEqual({ kind: 'mystery', smoke: 'purple' });
    expect(fr('soupe de navet glacée', 3)).toEqual({ kind: 'mystery', smoke: 'blue' });
  });
});
