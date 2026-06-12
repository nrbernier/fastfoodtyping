import { describe, expect, it } from 'vitest';
import { ShiftEngine } from '../../src/core/shiftEngine';
import { mulberry32 } from '../../src/core/rng';
import type { ShiftConfig, ShiftResult } from '../../src/core/types';

const TEST_CONFIG: ShiftConfig = {
  id: 'test',
  name: 'Test Shift',
  durationMs: 10_000,
  rampMs: 10_000,
  maxCustomers: { start: 2, end: 2 },
  spawnIntervalMs: { start: 1000, end: 1000 },
  patienceMs: { start: 3000, end: 3000 },
  tierWeights: { start: { t1: 1, t2: 0, t3: 0 }, end: { t1: 1, t2: 0, t3: 0 } },
  wordsPerOrder: { start: 1, end: 1 },
};

function makeEngine(overrides: Partial<ShiftConfig> = {}) {
  return new ShiftEngine({ config: { ...TEST_CONFIG, ...overrides }, rng: mulberry32(99) });
}

function step(engine: ShiftEngine, totalMs: number, dt = 100) {
  for (let t = 0; t < totalMs; t += dt) engine.update(dt);
}

function typeOrder(engine: ShiftEngine, normalized: string) {
  for (const ch of normalized) engine.handleKey(ch);
}

describe('ShiftEngine', () => {
  it('spawns customers up to maxCustomers with distinct first letters', () => {
    const engine = makeEngine();
    step(engine, 5000);
    expect(engine.activeCustomers.length).toBe(2);
    const firsts = engine.activeCustomers.map((c) => c.order.normalized[0]);
    expect(new Set(firsts).size).toBe(firsts.length);
  });

  it('drains patience and counts strikes when customers storm out', () => {
    const engine = makeEngine();
    const left: number[] = [];
    engine.events.on('customerLeft', (e) => left.push(e.customerId));
    step(engine, 4500);
    expect(left.length).toBeGreaterThanOrEqual(1);
    expect(engine.strikes).toBe(left.length);
  });

  it('ends the shift as a loss on 3 strikes', () => {
    const engine = makeEngine();
    let result: ShiftResult | null = null;
    engine.events.on('shiftEnded', (e) => (result = e.result));
    step(engine, 10_000);
    expect(engine.isOver).toBe(true);
    expect(result).not.toBeNull();
    expect(result!.won).toBe(false);
    expect(result!.strikes).toBe(3);
  });

  it('serves a customer when their order is fully typed', () => {
    const engine = makeEngine();
    const served: number[] = [];
    engine.events.on('orderServed', (e) => served.push(e.customerId));
    step(engine, 1000); // first customer in
    const customer = engine.activeCustomers[0];
    typeOrder(engine, customer.order.normalized);
    expect(served).toEqual([customer.id]);
    expect(engine.served).toBe(1);
    expect(engine.score).toBeGreaterThan(0);
    expect(customer.resolved).toBe(true);
  });

  it('counts mistakes and reports accuracy and wpm in the result', () => {
    const engine = makeEngine({ durationMs: 2000, spawnIntervalMs: { start: 9000, end: 9000 } });
    let result: ShiftResult | null = null;
    engine.events.on('shiftEnded', (e) => (result = e.result));
    step(engine, 1000);
    const customer = engine.activeCustomers[0];
    const wrong = customer.order.normalized[0] === 'q' ? 'z' : 'q';
    engine.handleKey(wrong); // 1 mistake
    typeOrder(engine, customer.order.normalized);
    step(engine, 2000); // past durationMs with no customers left -> win
    expect(result).not.toBeNull();
    expect(result!.won).toBe(true);
    expect(result!.served).toBe(1);
    expect(result!.accuracy).toBeLessThan(1);
    expect(result!.accuracy).toBeGreaterThan(0.5);
    expect(result!.wpm).toBeGreaterThan(0);
  });

  it('ends immediately at 0:00 even with customers still standing', () => {
    const engine = makeEngine({ durationMs: 1500, patienceMs: { start: 10_000, end: 10_000 } });
    let result: ShiftResult | null = null;
    engine.events.on('shiftEnded', (e) => (result = e.result));
    step(engine, 1500); // first customer is in, nowhere near timing out
    expect(engine.isOver).toBe(true);
    expect(result).not.toBeNull();
    expect(result!.won).toBe(true);
    expect(engine.activeCustomers.length).toBe(0); // the bell sent them home
  });

  it('stops spawning after durationMs and wins when the room clears', () => {
    const engine = makeEngine({ durationMs: 1500, patienceMs: { start: 10_000, end: 10_000 } });
    let result: ShiftResult | null = null;
    engine.events.on('shiftEnded', (e) => (result = e.result));
    step(engine, 1500);
    for (const c of [...engine.activeCustomers]) typeOrder(engine, c.order.normalized);
    step(engine, 200);
    expect(result).not.toBeNull();
    expect(result!.won).toBe(true);
  });

  it('ignores input after the shift is over', () => {
    const engine = makeEngine();
    step(engine, 10_000);
    expect(engine.isOver).toBe(true);
    expect(() => engine.handleKey('a')).not.toThrow();
  });
});
