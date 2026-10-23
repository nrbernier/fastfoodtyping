import { Emitter } from './emitter';
import { lerp, mixTiers, orderPatienceMs, paramsAt, type Pace } from './difficulty';
import { OrderGenerator, type Focus } from './orderGenerator';
import type { Vocabulary } from './lang';
import { mulberry32, type Rng } from './rng';
import { CUSTOMER_BONUS, orderTip, RUSH_BONUS_PER_ORDER } from './scoring';
import { TypingEngine } from './typingEngine';
import { emptyTally, recordKey } from './typingStats';
import type { BossMove, CustomerState, GameEvents, LiveParams, Order, OrderTiming, ShiftConfig, ShiftResult } from './types';

export interface ShiftEngineOptions {
  config: ShiftConfig;
  rng?: Rng;
  /** Rendering-driven cap (e.g. 3 on narrow phones). Defaults to 4. */
  maxCustomersCap?: number;
  /** Letters and pairs to work into more orders (see practiceFocus). */
  focus?: Focus;
  /** House orders with capitals and punctuation; on by default. */
  houseOrders?: boolean;
  /** Patience and arrival pacing; defaults to the full-speed rush. */
  pace?: Pace;
  /** Which language's menu orders come from; English by default. */
  vocabulary?: Vocabulary;
}

const FIRST_SPAWN_MS = 800;
const MAX_STRIKES = 3;
/** Orders served in one drink rush. */
const RUSH_SIZE = 6;
/** Gap between rush arrivals while a seat is free. */
const RUSH_SPAWN_MS = 350;
/** How long a diner takes over a course before ordering the next. */
const EATING_MS = 2500;
/** A fickle customer changes their mind once this share of the order is typed. */
const FICKLE_AT = 0.5;

export class ShiftEngine {
  readonly events = new Emitter<GameEvents>();

  score = 0;
  strikes = 0;
  served = 0;
  bestCombo = 0;

  private readonly config: ShiftConfig;
  private readonly cap: number;
  private readonly houseOrders: boolean;
  private readonly pace: Pace;
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
  private readonly tally = emptyTally();
  /** When each customer's order was locked onto, for per-order speed. */
  private lockedAt = new Map<number, number>();
  private fastest: OrderTiming | null = null;
  private slowest: OrderTiming | null = null;
  /** Rush orders still to arrive, and how the current rush is going. */
  private rushLeft = 0;
  private rushIndex = 0;
  private rushLost = false;
  private rushSize = 0;
  /** Boss night state: dishes served and still owed, his next trick, a hurry spell. */
  private bossServed = 0;
  private bossTotal = 0;
  private nextMoveAt = 0;
  private hurryUntil = 0;
  private sendBackNext = false;
  private sentBack: Order | null = null;

  constructor(opts: ShiftEngineOptions) {
    this.config = opts.config;
    this.cap = opts.maxCustomersCap ?? 4;
    this.houseOrders = opts.houseOrders ?? true;
    this.pace = opts.pace ?? 'rush';
    this.rng = opts.rng ?? mulberry32(Date.now() >>> 0);
    this.generator = new OrderGenerator(this.rng, opts.focus, opts.vocabulary);
    if (this.config.boss) {
      this.bossTotal = this.config.boss.dishes;
      this.nextMoveAt = this.config.boss.moveEveryMs;
    }
  }

  /** The boss, once he has sat down. */
  get boss(): CustomerState | undefined {
    return this.activeCustomers.find((c) => c.special === 'boss');
  }

  /** Dishes the boss still wants, and how many he has asked for in all. */
  get bossAppetite(): { left: number; total: number } {
    return { left: this.bossTotal - this.bossServed, total: this.bossTotal };
  }

  get isOver(): boolean {
    return this.over;
  }

  get activeCustomers(): ReadonlyArray<CustomerState> {
    return this.customers.filter((c) => !c.resolved);
  }

  /** The order of any customer seen this shift, served or not. */
  orderOf(customerId: number): CustomerState['order'] | undefined {
    return this.customers.find((c) => c.id === customerId)?.order;
  }

