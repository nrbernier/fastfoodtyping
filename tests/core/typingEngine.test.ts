import { beforeEach, describe, expect, it } from 'vitest';
import { TypingEngine } from '../../src/core/typingEngine';
import { normalizeText } from '../../src/core/text';

const orders = [
  { id: 1, normalized: 'burger' },
  { id: 2, normalized: 'malt' },
  { id: 3, normalized: normalizeText('zebra soufflé') }, // 'zebra souffle'
];

describe('TypingEngine', () => {
  let engine: TypingEngine;

  beforeEach(() => {
    engine = new TypingEngine();
  });

  it('locks onto the customer whose order starts with the typed letter', () => {
    expect(engine.handleKey('m', orders)).toEqual({ kind: 'locked', customerId: 2 });
    expect(engine.locked).toBe(2);
    expect(engine.typedCount).toBe(1);
  });

  it('reports a mistake when no order starts with the letter', () => {
    expect(engine.handleKey('x', orders)).toEqual({ kind: 'mistake', customerId: null });
    expect(engine.locked).toBeNull();
  });

  it('progresses on correct letters and keeps progress on wrong ones', () => {
    engine.handleKey('b', orders);
    expect(engine.handleKey('u', orders)).toEqual({ kind: 'progress', customerId: 1, typedCount: 2 });
    expect(engine.handleKey('q', orders)).toEqual({ kind: 'mistake', customerId: 1 });
    expect(engine.typedCount).toBe(2);
    expect(engine.handleKey('r', orders)).toEqual({ kind: 'progress', customerId: 1, typedCount: 3 });
  });

  it('completes a single-word order on its last letter and releases the lock', () => {
    for (const ch of 'mal') engine.handleKey(ch, orders);
    expect(engine.handleKey('t', orders)).toEqual({ kind: 'completed', customerId: 2, finalWordIndex: 0 });
    expect(engine.locked).toBeNull();
    expect(engine.typedCount).toBe(0);
  });

  it('emits wordCompleted at word boundaries of multi-word orders', () => {
    engine.handleKey('z', orders);
    for (const ch of 'ebr') engine.handleKey(ch, orders);
    expect(engine.handleKey('a', orders)).toEqual({
      kind: 'wordCompleted',
      customerId: 3,
      wordIndex: 0,
      typedCount: 5,
    });
    expect(engine.handleKey(' ', orders)).toEqual({ kind: 'progress', customerId: 3, typedCount: 6 });
  });

  it('matches accent-free typing against accented orders', () => {
    for (const ch of 'zebra souffl') engine.handleKey(ch, orders);
    expect(engine.handleKey('e', orders)).toEqual({ kind: 'completed', customerId: 3, finalWordIndex: 1 });
  });

  it('release() clears the lock when the locked customer leaves', () => {
    engine.handleKey('b', orders);
    engine.release(1);
    expect(engine.locked).toBeNull();
    expect(engine.typedCount).toBe(0);
  });

  it('ignores multi-character keys', () => {
    expect(engine.handleKey('Shift', orders)).toEqual({ kind: 'ignored' });
  });

  it('reports a mistake when there are no orders to match', () => {
    expect(engine.handleKey('b', [])).toEqual({ kind: 'mistake', customerId: null });
    expect(engine.locked).toBeNull();
  });

  it('recovers when the locked customer vanishes without release()', () => {
    expect(engine.handleKey('m', orders)).toEqual({ kind: 'locked', customerId: 2 });
    expect(engine.locked).toBe(2);

    const remaining = orders.filter((o) => o.id !== 2);
    expect(engine.handleKey('b', remaining)).toEqual({ kind: 'locked', customerId: 1 });
    expect(engine.locked).toBe(1);
  });

  it('makes case count on exact (house) orders but not on regular ones', () => {
    const e = new TypingEngine();
    const house = [{ id: 7, normalized: "Mel's BLT", exact: true }];
    expect(e.handleKey('m', house).kind).toBe('mistake');
    expect(e.handleKey('M', house).kind).toBe('locked');
    for (const ch of "el's BL") expect(e.handleKey(ch, house).kind).not.toBe('mistake');
    expect(e.handleKey('t', house).kind).toBe('mistake');
    expect(e.handleKey('T', house).kind).toBe('completed');
    const plain = new TypingEngine();
    expect(plain.handleKey('B', [{ id: 1, normalized: 'bacon' }]).kind).toBe('locked');
  });

  it("accepts a phone's curly apostrophe for a straight one", () => {
    const e = new TypingEngine();
    const house = [{ id: 1, normalized: "Joe's", exact: true }];
    for (const ch of 'Joe') e.handleKey(ch, house);
    expect(e.handleKey('\u2019', house).kind).toBe('progress');
  });

  it('keeps progress per order when switching and comes back to it', () => {
    const e = new TypingEngine();
    const two = [{ id: 1, normalized: 'burger' }, { id: 2, normalized: 'malt' }];
    for (const ch of 'bur') e.handleKey(ch, two);
    e.select(2);
    expect(e.typedCount).toBe(0);
    for (const ch of 'malt') e.handleKey(ch, two);
    expect(e.locked).toBeNull();
    e.select(1);
    expect(e.typedCount).toBe(3);
    expect(e.handleKey('g', two)).toEqual({ kind: 'progress', customerId: 1, typedCount: 4 });
  });

  it('lets go without losing progress, and resumes a paused order from the keyboard', () => {
    const e = new TypingEngine();
    const two = [{ id: 1, normalized: 'burger' }, { id: 2, normalized: 'malt' }];
    for (const ch of 'bu') e.handleKey(ch, two);
    e.unlock();
    expect(e.progressOf(1)).toBe(2);
    expect(e.handleKey('r', two)).toEqual({ kind: 'progress', customerId: 1, typedCount: 3 });
    expect(e.locked).toBe(1);
  });

  it('prefers a fresh order\'s first letter over resuming a paused one', () => {
    const e = new TypingEngine();
    const two = [{ id: 1, normalized: 'pie' }, { id: 2, normalized: 'ice' }];
    e.handleKey('p', two);
    e.unlock();
    expect(e.handleKey('i', two)).toEqual({ kind: 'locked', customerId: 2 });
  });

  it('drops progress when a customer leaves', () => {
    const e = new TypingEngine();
    const one = [{ id: 1, normalized: 'burger' }];
    e.handleKey('b', one);
    e.release(1);
    expect(e.progressOf(1)).toBe(0);
    expect(e.locked).toBeNull();
  });
});
