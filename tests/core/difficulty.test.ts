import { describe, expect, it } from 'vitest';
import { lerp, mixTiers, orderPatienceMs, PACES, paramsAt } from '../../src/core/difficulty';
import { OVERTIME, SHIFTS } from '../../src/core/shifts';

describe('lerp', () => {
  it('interpolates linearly', () => {
    expect(lerp(0, 10, 0.5)).toBe(5);
    expect(lerp(10, 0, 1)).toBe(0);
  });
});

describe('mixTiers', () => {
  it('interpolates and normalizes to sum 1', () => {
    const m = mixTiers({ t1: 1, t2: 0, t3: 0 }, { t1: 0, t2: 1, t3: 0 }, 0.5);
    expect(m.t1).toBeCloseTo(0.5);
    expect(m.t2).toBeCloseTo(0.5);
    expect(m.t1 + m.t2 + m.t3).toBeCloseTo(1);
  });
});

describe('paramsAt', () => {
  const monday = SHIFTS[0];

  it('returns start params at t=0', () => {
    const p = paramsAt(monday, 0);
    expect(p.spawnIntervalMs).toBe(monday.spawnIntervalMs.start);
    expect(p.patienceMs).toBe(monday.patienceMs.start);
  });

  it('returns end params at and beyond the ramp', () => {
    const p = paramsAt(monday, monday.rampMs * 2);
    expect(p.spawnIntervalMs).toBe(monday.spawnIntervalMs.end);
    expect(p.patienceMs).toBe(monday.patienceMs.end);
  });
});

describe('shift definitions', () => {
  it('has 5 shifts plus overtime', () => {
    expect(SHIFTS).toHaveLength(5);
    expect(OVERTIME.durationMs).toBe(Infinity);
  });

  it('gets harder across the week', () => {
    const first = SHIFTS[0];
    const last = SHIFTS[4];
    expect(last.patienceMs.end).toBeLessThan(first.patienceMs.start);
    expect(last.spawnIntervalMs.end).toBeLessThan(first.spawnIntervalMs.start);
    expect(last.tierWeights.end.t3).toBeGreaterThan(0.9);
  });

  it('never goes below sane floors at max overtime difficulty', () => {
    const p = paramsAt(OVERTIME, 10 * 60 * 1000);
    expect(p.spawnIntervalMs).toBeGreaterThanOrEqual(1500);
    expect(p.patienceMs).toBeGreaterThanOrEqual(4000);
    expect(p.order.wordsPerOrder).toBeLessThanOrEqual(3);
  });
});

describe('pace', () => {
  it('stretches patience and spacing on slower paces but leaves the orders alone', () => {
    const rush = paramsAt(SHIFTS[2], 30_000, 'rush');
    for (const pace of ['easygoing', 'steady'] as const) {
      const slow = paramsAt(SHIFTS[2], 30_000, pace);
      expect(slow.patienceMs).toBeCloseTo(rush.patienceMs * PACES[pace].patience);
      expect(slow.spawnIntervalMs).toBeCloseTo(rush.spawnIntervalMs * PACES[pace].spawn);
      expect(slow.patienceMs).toBeGreaterThan(rush.patienceMs);
      expect(slow.order).toEqual(rush.order);
      expect(slow.maxCustomers).toBe(rush.maxCustomers);
    }
    expect(paramsAt(SHIFTS[2], 30_000)).toEqual(rush);
  });
});

describe('orderPatienceMs', () => {
  it('gives long orders extra time on the slower paces only', () => {
    expect(orderPatienceMs(10_000, 30, 'rush')).toBe(10_000);
    expect(orderPatienceMs(10_000, 4, 'easygoing')).toBe(10_000);
    expect(orderPatienceMs(10_000, 30, 'easygoing')).toBe(10_000 + 24 * PACES.easygoing.perCharMs);
    expect(orderPatienceMs(10_000, 30, 'easygoing')).toBeGreaterThan(orderPatienceMs(10_000, 30, 'steady'));
  });
});
