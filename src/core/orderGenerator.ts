import { pick, type Rng } from './rng';
import { normalizeText } from './text';
import { COUNT_WORDS, COUNTABLE, DISH_FORMS, INGREDIENTS, PREPARATIONS, TIER1, TIER2 } from './vocabulary';
import type { Order, OrderParams, TierWeights } from './types';

/** Pool words are not reused while inside this many recent uses. */
const RECENT_CAP = 50;
/** Attempts before the freshness (recent-words) constraint is dropped. */
const FRESH_ATTEMPTS = 60;
const MAX_ATTEMPTS = 80;

interface Draft {
  words: string[];
  tier: 1 | 2 | 3;
  fingers?: number;
}

export class OrderGenerator {
  private recent: string[] = [];

  constructor(private rng: Rng) {}

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
      if (!excludeFirstLetters.has(first) && (fresh || attempt >= FRESH_ATTEMPTS)) break;
    }
    for (const w of poolWords(draft)) this.markUsed(w);
    const text = draft.words.join(' ');
    const order: Order = { words: draft.words, text, normalized: normalizeText(text), tier: draft.tier };
    if (draft.fingers) order.fingers = draft.fingers;
    return order;
  }

  private candidate(params: OrderParams): Draft {
    const tier = this.pickTier(params.tierWeights);
    if (tier !== 3 && this.rng() < (params.countChance ?? 0)) {
      const fingers = 1 + Math.floor(this.rng() * COUNT_WORDS.length);
      const [one, many] = pick(this.rng, COUNTABLE);
      return { words: [COUNT_WORDS[fingers - 1], fingers === 1 ? one : many], tier, fingers };
    }
    if (tier === 1) return { words: [pick(this.rng, TIER1)], tier };
    if (tier === 2) return { words: pick(this.rng, TIER2).split(' '), tier };
    const count = this.resolveCount(params.wordsPerOrder);
    if (count <= 1) return { words: [pick(this.rng, DISH_FORMS)], tier };
    if (count === 2) return { words: [pick(this.rng, INGREDIENTS), pick(this.rng, DISH_FORMS)], tier };
    return { words: [pick(this.rng, PREPARATIONS), pick(this.rng, INGREDIENTS), pick(this.rng, DISH_FORMS)], tier };
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

/** Words subject to the freshness window; a special's count word repeats freely. */
function poolWords(draft: Draft): string[] {
  return draft.fingers ? draft.words.slice(1) : draft.words;
}
