import { pick, type Rng } from './rng';
import { normalizeText, stripAccents } from './text';
import { COUNT_WORDS, COUNTABLE, DISH_FORMS, HOUSE_ORDERS, INGREDIENTS, PREPARATIONS, TIER1, TIER2 } from './vocabulary';
import type { Order, OrderParams, TierWeights } from './types';

/** Pool words are not reused while inside this many recent uses. */
const RECENT_CAP = 50;
/** Attempts before the freshness (recent-words) constraint is dropped. */
const FRESH_ATTEMPTS = 60;
const MAX_ATTEMPTS = 80;

/**
 * Extra pick weight a word earns for each rare letter in it, so x, z, q, j,
 * k and v come up far more often than they would in plain English.
 */
export const RARE_LETTER_BOOST: Readonly<Record<string, number>> = { x: 1.5, z: 1, q: 1, j: 1, k: 0.5, v: 0.5 };

/**
 * Practice focus: extra pick weight per letter or letter pair (e.g. from the
 * keys the player missed most last shift). A word gets the boost once for
 * each focus key it contains.
 */
export type Focus = Readonly<Record<string, number>>;

interface Draft {
  words: string[];
  tier: 1 | 2 | 3;
  fingers?: number;
  exact?: boolean;
}

export class OrderGenerator {
  private recent: string[] = [];
  private readonly weights = new Map<readonly string[], number[]>();

  constructor(
    private rng: Rng,
    private focus: Focus = {},
  ) {}

  /**
   * Generate the next order. The order's first (normalized) letter will not be
   * in `excludeFirstLetters` — guaranteeing unambiguous lock-on — unless this
   * first-letter constraint (checked every attempt, never relaxed) remains
   * unsatisfiable after MAX_ATTEMPTS (practically unreachable with <=4
   * concurrent customers).
   */
  next(params: OrderParams, excludeFirstLetters: ReadonlySet<string>): Order {
    let draft: Draft = { words: [], tier: 1 };
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      draft = this.candidate(params);
      const first = normalizeText(draft.words[0])[0];
      const fresh = !poolWords(draft).some((w) => this.recent.includes(w));
      const repeats = !draft.exact && new Set(draft.words).size < draft.words.length;
      if (!excludeFirstLetters.has(first) && !repeats && (fresh || attempt >= FRESH_ATTEMPTS)) break;
    }
    for (const w of poolWords(draft)) this.markUsed(w);
    const text = draft.words.join(' ');
    const normalized = draft.exact ? stripAccents(text) : normalizeText(text);
    const order: Order = { words: draft.words, text, normalized, tier: draft.tier };
    if (draft.fingers) order.fingers = draft.fingers;
    if (draft.exact) order.exact = true;
    return order;
  }

  private candidate(params: OrderParams): Draft {
    if (this.rng() < (params.houseChance ?? 0)) {
      return { words: this.draw(HOUSE_ORDERS).split(' '), tier: 2, exact: true };
    }
    const tier = this.pickTier(params.tierWeights);
    if (tier !== 3 && this.rng() < (params.countChance ?? 0)) {
      const fingers = 1 + Math.floor(this.rng() * COUNT_WORDS.length);
      const [one, many] = pick(this.rng, COUNTABLE);
      return { words: [COUNT_WORDS[fingers - 1], fingers === 1 ? one : many], tier, fingers };
    }
    if (tier === 1) return { words: [this.draw(TIER1)], tier };
    if (tier === 2) return { words: this.draw(TIER2).split(' '), tier };
    const count = this.resolveCount(params.wordsPerOrder);
    if (count <= 1) return { words: [this.draw(DISH_FORMS)], tier };
    if (count === 2) return { words: [this.draw(INGREDIENTS), this.draw(DISH_FORMS)], tier };
    return { words: [this.draw(PREPARATIONS), this.draw(INGREDIENTS), this.draw(DISH_FORMS)], tier };
  }

  /** Weighted pick favouring rare letters and the practice focus. */
  private draw(pool: readonly string[]): string {
    let cumulative = this.weights.get(pool);
    if (!cumulative) {
      let total = 0;
      cumulative = pool.map((entry) => (total += wordWeight(entry, this.focus)));
      this.weights.set(pool, cumulative);
    }
    const r = this.rng() * cumulative[cumulative.length - 1];
    const i = cumulative.findIndex((c) => r < c);
    return pool[i < 0 ? pool.length - 1 : i];
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

/** Pick weight of a pool entry: 1, plus each rare letter's and focus key's boost. */
export function wordWeight(entry: string, focus: Focus = {}): number {
  const text = normalizeText(entry);
  let w = 1;
  for (const letter of new Set(text)) w += RARE_LETTER_BOOST[letter] ?? 0;
  for (const [key, boost] of Object.entries(focus)) if (text.includes(key)) w += boost;
  return w;
}

/**
 * Words subject to the freshness window; a special's count word repeats
 * freely, and a house order counts as one entry.
 */
function poolWords(draft: Draft): string[] {
  if (draft.exact) return [draft.words.join(' ')];
  return draft.fingers ? draft.words.slice(1) : draft.words;
}
