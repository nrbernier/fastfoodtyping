// Which drawing comes out of the kitchen for an order: an everyday dish or
// drink picked from the order's words, or for a weird tier-3 dish the silver
// cloche with smoke coloured by its first word.
import type { Order } from '../core/types';
import { normalizeText } from '../core/text';
import type { DishKind, SmokeColor } from './dishArt';

export type Serving = { kind: 'dish'; dish: DishKind } | { kind: 'mystery'; smoke: SmokeColor };

/** Two-word names checked before single words ("sloppy joe" is a burger, "cup of joe" a coffee). */
const PHRASES: ReadonlyArray<readonly [string, DishKind]> = [
  ['beer float', 'shake'], ['sloppy joe', 'burger'], ['hot dog', 'burger'], ['chili dog', 'burger'], ['corn dog', 'burger'],
  ['foot long', 'burger'], ['hash browns', 'fries'], ['home fries', 'fries'], ['onion rings', 'fries'],
  ['tater tots', 'fries'], ['french toast', 'stack'], ['cinnamon toast', 'stack'], ['texas toast', 'stack'],
  ['grilled cheese', 'sandwich'], ['po boy', 'sandwich'], ['french dip', 'sandwich'], ['monte cristo', 'sandwich'],
  ['ice cream', 'sundae'], ['frozen yogurt', 'sundae'], ['rocky road', 'sundae'], ['butter pecan', 'sundae'],
  ['baked alaska', 'sundae'], ['banana split', 'sundae'], ['egg cream', 'shake'], ['root beer', 'soda'],
  ['birch beer', 'soda'], ['ginger ale', 'soda'], ['iced tea', 'soda'], ['sweet tea', 'soda'],
  ['hot cocoa', 'coffee'], ['hot chocolate', 'coffee'], ['cup of joe', 'coffee'], ['lemon meringue', 'pie'], ['whipped cream', 'sundae'], ['swiss steak', 'dinner'],
];

const WORDS: Readonly<Record<DishKind, readonly string[]>> = {
  burger: ['burger', 'burgers', 'melt', 'melts', 'patty', 'slider', 'sliders', 'frank', 'wiener', 'brats', 'kebab', 'kebabs', 'kabobs'],
  fries: ['fries', 'rings', 'tots', 'chips', 'nachos'],
  eggs: ['egg', 'eggs', 'bacon', 'ham', 'hash', 'omelet', 'omelette', 'sausage', 'links', 'scrapple', 'kipper', 'lox', 'benedict', 'rancheros', 'quiche'],
  stack: ['pancake', 'pancakes', 'waffle', 'waffles', 'flapjacks', 'toast', 'crepe', 'crepes', 'blintzes', 'biscuit', 'biscuits', 'syrup', 'honey', 'butter', 'jam', 'jelly', 'bran'],
  pie: ['pie', 'pies', 'cobbler', 'strudel', 'crumble', 'cake', 'cheesecake', 'shortcake', 'tart', 'brownie', 'brownies', 'eclair', 'eclairs', 'cupcake', 'cupcakes', 'cookie', 'cookies', 'donut', 'donuts', 'muffin', 'muffins', 'scone', 'bagel', 'roll', 'meringue', 'turnovers', 'knish', 'pretzel', 'brioche'],
  bowl: ['soup', 'chili', 'chowder', 'gumbo', 'stew', 'bisque', 'broth', 'oatmeal', 'porridge', 'grits', 'beans', 'rice', 'salad', 'slaw', 'pudding', 'tapioca', 'custard', 'greens', 'goulash', 'cereal', 'granola', 'yogurt',
    // a fruit cup
    'cherry', 'peach', 'banana', 'kiwi', 'melon', 'berries', 'figs', 'prunes', 'raisins', 'apricot', 'quince', 'kumquat'],
  sandwich: ['sandwich', 'club', 'sub', 'hoagie', 'blt', 'cheesesteak', 'pastrami', 'panini', 'wrap', 'wraps', 'bologna', 'liverwurst', 'reuben', 'rye'],
  dinner: [],
  sundae: ['sundae', 'sundaes', 'split', 'parfait', 'sorbet', 'sherbet', 'cone', 'jubilee', 'melba', 'jello', 'mode', 'fudge', 'taffy', 'icing', 'sprinkle', 'jimmies', 'vanilla', 'pecans', 'almonds'],
  shake: ['malt', 'malts', 'shake', 'shakes', 'float', 'floats', 'smoothie', 'frappe', 'whip'],
  soda: ['soda', 'sodas', 'cola', 'colas', 'coke', 'juice', 'lemonade', 'punch', 'cider', 'seltzer', 'rickey', 'phosphate', 'crush', 'cooler', 'tonic', 'fizz', 'milk', 'oj', 'eggnog', 'pulp', 'kefir', 'ginger'],
  coffee: ['coffee', 'coffees', 'cocoa', 'java', 'joe', 'tea', 'mocha', 'latte', 'espresso', 'decaf', 'sugars'],
};

