import { describe, expect, it } from 'vitest';
import { SaveStore } from '../../src/persistence/storage';

function fakeBacking() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
  };
}

function throwingBacking() {
  return {
    getItem: (): string | null => {
      throw new Error('quota');
    },
    setItem: (): void => {
      throw new Error('quota');
    },
  };
}

describe('SaveStore', () => {
  it('returns defaults when empty', () => {
    const store = new SaveStore(fakeBacking());
    expect(store.load()).toEqual({ version: 1, unlockedShift: 0, highScores: {} });
  });

  it('persists unlocks and never goes backwards', () => {
    const backing = fakeBacking();
    const store = new SaveStore(backing);
    store.unlockShift(2);
    store.unlockShift(1);
    expect(new SaveStore(backing).load().unlockedShift).toBe(2);
  });

  it('records only improved scores', () => {
    const store = new SaveStore(fakeBacking());
    expect(store.recordScore('monday', 100)).toBe(true);
    expect(store.recordScore('monday', 50)).toBe(false);
    expect(store.recordScore('monday', 150)).toBe(true);
    expect(store.load().highScores.monday).toBe(150);
  });

  it('rejects valid JSON with the wrong shape', () => {
    const backing = fakeBacking();
    backing.setItem('short-order-hero-save', '{"version":1}');
    const store = new SaveStore(backing);
    expect(store.load()).toEqual({ version: 1, unlockedShift: 0, highScores: {} });
  });

  it('survives corrupted JSON', () => {
    const backing = fakeBacking();
    backing.setItem('short-order-hero-save', 'not json{');
    const store = new SaveStore(backing);
    expect(store.load().unlockedShift).toBe(0);
  });

  it('degrades to in-memory when backing throws', () => {
    const store = new SaveStore(throwingBacking());
    expect(() => store.unlockShift(1)).not.toThrow();
    expect(store.load().unlockedShift).toBe(1);
  });

  it('works with a null backing (storage unavailable)', () => {
    const store = new SaveStore(null);
    store.recordScore('overtime', 42);
    expect(store.load().highScores.overtime).toBe(42);
  });
});
