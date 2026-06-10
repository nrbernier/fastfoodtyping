import { normalizeText } from './text';

export interface TypableOrder {
  id: number;
  normalized: string;
}

export type KeyResult =
  | { kind: 'ignored' }
  | { kind: 'locked'; customerId: number }
  | { kind: 'progress'; customerId: number; typedCount: number }
  | { kind: 'wordCompleted'; customerId: number; wordIndex: number; typedCount: number }
  | { kind: 'completed'; customerId: number; finalWordIndex: number }
  | { kind: 'mistake'; customerId: number | null };

export class TypingEngine {
  private lockedId: number | null = null;
  private typed = 0;

  get locked(): number | null {
    return this.lockedId;
  }

  get typedCount(): number {
    return this.typed;
  }

  /** Call when a customer despawns so a stale lock doesn't linger. */
  release(customerId: number): void {
    if (this.lockedId === customerId) {
      this.lockedId = null;
      this.typed = 0;
    }
  }

  handleKey(rawChar: string, orders: ReadonlyArray<TypableOrder>): KeyResult {
    if (rawChar.length !== 1) return { kind: 'ignored' };
    const char = normalizeText(rawChar);

    if (this.lockedId === null) {
      const target = orders.find((o) => o.normalized[0] === char);
      if (!target) return { kind: 'mistake', customerId: null };
      this.lockedId = target.id;
      this.typed = 1;
      return this.checkBoundaries(target) ?? { kind: 'locked', customerId: target.id };
    }

    const target = orders.find((o) => o.id === this.lockedId);
    if (!target) {
      // Locked customer vanished without release(); recover by unlocking.
      this.lockedId = null;
      this.typed = 0;
      return this.handleKey(rawChar, orders);
    }

    if (target.normalized[this.typed] !== char) {
      return { kind: 'mistake', customerId: target.id };
    }

    this.typed += 1;
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
      this.lockedId = null;
      this.typed = 0;
      return { kind: 'completed', customerId: id, finalWordIndex };
    }
    if (target.normalized[this.typed] === ' ') {
      const wordIndex = target.normalized.slice(0, this.typed).split(' ').length - 1;
      return { kind: 'wordCompleted', customerId: target.id, wordIndex, typedCount: this.typed };
    }
    return null;
  }
}
