// A language's menu: the word pools orders are drawn from, plus the grammar
// for putting a weird dish or a counted special together.
import {
  COUNT_WORDS, COUNTABLE, DISH_FORMS, HOUSE_ORDERS, INGREDIENTS, PREPARATIONS, TIER1, TIER2,
} from './vocabulary';
import { FRENCH } from './vocabularyFr';

export type Lang = 'en' | 'fr';

/** Draws one entry from a pool (the generator weights it toward rare letters and weak keys). */
export type Draw = (pool: readonly string[]) => string;

export interface Dish {
  /** Typed words, in order */
  words: string[];
  /** Words subject to the freshness window (skips "de", count words and the like) */
  fresh: string[];
}

export interface Vocabulary {
  lang: Lang;
  /** Plain menu items, single words */
  tier1: readonly string[];
  /** Specials, may contain spaces */
  tier2: readonly string[];
  /** Capitals and punctuation, typed exactly */
  house: readonly string[];
  /** A weird tier-3 dish of 1–3 content words */
  weird(count: number, draw: Draw): Dish;
  /** How many things the Finger-Counter can order (1..n) */
  maxCount: number;
  /** A Finger-Counter special: the count word first, then the dish */
  counted(fingers: number, draw: Draw): Dish;
}

const COUNTABLE_NAMES = COUNTABLE.map(([one]) => one);

export const ENGLISH: Vocabulary = {
  lang: 'en',
  tier1: TIER1,
  tier2: TIER2,
  house: HOUSE_ORDERS,
  weird(count, draw) {
    const words =
      count <= 1 ? [draw(DISH_FORMS)]
        : count === 2 ? [draw(INGREDIENTS), draw(DISH_FORMS)]
          : [draw(PREPARATIONS), draw(INGREDIENTS), draw(DISH_FORMS)];
    return { words, fresh: words };
  },
  maxCount: COUNT_WORDS.length,
  counted(fingers, draw) {
    const one = draw(COUNTABLE_NAMES);
    const [, many] = COUNTABLE.find(([o]) => o === one)!;
    const dish = fingers === 1 ? one : many;
    return { words: [COUNT_WORDS[fingers - 1], dish], fresh: [dish] };
  },
};

export const VOCABULARIES: Readonly<Record<Lang, Vocabulary>> = { en: ENGLISH, fr: FRENCH };

export const LANG_LABELS: Readonly<Record<Lang, string>> = { en: 'English', fr: 'Français' };
