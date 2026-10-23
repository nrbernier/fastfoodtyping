import { describe, expect, it } from 'vitest';
import { ShiftEngine } from '../../src/core/shiftEngine';
import { mulberry32 } from '../../src/core/rng';
import type { ShiftConfig, ShiftResult } from '../../src/core/types';
import { BOSSES } from '../../src/core/shifts';

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
  countChance: { start: 0, end: 0 },
  houseChance: { start: 0, end: 0 },
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

  it('tallies keystrokes per expected letter and times served orders', () => {
    const engine = makeEngine({ durationMs: 2000, spawnIntervalMs: { start: 9000, end: 9000 } });
    let result: ShiftResult | null = null;
    engine.events.on('shiftEnded', (e) => (result = e.result));
    step(engine, 1000);
    const order = engine.activeCustomers[0].order;
    const text = order.normalized;
    engine.handleKey(text[0]);
    engine.handleKey(text[1] === 'q' ? 'z' : 'q'); // miss the second letter
    for (const ch of text.slice(1)) {
      engine.handleKey(ch);
      engine.update(50);
    }
    step(engine, 2000);
    expect(result!.tally.misses).toEqual({ [text[1]]: 1 });
    expect(result!.tally.pairMisses).toEqual({ [text.slice(0, 2)]: 1 });
    const hits = Object.values(result!.tally.hits).reduce((a, b) => a + b, 0);
    expect(hits).toBe(text.replace(/ /g, '').length);
    expect(result!.fastest?.text).toBe(order.text);
    expect(result!.fastest!.ms).toBeGreaterThan(0);
    expect(result!.slowest).toEqual(result!.fastest);
  });

  it('switches orders on request, keeping what was typed', () => {
    const engine = makeEngine({ spawnIntervalMs: { start: 300, end: 300 } });
    const released: number[] = [];
    engine.events.on('orderReleased', (e) => released.push(e.customerId));
    step(engine, 1500);
    const [a, b] = engine.activeCustomers;
    engine.handleKey(a.order.normalized[0]);
    engine.handleKey(a.order.normalized[1]);
    engine.selectCustomer(b.id);
    expect(released).toEqual([a.id]);
    expect(engine.lockedCustomerId).toBe(b.id);
    expect(engine.progressOf(a.id)).toBe(2);
    engine.releaseLock();
    expect(engine.lockedCustomerId).toBeNull();
    engine.selectCustomer(a.id);
    typeOrder(engine, a.order.normalized.slice(2));
    expect(a.resolved).toBe(true);
  });

  it('a fickle customer changes their order halfway, refilling patience and paying extra', () => {
    const engine = makeEngine({ specials: { fickle: 1, courses: 0, rushAtMs: [] }, spawnIntervalMs: { start: 9000, end: 9000 } });
    const changed: string[] = [];
    engine.events.on('orderChanged', (e) => changed.push(e.customer.order.text));
    step(engine, 1000);
    const c = engine.activeCustomers[0];
    const first = c.order.normalized;
    step(engine, 1000); // lose some patience
    for (const ch of first.slice(0, Math.ceil(first.length / 2))) engine.handleKey(ch);
    expect(changed).toHaveLength(1);
    expect(c.order.normalized).not.toBe(first);
    expect(c.patienceMs).toBe(c.patienceTotalMs);
    expect(engine.progressOf(c.id)).toBe(0);
    let tip = 0;
    engine.events.on('orderServed', (e) => (tip = e.tip));
    typeOrder(engine, c.order.normalized); // no second change
    expect(changed).toHaveLength(1);
    expect(c.resolved).toBe(true);
    expect(tip).toBeGreaterThan(0);
  });

  it('a diner stays for another course after a short break', () => {
    const engine = makeEngine({ specials: { fickle: 0, courses: 1, rushAtMs: [] }, spawnIntervalMs: { start: 9000, end: 9000 } });
    const served: Array<boolean | undefined> = [];
    const courses: string[] = [];
    engine.events.on('orderServed', (e) => served.push(e.stays));
    engine.events.on('nextCourse', (e) => courses.push(e.customer.order.text));
    step(engine, 1000);
    const c = engine.activeCustomers[0];
    typeOrder(engine, c.order.normalized);
    expect(served).toEqual([true]);
    expect(c.resolved).toBe(false);
    // While eating there is nothing to type and patience holds.
    const patience = c.patienceMs;
    engine.handleKey(c.order.normalized[0]);
    expect(engine.lockedCustomerId).toBeNull();
    step(engine, 1000);
    expect(c.patienceMs).toBe(patience);
    step(engine, 2000);
    expect(courses).toHaveLength(1);
    typeOrder(engine, c.order.normalized);
    expect(served.length).toBeGreaterThanOrEqual(2);
  });

  it('a drink rush fills every seat with short drinks and pays a bonus when cleared', () => {
    const engine = makeEngine({
      durationMs: 60_000, patienceMs: { start: 60_000, end: 60_000 }, spawnIntervalMs: { start: 30_000, end: 30_000 },
      specials: { fickle: 0, courses: 0, rushAtMs: [2000] },
    });
    let ended: { cleared: boolean; bonus: number } | null = null;
    let started = 0;
    engine.events.on('rushStarted', (e) => (started = e.count));
    engine.events.on('rushEnded', (e) => (ended = e));
    step(engine, 1000);
    for (const c of [...engine.activeCustomers]) typeOrder(engine, c.order.normalized);
    step(engine, 3000);
    expect(started).toBeGreaterThan(0);
    expect(engine.activeCustomers.length).toBe(4); // every seat
    expect(engine.activeCustomers.every((c) => c.special === 'rush')).toBe(true);
    const before = engine.score;
    for (let i = 0; i < 20 && !ended; i++) {
      for (const c of [...engine.activeCustomers]) typeOrder(engine, c.order.normalized);
      step(engine, 500);
    }
    expect(ended).toEqual({ cleared: true, bonus: expect.any(Number) });
    expect(engine.score - before).toBeGreaterThan(ended!.bonus);
  });

  describe('boss nights', () => {
    const [lou, moneybags] = BOSSES;
    const bossEngine = (config: ShiftConfig) => new ShiftEngine({ config, rng: mulberry32(5), maxCustomersCap: 3 });

    it('seats the boss in the centre and wins once his whole appetite is served', () => {
      const engine = bossEngine({ ...lou, boss: { ...lou.boss!, moves: [], dishes: 3 } });
      let result: ShiftResult | null = null;
      engine.events.on('shiftEnded', (e) => (result = e.result));
      step(engine, 1000);
      const boss = engine.boss!;
      expect(boss.slot).toBe(1);
      expect(engine.activeCustomers).toHaveLength(1);
      for (let i = 0; i < 3; i++) {
        typeOrder(engine, engine.boss!.order.normalized);
        step(engine, 1000);
      }
      expect(result!.won).toBe(true);
      expect(result!.served).toBe(3);
    });

    it('ends the night at once if the boss storms out', () => {
      const engine = bossEngine({ ...lou, boss: { ...lou.boss!, moves: [] } });
      let result: ShiftResult | null = null;
      engine.events.on('shiftEnded', (e) => (result = e.result));
      step(engine, 25_000);
      expect(result!.won).toBe(false);
      expect(result!.strikes).toBe(1);
    });

    it('wrong keys stoke his temper and dishes calm it', () => {
      const engine = bossEngine({ ...lou, boss: { ...lou.boss!, moves: [] } });
      step(engine, 3000);
      const boss = engine.boss!;
      const before = boss.patienceMs;
      engine.handleKey(boss.order.normalized[0] === 'q' ? 'z' : 'q');
      expect(boss.patienceMs).toBeCloseTo(before - lou.boss!.mistakeMs);
      const low = boss.patienceMs;
      typeOrder(engine, boss.order.normalized);
      expect(boss.patienceMs).toBeGreaterThan(low);
    });

    it('asks for seconds, growing his appetite', () => {
      const engine = bossEngine({ ...lou, boss: { ...lou.boss!, moves: ['seconds'], moveEveryMs: 2000 } });
      const moves: string[] = [];
      engine.events.on('bossMove', (e) => moves.push(e.kind));
      step(engine, 5000);
      expect(moves.length).toBeGreaterThanOrEqual(2);
      expect(engine.bossAppetite.total).toBe(lou.boss!.dishes + moves.length);
    });

    it('sends a dish back: the same order returns', () => {
      const engine = bossEngine({ ...moneybags, maxCustomers: { start: 1, end: 1 }, boss: { ...moneybags.boss!, moves: ['sendBack'], moveEveryMs: 1500 } });
      step(engine, 1600); // boss seated at 800, sends back at 1500
      const text = engine.boss!.order.normalized;
      typeOrder(engine, text);
      step(engine, 1000);
      expect(engine.boss!.order.normalized).toBe(text);
      expect(engine.bossAppetite.left).toBe(moneybags.boss!.dishes);
    });

    it('keeps the side seats busy on the Moneybags night', () => {
      const engine = bossEngine(moneybags);
      step(engine, 15_000);
      expect(engine.activeCustomers.length).toBeGreaterThan(1);
    });
  });
});
