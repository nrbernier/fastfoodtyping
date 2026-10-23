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
  /** What a diner who stays on orders next: coffee, tea, dessert */
  followUps: readonly string[];
  /** Short drinks for a rush, with plenty of different first letters */
  rushDrinks: readonly string[];
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
  followUps: [
    'coffee', 'pie', 'sundae', 'tea', 'cocoa', 'malt', 'donut', 'cake', 'jello', 'float', 'cobbler', 'cookie',
    'brownie', 'eclair', 'fudge', 'sherbet', 'custard', 'pudding', 'mocha', 'latte', 'espresso', 'cheesecake',
    'apple pie', 'cherry pie', 'pecan pie', 'hot cocoa', 'black coffee', 'banana split', 'rice pudding',
    'key lime pie', 'iced tea', 'vanilla shake',
  ],
  rushDrinks: [
    'coffee', 'tea', 'cola', 'soda', 'malt', 'juice', 'milk', 'cocoa', 'latte', 'mocha', 'shake', 'float',
    'punch', 'cider', 'java', 'joe', 'seltzer', 'tonic', 'frappe', 'lemonade', 'eggnog', 'kefir', 'water',
    'refill', 'iced tea', 'root beer', 'decaf', 'espresso', 'ginger ale', 'orange juice',
  ],
};

export const VOCABULARIES: Readonly<Record<Lang, Vocabulary>> = { en: ENGLISH, fr: FRENCH };

export const LANG_LABELS: Readonly<Record<Lang, string>> = { en: 'English', fr: 'Français' };
