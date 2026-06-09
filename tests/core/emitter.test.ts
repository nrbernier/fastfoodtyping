import { describe, expect, it } from 'vitest';
import { Emitter } from '../../src/core/emitter';

interface TestEvents extends Record<string, unknown> {
  ping: { value: number };
}

describe('Emitter', () => {
  it('delivers payloads to subscribers', () => {
    const e = new Emitter<TestEvents>();
    const seen: number[] = [];
    e.on('ping', (p) => seen.push(p.value));
    e.emit('ping', { value: 7 });
    expect(seen).toEqual([7]);
  });

  it('unsubscribes via the returned function', () => {
    const e = new Emitter<TestEvents>();
    const seen: number[] = [];
    const off = e.on('ping', (p) => seen.push(p.value));
    off();
    e.emit('ping', { value: 1 });
    expect(seen).toEqual([]);
  });
});
