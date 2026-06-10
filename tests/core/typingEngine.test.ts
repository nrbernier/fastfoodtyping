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
});