const BY_WORD = new Map<string, DishKind>();
for (const [kind, words] of Object.entries(WORDS) as [DishKind, readonly string[]][]) {
  for (const w of words) BY_WORD.set(w, kind);
}

/** Smoke for the cloche, by the mood of the weird dish's first word. */
const SMOKE_WORDS: Readonly<Record<SmokeColor, readonly string[]>> = {
  green: ['pickled', 'radioactive', 'irradiated', 'fermented', 'zesty', 'tangy', 'herbed', 'sentient', 'slimy', 'queasy', 'nauseous', 'kelp', 'seaweed', 'kale', 'cactus', 'wasabi', 'pickle', 'okra'],
  purple: ['haunted', 'hypnotized', 'mummified', 'mysterious', 'levitating', 'enchanted', 'celestial', 'mythic', 'gothic', 'evil', 'vampiric', 'zombified', 'ominous', 'brooding', 'cursed', 'lavender', 'moonbeam', 'unicorn', 'stardust'],
  orange: ['scorched', 'charred', 'blackened', 'blazing', 'spicy', 'curried', 'spiced', 'volcanic', 'sizzling', 'smoked', 'roasted', 'seared', 'exploding', 'turbocharged', 'fierce', 'jalapeno', 'saffron', 'pumpkin', 'papaya', 'mango'],
  pink: ['candied', 'frosted', 'sugared', 'glazed', 'whipped', 'sparkling', 'jazzy', 'dazzling', 'glitzy', 'fizzy', 'velvety', 'bubblegum', 'marshmallow', 'dragonfruit', 'rhubarb', 'watermelon', 'lychee'],
  blue: ['frozen', 'iced', 'icy', 'steamed', 'poached', 'lukewarm', 'translucent', 'shimmering', 'squeaky', 'liquid', 'quantum', 'magnetized', 'orbiting', 'stormy', 'blizzard', 'meteor', 'squid', 'octopus', 'eel', 'huckleberry'],
};
const SMOKE_BY_WORD = new Map<string, SmokeColor>();
for (const [color, words] of Object.entries(SMOKE_WORDS) as [SmokeColor, readonly string[]][]) {
  for (const w of words) SMOKE_BY_WORD.set(w, color);
}
const SMOKE_ORDER: SmokeColor[] = ['green', 'purple', 'orange', 'pink', 'blue'];

function hash(s: string): number {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

/** Order words, lowercased with accents and punctuation stripped. */
function plainWords(order: Pick<Order, 'text'>): string[] {
  return normalizeText(order.text).replace(/[^a-z ]/g, ' ').split(/\s+/).filter(Boolean);
}

export function servingFor(order: Pick<Order, 'text' | 'tier' | 'exact'>): Serving {
  const words = plainWords(order);
  if (order.tier === 3 && !order.exact) {
    const smoke = words.map((w) => SMOKE_BY_WORD.get(w)).find(Boolean);
    return { kind: 'mystery', smoke: smoke ?? SMOKE_ORDER[hash(words[0] ?? '') % SMOKE_ORDER.length] };
  }
  const text = words.join(' ');
  for (const [phrase, dish] of PHRASES) if (text.includes(phrase)) return { kind: 'dish', dish };
  // The dish is usually named last ("apple pie", "root beer float"), so read from the end.
  for (let i = words.length - 1; i >= 0; i--) {
    const dish = BY_WORD.get(words[i]);
    if (dish) return { kind: 'dish', dish };
  }
  return { kind: 'dish', dish: 'dinner' };
}
