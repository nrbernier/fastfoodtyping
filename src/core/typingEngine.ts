import { plainPunctuation, stripAccents } from './text';

export interface TypableOrder {
  id: number;
  normalized: string;
  /** Case counts (house orders); otherwise a capital still matches its lowercase letter. */
  exact?: boolean;
}

function matches(order: TypableOrder, index: number, char: string): boolean {
  const expected = order.normalized[index];
  return expected === char || (!order.exact && expected === char.toLowerCase());
}

export type KeyResult =
  | { kind: 'ignored' }
  | { kind: 'locked'; customerId: number }
  | { kind: 'progress'; customerId: number; typedCount: number }
  | { kind: 'wordCompleted'; customerId: number; wordIndex: number; typedCount: number }
  | { kind: 'completed'; customerId: number; finalWordIndex: number }
  | { kind: 'mistake'; customerId: number | null };

/**
 * Routes keystrokes to one order at a time. Typing an order's first letter
 * locks onto it; progress is kept per order, so the player can switch to
 * another customer (select) or let go (unlock) and come back later.
 */
export class TypingEngine {
  private lockedId: number | null = null;
  private progress = new Map<number, number>();

  get locked(): number | null {
    return this.lockedId;
  }

  get typedCount(): number {
    return this.lockedId === null ? 0 : this.progressOf(this.lockedId);
  }

  private get typed(): number {
    return this.typedCount;
  }

  /** Characters already typed on an order, locked or not. */
  progressOf(customerId: number): number {
    return this.progress.get(customerId) ?? 0;
  }

  /** Call when a customer despawns so a stale lock or progress doesn't linger. */
  release(customerId: number): void {
    this.progress.delete(customerId);
    if (this.lockedId === customerId) this.lockedId = null;
  }

  /** Switch to an order (keeping what was already typed on it). */
  select(customerId: number): void {
    this.lockedId = customerId;
  }

  /** Let go of the current order without losing its progress. */
  unlock(): void {
    this.lockedId = null;
  }

  /** Throw away what was typed on an order (it changed). */
  resetProgress(customerId: number): void {
    this.progress.delete(customerId);
  }

  handleKey(rawChar: string, orders: ReadonlyArray<TypableOrder>): KeyResult {
    if (rawChar.length !== 1) return { kind: 'ignored' };
    const char = stripAccents(plainPunctuation(rawChar));

    if (this.lockedId === null) {
      // A fresh order's first letter locks on; failing that, a paused order
      // resumes if it is the only one waiting for this letter.
      const fresh = orders.find((o) => this.progressOf(o.id) === 0 && matches(o, 0, char));
      const paused = orders.filter((o) => this.progressOf(o.id) > 0 && matches(o, this.progressOf(o.id), char));
      const target = fresh ?? (paused.length === 1 ? paused[0] : undefined);
      if (!target) return { kind: 'mistake', customerId: null };
      this.lockedId = target.id;
      const resumed = this.progressOf(target.id) > 0;
      this.progress.set(target.id, this.progressOf(target.id) + 1);
      return (
        this.checkBoundaries(target) ??
        (resumed ? { kind: 'progress', customerId: target.id, typedCount: this.typed } : { kind: 'locked', customerId: target.id })
      );
    }

    const target = orders.find((o) => o.id === this.lockedId);
    if (!target) {
      // Locked customer vanished without release(); recover by unlocking.
      this.release(this.lockedId);
      return this.handleKey(rawChar, orders);
    }

    if (!matches(target, this.typed, char)) {
      return { kind: 'mistake', customerId: target.id };
    }

    this.progress.set(target.id, this.typed + 1);
    return (
      this.checkBoundaries(target) ?? {
        kind: 'progress',
        customerId: target.id,
        typedCount: this.typed,
      }
    );
  }

  /** Returns completed / wordCompleted if `typed` sits on a boundary, else null. */
  private checkBoundaries(target: TypableOrder): KeyResult | null {
    if (this.typed === target.normalized.length) {
      const finalWordIndex = target.normalized.split(' ').length - 1;
      const id = target.id;
      this.release(id);
      return { kind: 'completed', customerId: id, finalWordIndex };
    }
    if (target.normalized[this.typed] === ' ') {
      const wordIndex = target.normalized.slice(0, this.typed).split(' ').length - 1;
      return { kind: 'wordCompleted', customerId: target.id, wordIndex, typedCount: this.typed };
    }
    return null;
  }
}
