import { pick, type Rng } from './rng';
import { normalizeText } from './text';
import { DISH_FORMS, INGREDIENTS, PREPARATIONS, TIER1, TIER2 } from './vocabulary';
import type { Order, OrderParams, TierWeights } from './types';

/** Pool words are not reused while inside this many recent uses. */
const RECENT_CAP = 50;
/** Attempts before relaxing the freshness constraint, then the letter constraint. */
const FRESH_ATTEMPTS = 60;
const MAX_ATTEMPTS = 80;

export class OrderGenerator {
  private recent: string[] = [];

  constructor(private rng: Rng) {}

  /**
   * Generate the next order. The order's first (normalized) letter will not be
   * in `excludeFirstLetters` — guaranteeing unambiguous lock-on — unless the
   * constraints are unsatisfiable after MAX_ATTEMPTS (practically unreachable
   * with <=4 concurrent customers).
   */
  next(params: OrderParams, excludeFirstLetters: ReadonlySet<string>): Order {
    let words: string[] = [];
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      words = this.candidate(params);
      const first = normalizeText(words[0])[0];
      const fresh = !words.some((w) => this.recent.includes(w));
      if (!excludeFirstLetters.has(first) && (fresh || attempt >= FRESH_ATTEMPTS)) break;
    }
    for (const w of words) this.markUsed(w);
    const text = words.join(' ');
    return { words, text, normalized: normalizeText(text) };
  }

  private candidate(params: OrderParams): string[] {
    const tier = this.pickTier(params.tierWeights);
    if (tier === 1) return [pick(this.rng, TIER1)];
    if (tier === 2) return pick(this.rng, TIER2).split(' ');
    const count = this.resolveCount(params.wordsPerOrder);
    if (count <= 1) return [pick(this.rng, DISH_FORMS)];
    if (count === 2) return [pick(this.rng, INGREDIENTS), pick(this.rng, DISH_FORMS)];
    return [pick(this.rng, PREPARATIONS), pick(this.rng, INGREDIENTS), pick(this.rng, DISH_FORMS)];
  }

  private pickTier(w: TierWeights): 1 | 2 | 3 {
    const total = w.t1 + w.t2 + w.t3;
    const r = this.rng() * total;
    if (r < w.t1) return 1;
    if (r < w.t1 + w.t2) return 2;
    return 3;
  }

  /** 1.4 -> 1 (60%) or 2 (40%); clamped to [1, 3]. */
  private resolveCount(n: number): number {
    const base = Math.floor(n);
    const c = base + (this.rng() < n - base ? 1 : 0);
    return Math.max(1, Math.min(3, c));
  }

  private markUsed(word: string): void {
    this.recent.push(word);
    if (this.recent.length > RECENT_CAP) this.recent.shift();
  }
}
