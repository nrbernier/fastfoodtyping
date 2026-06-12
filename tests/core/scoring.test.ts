import { describe, expect, it } from 'vitest';
import { baseTip, comboMultiplier, orderTip, patienceMultiplier } from '../../src/core/scoring';
import type { Order } from '../../src/core/types';

function order(text: string): Order {
  return { words: text.split(' '), text, normalized: text };
}

describe('scoring', () => {
  it('baseTip is 3 cents per letter, spaces excluded', () => {
    expect(baseTip(order('malt'))).toBe(12);
    expect(baseTip(order('zebra souffle'))).toBe(36); // 12 letters
  });

  it('patienceMultiplier rewards fast service', () => {
    expect(patienceMultiplier(0.8)).toBe(1.5);
    expect(patienceMultiplier(0.5)).toBe(1.5);
    expect(patienceMultiplier(0.3)).toBe(1.2);
    expect(patienceMultiplier(0.1)).toBe(1.0);
  });

  it('comboMultiplier grows 0.25 per clean order, capped at 3', () => {
    expect(comboMultiplier(0)).toBe(1.0);
    expect(comboMultiplier(2)).toBe(1.5);
    expect(comboMultiplier(100)).toBe(3.0);
  });

  it('orderTip combines all three, rounded', () => {
    // 36 * 1.5 * 1.5 = 81
    expect(orderTip(order('zebra souffle'), 0.6, 2)).toBe(81);
  });
});