  /** Customers with an order to type (a diner between courses has none). */
  private get typableCustomers(): CustomerState[] {
    return this.activeCustomers.filter((c) => !c.eatingMs);
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
    const params = paramsAt(this.config, this.elapsed, this.pace);
    // The shift bell rings the instant the (finite) timer expires; Overtime
    // (durationMs = Infinity) never reaches time-up and ends only on strikes.
    const timeUp = Number.isFinite(this.config.durationMs) && this.elapsed >= this.config.durationMs;

    const rushAt = this.config.specials?.rushAtMs ?? [];
    if (!timeUp && this.rushIndex < rushAt.length && this.elapsed >= rushAt[this.rushIndex]) {
      this.rushIndex += 1;
      if (this.rushLeft === 0) this.startRush();
    }

    const bossDef = this.config.boss;
    if (bossDef && !this.customers.some((c) => c.special === 'boss') && this.elapsed >= FIRST_SPAWN_MS) {
      this.spawnBoss(params);
      this.spawnAt = this.elapsed + params.spawnIntervalMs;
    }
    if (bossDef && this.boss && this.elapsed >= this.nextMoveAt) {
      this.nextMoveAt = this.elapsed + bossDef.moveEveryMs;
      this.bossMove(bossDef.moves[Math.floor(this.rng() * bossDef.moves.length)]);
    }

    // During a rush every free seat fills fast; otherwise the shift's pacing.
    const seats = this.rushLeft > 0 ? this.cap : Math.min(params.maxCustomers, this.cap);
    const spawnOk = !bossDef || this.customers.some((c) => c.special === 'boss');
    if (!timeUp && spawnOk && this.elapsed >= this.spawnAt && this.activeCustomers.length < seats) {
      this.spawn(params);
      this.spawnAt = this.elapsed + (this.rushLeft > 0 ? RUSH_SPAWN_MS : params.spawnIntervalMs);
    }

    for (const c of this.activeCustomers) {
      if (c.eatingMs) {
        c.eatingMs = Math.max(0, c.eatingMs - dtMs);
        if (c.eatingMs === 0) {
          if (c.special === 'boss') this.orderBossDish(c);
          else this.orderNextCourse(c, params);
        }
        continue;
      }
      // A boss in a hurry loses his temper twice as fast.
      c.patienceMs -= c.special === 'boss' && this.elapsed < this.hurryUntil ? dtMs * 2 : dtMs;
      if (c.patienceMs <= 0) {
        c.patienceMs = 0;
        c.resolved = true;
        this.typing.release(c.id);
        this.strikes += 1;
        this.cleanStreak = 0;
        if (c.special === 'rush') this.rushLost = true;
        this.events.emit('customerLeft', { customerId: c.id, strikes: this.strikes });
        // The boss storming out ends the night at once.
        if (this.strikes >= MAX_STRIKES || c.special === 'boss') return this.end(false);
        this.checkRushOver();
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

  /** Typed so far on a customer's order (kept while the player works elsewhere). */
  progressOf(customerId: number): number {
    return this.typing.progressOf(customerId);
  }

  /** Switch to a customer's order, e.g. by tapping them; what was typed on it is kept. */
  selectCustomer(customerId: number): void {
    if (this.over) return;
    const c = this.typableCustomers.find((x) => x.id === customerId);
    const previous = this.typing.locked;
    if (!c || previous === customerId) return;
    if (previous !== null) this.events.emit('orderReleased', { customerId: previous });
    this.typing.select(customerId);
    if (!this.lockedAt.has(customerId)) this.lockedAt.set(customerId, this.elapsed);
    this.events.emit('orderLocked', { customerId });
  }

  /** Let go of the current order without losing its progress. */
  releaseLock(): void {
    const previous = this.typing.locked;
    if (previous === null) return;
    this.typing.unlock();
    this.events.emit('orderReleased', { customerId: previous });
  }

  handleKey(char: string): void {
    if (this.over) return;
    const orders = this.typableCustomers.map((c) => ({ id: c.id, normalized: c.order.normalized, exact: c.order.exact }));
    const res = this.typing.handleKey(char, orders);
    this.tallyKey(res);
    switch (res.kind) {
      case 'ignored':
        return;
      case 'locked':
        this.correctChars += 1;
        if (!this.lockedAt.has(res.customerId)) this.lockedAt.set(res.customerId, this.elapsed);
        this.events.emit('orderLocked', { customerId: res.customerId });
        return;
      case 'progress':
        this.correctChars += 1;
        this.events.emit('orderProgress', { customerId: res.customerId, typedCount: res.typedCount });
        this.maybeChangeMind(res.customerId);
        return;
      case 'wordCompleted':
        this.correctChars += 1;
        this.events.emit('wordCompleted', { customerId: res.customerId, wordIndex: res.wordIndex });
        this.maybeChangeMind(res.customerId);
        return;
      case 'completed':
        this.correctChars += 1;
        this.serve(res.customerId, res.finalWordIndex);
        return;
      case 'mistake':
        this.mistakes += 1;
        this.cleanStreak = 0;
        if (this.config.boss && this.boss && (res.customerId === null || res.customerId === this.boss.id)) {
          this.boss.patienceMs = Math.max(1, this.boss.patienceMs - this.config.boss.mistakeMs);
        }
        this.events.emit('mistake', { customerId: res.customerId });
        return;
    }
  }

  /** Tally the keystroke against the letter the locked order expected. */
  private tallyKey(res: ReturnType<TypingEngine['handleKey']>): void {
    if (res.kind === 'ignored' || res.customerId === null) return;
    const text = this.customers.find((c) => c.id === res.customerId)?.order.normalized;
    if (!text) return;
    if (res.kind === 'mistake') recordKey(this.tally, text, this.typing.typedCount, false);
    else if (res.kind === 'locked') recordKey(this.tally, text, 0, true);
    else if (res.kind === 'completed') recordKey(this.tally, text, text.length - 1, true);
    else recordKey(this.tally, text, res.typedCount - 1, true);
  }

  private usedFirstLetters(): Set<string> {
    return new Set(this.typableCustomers.map((c) => c.order.normalized[0].toLowerCase()));
  }

  private startRush(): void {
    this.rushLeft = RUSH_SIZE;
    this.rushSize = RUSH_SIZE;
    this.rushLost = false;
    this.spawnAt = this.elapsed;
    this.events.emit('rushStarted', { count: RUSH_SIZE });
  }

  /** When the last rush customer is gone, pay the bonus if none walked out. */
  private checkRushOver(): void {
    if (this.rushSize === 0 || this.rushLeft > 0) return;
    if (this.activeCustomers.some((c) => c.special === 'rush')) return;
    const cleared = !this.rushLost;
    const bonus = cleared ? RUSH_BONUS_PER_ORDER * this.rushSize : 0;
    this.score += bonus;
    this.rushSize = 0;
    this.events.emit('rushEnded', { cleared, bonus });
  }

  /** A fickle customer, half-typed, changes their order: typing starts over but patience refills. */
  private maybeChangeMind(customerId: number): void {
    const c = this.typableCustomers.find((x) => x.id === customerId);
    if (!c || c.special !== 'fickle' || c.changed) return;
    if (this.typing.progressOf(c.id) < Math.ceil(c.order.normalized.length * FICKLE_AT)) return;
    const others = new Set(
      this.typableCustomers.filter((x) => x.id !== c.id).map((x) => x.order.normalized[0].toLowerCase()),
    );
    const params = paramsAt(this.config, this.elapsed, this.pace);
    let order = c.order;
    for (let i = 0; i < 10 && order.text === c.order.text; i++) {
      order = this.generator.next({ ...params.order, houseChance: 0, countChance: 0 }, others);
    }
    c.order = order;
    c.changed = true;
    this.typing.resetProgress(c.id);
    c.patienceTotalMs = orderPatienceMs(params.patienceMs, order.normalized.length, this.pace);
    c.patienceMs = c.patienceTotalMs;
    this.events.emit('orderChanged', { customer: c });
  }

  /** A diner done with a course orders coffee or dessert. */
  private orderNextCourse(c: CustomerState, params: LiveParams): void {
    const vocab = this.generator.vocabulary;
    c.order = this.generator.nextFrom(vocab.followUps, 1, this.usedFirstLetters());
    c.patienceTotalMs = orderPatienceMs(params.patienceMs, c.order.normalized.length, this.pace);
    c.patienceMs = c.patienceTotalMs;
    this.events.emit('nextCourse', { customer: c });
  }

  /** The boss takes the centre seat. */
  private spawnBoss(params: LiveParams): void {
    const def = this.config.boss!;
    const customer: CustomerState = {
      id: this.nextId++,
      slot: Math.floor((this.cap - 1) / 2),
      order: this.bossOrder(),
      patienceTotalMs: def.patienceMs,
      patienceMs: def.patienceMs,
      resolved: false,
      special: 'boss',
    };
    void params;
    this.customers.push(customer);
    this.events.emit('customerArrived', { customer });
    this.events.emit('bossAppetite', this.bossAppetite);
  }

  /** His next dish: harder as he works through his appetite. */
  private bossOrder(): Order {
    const def = this.config.boss!;
    const t = this.bossTotal > 1 ? Math.min(1, this.bossServed / (this.bossTotal - 1)) : 1;
    const others = new Set(
      this.typableCustomers.filter((x) => x.special !== 'boss').map((x) => x.order.normalized[0].toLowerCase()),
    );
    return this.generator.next({
      tierWeights: mixTiers(def.menu.start, def.menu.end, t),
      wordsPerOrder: lerp(def.menu.wordsPerOrder.start, def.menu.wordsPerOrder.end, t),
      countChance: 0,
      houseChance: this.houseOrders ? def.menu.houseChance : 0,
    }, others);
  }

  private orderBossDish(c: CustomerState): void {
    c.order = this.sentBack ?? this.bossOrder();
    this.sentBack = null;
    this.events.emit('nextCourse', { customer: c });
  }

  private bossMove(kind: BossMove): void {
    const boss = this.boss!;
    if (kind === 'seconds') {
      this.bossTotal += 1;
      this.events.emit('bossAppetite', this.bossAppetite);
    } else if (kind === 'hurry') {
      this.hurryUntil = this.elapsed + 5000;
    } else if (kind === 'sendBack') {
      this.sendBackNext = true;
    }
    this.events.emit('bossMove', { kind, customerId: boss.id });
  }

  /** A dish lands in front of the boss. */
  private serveBoss(c: CustomerState): void {
    const def = this.config.boss!;
    if (this.sendBackNext) {
      // "Too cold!": the same dish comes straight back, typing starts over.
      this.sendBackNext = false;
      this.sentBack = c.order;
      this.bossTotal += 1;
      this.events.emit('bossAppetite', this.bossAppetite);
    }
    this.bossServed += 1;
    c.patienceMs = Math.min(c.patienceTotalMs, c.patienceMs + def.calmMs);
    this.events.emit('bossAppetite', this.bossAppetite);
    if (this.bossServed >= this.bossTotal) {
      c.resolved = true;
      this.score += def.bonus;
      this.end(true);
      return;
    }
    c.eatingMs = 900;
  }

  private spawn(params: LiveParams): void {
    const usedLetters = this.usedFirstLetters();
    const orderParams = this.houseOrders ? params.order : { ...params.order, houseChance: 0 };
    const rush = this.rushLeft > 0;
    const order = rush
      ? this.generator.nextFrom(this.generator.vocabulary.rushDrinks, 1, usedLetters)
      : this.generator.next(orderParams, usedLetters);
    if (rush) this.rushLeft -= 1;
    // Pick a random free slot (not always the leftmost) so a lone customer
    // isn't always parked at the same seat.
    const usedSlots = new Set(this.activeCustomers.map((c) => c.slot));
    const freeSlots = [];
    for (let s = 0; s < this.cap; s++) if (!usedSlots.has(s)) freeSlots.push(s);
    const slot = freeSlots.length > 0
      ? freeSlots[Math.floor(this.rng() * freeSlots.length)]
      : this.customers.length; // fallback: never reached while active < cap
    const patience = orderPatienceMs(params.patienceMs, order.normalized.length, this.pace);
    const customer: CustomerState = {
      id: this.nextId++,
      slot,
      order,
      patienceTotalMs: patience,
      patienceMs: patience,
      resolved: false,
    };
    const specials = this.config.specials;
    if (rush) customer.special = 'rush';
    else if (specials && !order.fingers && !order.exact) {
      const r = this.rng();
      if (r < specials.fickle) {
        customer.special = 'fickle';
      } else if (r < specials.fickle + specials.courses) {
        customer.special = 'diner';
        customer.courses = 1 + (this.rng() < 0.3 ? 1 : 0);
      }
    }
    this.customers.push(customer);
    this.events.emit('customerArrived', { customer });
  }

  private serve(customerId: number, finalWordIndex: number): void {
    const c = this.customers.find((x) => x.id === customerId);
    if (!c || c.resolved) return;
    this.served += 1;
    // A changed mind pays extra, as does every course after the first.
    const later = c.special === 'diner' && c.eatingMs === 0;
    const bonus = c.special === 'fickle' && c.changed ? CUSTOMER_BONUS.fickle : later ? CUSTOMER_BONUS.course : 1;
    const patienceLeft = c.patienceMs / c.patienceTotalMs;
    const tip = orderTip(c.order, patienceLeft, this.cleanStreak, bonus);
    this.score += tip;
    this.cleanStreak += 1;
    this.bestCombo = Math.max(this.bestCombo, this.cleanStreak);
    this.timeOrder(c);
    if (c.special === 'boss') {
      this.events.emit('orderServed', { customerId, tip, finalWordIndex, patienceLeft, stays: true });
      this.serveBoss(c);
      return;
    }
    const stays = c.special === 'diner' && (c.courses ?? 0) > 0;
    if (stays) {
      c.courses! -= 1;
      c.eatingMs = EATING_MS;
    } else {
      c.resolved = true;
    }
    this.events.emit('orderServed', { customerId, tip, finalWordIndex, patienceLeft, stays });
    if (c.special === 'rush') this.checkRushOver();
  }

  /** Track the quickest and slowest order by typing speed, lock-on to serve. */
  private timeOrder(c: CustomerState): void {
    const start = this.lockedAt.get(c.id);
    this.lockedAt.delete(c.id);
    if (start === undefined) return;
    const ms = Math.max(this.elapsed - start, 1);
    const timing: OrderTiming = { text: c.order.text, ms, wpm: c.order.text.length / 5 / (ms / 60_000) };
    if (!this.fastest || timing.wpm > this.fastest.wpm) this.fastest = timing;
    if (!this.slowest || timing.wpm < this.slowest.wpm) this.slowest = timing;
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
      pace: this.pace,
      tally: this.tally,
      fastest: this.fastest,
      slowest: this.slowest,
    };
    this.events.emit('shiftEnded', { result });
  }
}
