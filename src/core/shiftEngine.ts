import { Emitter } from './emitter';
import { paramsAt } from './difficulty';
import { OrderGenerator } from './orderGenerator';
import { mulberry32, type Rng } from './rng';
import { orderTip } from './scoring';
import { TypingEngine } from './typingEngine';
import type { CustomerState, GameEvents, LiveParams, ShiftConfig, ShiftResult } from './types';

export interface ShiftEngineOptions {
  config: ShiftConfig;
  rng?: Rng;
  /** Rendering-driven cap (e.g. 3 on narrow phones). Defaults to 4. */
  maxCustomersCap?: number;
}

const FIRST_SPAWN_MS = 800;
const MAX_STRIKES = 3;

export class ShiftEngine {
  readonly events = new Emitter<GameEvents>();

  score = 0;
  strikes = 0;
  served = 0;
  bestCombo = 0;

  private readonly config: ShiftConfig;
  private readonly cap: number;
  private readonly rng: Rng;
  private readonly typing = new TypingEngine();
  private readonly generator: OrderGenerator;
  private customers: CustomerState[] = [];
  private nextId = 1;
  private elapsed = 0;
  private spawnAt = FIRST_SPAWN_MS;
  private over = false;
  private correctChars = 0;
  private mistakes = 0;
  private cleanStreak = 0;

  constructor(opts: ShiftEngineOptions) {
    this.config = opts.config;
    this.cap = opts.maxCustomersCap ?? 4;
    this.rng = opts.rng ?? mulberry32(Date.now() >>> 0);
    this.generator = new OrderGenerator(this.rng);
  }

  get isOver(): boolean {
    return this.over;
  }

  get activeCustomers(): ReadonlyArray<CustomerState> {
    return this.customers.filter((c) => !c.resolved);
  }

  get lockedCustomerId(): number | null {
    return this.typing.locked;
  }

  get typedCount(): number {
    return this.typing.typedCount;
  }

  update(dtMs: number): void {
    if (this.over) return;
    this.elapsed += dtMs;
    const params = paramsAt(this.config, this.elapsed);
    // The shift bell rings the instant the (finite) timer expires; Overtime
    // (durationMs = Infinity) never reaches time-up and ends only on strikes.
    const timeUp = Number.isFinite(this.config.durationMs) && this.elapsed >= this.config.durationMs;

    if (
      !timeUp &&
      this.elapsed >= this.spawnAt &&
      this.activeCustomers.length < Math.min(params.maxCustomers, this.cap)
    ) {
      this.spawn(params);
      this.spawnAt = this.elapsed + params.spawnIntervalMs;
    }

    for (const c of this.activeCustomers) {
      c.patienceMs -= dtMs;
      if (c.patienceMs <= 0) {
        c.patienceMs = 0;
        c.resolved = true;
        this.typing.release(c.id);
        this.strikes += 1;
        this.cleanStreak = 0;
        this.events.emit('customerLeft', { customerId: c.id, strikes: this.strikes });
        if (this.strikes >= MAX_STRIKES) return this.end(false);
      }
    }

    // Bell at 0:00: any customers still standing are released (no penalty) and
    // the shift ends directly, rather than lingering until they clear.
    if (timeUp) {
      for (const c of this.activeCustomers) {
        c.resolved = true;
        this.typing.release(c.id);
      }
      this.end(true);
    }
  }

  handleKey(char: string): void {
    if (this.over) return;
    const orders = this.activeCustomers.map((c) => ({ id: c.id, normalized: c.order.normalized }));
    const res = this.typing.handleKey(char, orders);
    switch (res.kind) {
      case 'ignored':
        return;
      case 'locked':
        this.correctChars += 1;
        this.events.emit('orderLocked', { customerId: res.customerId });
        return;
      case 'progress':
        this.correctChars += 1;
        this.events.emit('orderProgress', { customerId: res.customerId, typedCount: res.typedCount });
        return;
      case 'wordCompleted':
        this.correctChars += 1;
        this.events.emit('wordCompleted', { customerId: res.customerId, wordIndex: res.wordIndex });
        return;
      case 'completed':
        this.correctChars += 1;
        this.serve(res.customerId, res.finalWordIndex);
        return;
      case 'mistake':
        this.mistakes += 1;
        this.cleanStreak = 0;
        this.events.emit('mistake', { customerId: res.customerId });
        return;
    }
  }

  private spawn(params: LiveParams): void {
    const usedLetters = new Set(this.activeCustomers.map((c) => c.order.normalized[0]));
    const order = this.generator.next(params.order, usedLetters);
    // Pick a random free slot (not always the leftmost) so a lone customer
    // isn't always parked at the same seat.
    const usedSlots = new Set(this.activeCustomers.map((c) => c.slot));
    const freeSlots = [];
    for (let s = 0; s < this.cap; s++) if (!usedSlots.has(s)) freeSlots.push(s);
    const slot = freeSlots.length > 0
      ? freeSlots[Math.floor(this.rng() * freeSlots.length)]
      : this.customers.length; // fallback: never reached while active < cap
    const customer: CustomerState = {
      id: this.nextId++,
      slot,
      order,
      patienceTotalMs: params.patienceMs,
      patienceMs: params.patienceMs,
      resolved: false,
    };
    this.customers.push(customer);
    this.events.emit('customerArrived', { customer });
  }

  private serve(customerId: number, finalWordIndex: number): void {
    const c = this.customers.find((x) => x.id === customerId);
    if (!c || c.resolved) return;
    c.resolved = true;
    this.served += 1;
    const tip = orderTip(c.order, c.patienceMs / c.patienceTotalMs, this.cleanStreak);
    this.score += tip;
    this.cleanStreak += 1;
    this.bestCombo = Math.max(this.bestCombo, this.cleanStreak);
    this.events.emit('orderServed', { customerId, tip, finalWordIndex });
  }

  private end(won: boolean): void {
    this.over = true;
    const minutes = this.elapsed / 60_000;
    const attempted = this.correctChars + this.mistakes;
    const result: ShiftResult = {
      shiftId: this.config.id,
      won,
      score: this.score,
      served: this.served,
      strikes: this.strikes,
      accuracy: attempted === 0 ? 1 : this.correctChars / attempted,
      wpm: minutes > 0 ? this.correctChars / 5 / minutes : 0,
      bestCombo: this.bestCombo,
      elapsedMs: this.elapsed,
    };
    this.events.emit('shiftEnded', { result });
  }
}
