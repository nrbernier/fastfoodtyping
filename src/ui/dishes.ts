// Which drawing comes out of the kitchen for an order: an everyday dish or
// drink picked from the order's words (English or French), or for a weird
// tier-3 dish the silver cloche with smoke coloured by its mood word.
import type { Order } from '../core/types';
import { normalizeText } from '../core/text';
import { FR_ADJECTIVE_PAIRS } from '../core/vocabularyFr';
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

// French names the dish first ("tarte aux pommes"), so French orders are read left to right.
const PHRASES_FR: ReadonlyArray<readonly [string, DishKind]> = [
  ['cafe liegeois', 'sundae'], ['chocolat liegeois', 'sundae'], ['jambon beurre', 'sandwich'], ['hot dog', 'burger'],
  ['double cheese', 'burger'], ['pain au chocolat', 'pie'], ['pain aux raisins', 'pie'], ['pain perdu', 'stack'],
  ['pain de mie', 'stack'], ['petits pois', 'bowl'], ['fromage blanc', 'bowl'], ['orange pressee', 'soda'],
  ['citron presse', 'soda'], ['poire belle', 'sundae'], ['chocolat chaud', 'coffee'], ['chocolat viennois', 'coffee'],
  ['eau gazeuse', 'soda'], ['plat du jour', 'dinner'], ['banana split', 'sundae'], ['dame blanche', 'sundae'],
  ['tit noir', 'coffee'],
];

const WORDS_FR: Readonly<Record<DishKind, readonly string[]>> = {
  burger: ['burger', 'burgers', 'hamburger', 'hamburgers', 'cheeseburger', 'kebab', 'kebabs'],
  fries: ['frites', 'chips', 'nuggets'],
  eggs: ['oeuf', 'oeufs', 'omelette', 'bacon', 'quiche', 'jambon'],
  stack: ['crepe', 'crepes', 'gaufre', 'gaufres', 'pancake', 'pancakes', 'toast', 'toasts', 'tartine', 'tartines', 'galette', 'pain', 'baguette', 'beurre', 'miel', 'confiture'],
  pie: ['tarte', 'tartes', 'gateau', 'cake', 'flan', 'clafoutis', 'eclair', 'eclairs', 'croissant', 'croissants', 'chausson', 'beignet', 'beignets', 'donut', 'donuts', 'muffin', 'muffins', 'cookie', 'cookies', 'biscuit', 'biscuits', 'madeleine', 'madeleines', 'macaron', 'brownie', 'cupcake', 'crumble', 'far', 'baba', 'fondant', 'moelleux', 'financier', 'cannele', 'profiteroles', 'paris', 'kouign', 'sable', 'meringue', 'chou', 'feuillete', 'friand', 'tourte', 'brioche', 'scone', 'bagel'],
  bowl: ['soupe', 'potage', 'veloute', 'bouillon', 'salade', 'puree', 'compote', 'yaourt', 'muesli', 'cereales', 'granola', 'bol', 'riz', 'chili', 'ratatouille', 'carottes', 'haricots', 'lentilles', 'ile', 'mousse', 'creme', 'couscous', 'tajine', 'paella', 'celeri', 'nouilles',
    // une coupe de fruits
    'pomme', 'poire', 'peche', 'prune', 'cerise', 'fraise', 'framboise', 'myrtille', 'banane', 'ananas', 'citron', 'orange', 'melon', 'kiwi', 'kaki', 'figue', 'abricot', 'raisin', 'datte', 'coing', 'kumquat', 'quetsche', 'yuzu'],
  sandwich: ['sandwich', 'sandwichs', 'club', 'panini', 'wrap', 'croque', 'tacos', 'blt'],
  dinner: [],
  sundae: ['glace', 'glaces', 'coupe', 'sundae', 'sorbet', 'melba', 'colonel', 'chantilly', 'praline', 'nougat', 'reglisse', 'guimauve', 'caramel', 'vanille', 'noix', 'noisette', 'amande', 'pistache'],
  shake: ['milkshake', 'milkshakes', 'smoothie', 'lait'],
  soda: ['soda', 'sodas', 'cola', 'coca', 'jus', 'limonade', 'orangeade', 'sirop', 'diabolo', 'eau', 'biere', 'kefir'],
  coffee: ['cafe', 'cafes', 'the', 'chocolat', 'chocolats', 'expresso', 'tisane', 'grand'],
};

function byWord(table: Readonly<Record<DishKind, readonly string[]>>): Map<string, DishKind> {
  const map = new Map<string, DishKind>();
  for (const [kind, words] of Object.entries(table) as [DishKind, readonly string[]][]) {
    for (const w of words) map.set(w, kind);
  }
  return map;
}
const BY_WORD = byWord(WORDS);
const BY_WORD_FR = byWord(WORDS_FR);

/** Smoke for the cloche, by the mood of the weird dish's first word. */
const SMOKE_WORDS: Readonly<Record<SmokeColor, readonly string[]>> = {
  green: ['pickled', 'radioactive', 'irradiated', 'fermented', 'zesty', 'tangy', 'herbed', 'sentient', 'slimy', 'queasy', 'nauseous', 'kelp', 'seaweed', 'kale', 'cactus', 'wasabi', 'pickle', 'okra'],
  purple: ['haunted', 'hypnotized', 'mummified', 'mysterious', 'levitating', 'enchanted', 'celestial', 'mythic', 'gothic', 'evil', 'vampiric', 'zombified', 'ominous', 'brooding', 'cursed', 'lavender', 'moonbeam', 'unicorn', 'stardust'],
  orange: ['scorched', 'charred', 'blackened', 'blazing', 'spicy', 'curried', 'spiced', 'volcanic', 'sizzling', 'smoked', 'roasted', 'seared', 'exploding', 'turbocharged', 'fierce', 'jalapeno', 'saffron', 'pumpkin', 'papaya', 'mango'],
  pink: ['candied', 'frosted', 'sugared', 'glazed', 'whipped', 'sparkling', 'jazzy', 'dazzling', 'glitzy', 'fizzy', 'velvety', 'bubblegum', 'marshmallow', 'dragonfruit', 'rhubarb', 'watermelon', 'lychee'],
  blue: ['frozen', 'iced', 'icy', 'steamed', 'poached', 'lukewarm', 'translucent', 'shimmering', 'squeaky', 'liquid', 'quantum', 'magnetized', 'orbiting', 'stormy', 'blizzard', 'meteor', 'squid', 'octopus', 'eel', 'huckleberry'],
};
/** French adjectives (masculine; feminine and plural forms are added from the vocabulary). */
const SMOKE_WORDS_FR: Readonly<Record<SmokeColor, readonly string[]>> = {
  green: ['fermenté', 'radioactif', 'toxique', 'mariné', 'zesté', 'gélatineux', 'extraterrestre', 'atomique', 'poilu', 'velu'],
  purple: ['hanté', 'hypnotisé', 'momifié', 'mystérieux', 'maudit', 'enchanté', 'céleste', 'gothique', 'maléfique', 'vampirique', 'zombifié', 'ensorcelé', 'lévitant', 'psychédélique', 'cosmique', 'lunaire', 'galactique', 'violet'],
  orange: ['fumé', 'épicé', 'pimenté', 'flambé', 'grillé', 'rôti', 'brûlé', 'carbonisé', 'volcanique', 'explosif', 'braisé', 'doré', 'gratiné', 'frit', 'croustillant', 'électrique'],
  pink: ['confit', 'caramélisé', 'sucré', 'pétillant', 'scintillant', 'mousseux', 'joyeux', 'dansant', 'chantant', 'fondant', 'moelleux', 'exquis', 'luxueux', 'frisé'],
  blue: ['glacé', 'gelé', 'poché', 'tiède', 'translucide', 'quantique', 'magnétique', 'vaporeux', 'gazeux', 'endormi', 'argenté', 'fluorescent'],
};
const FEMININE = new Map(FR_ADJECTIVE_PAIRS);

const SMOKE_BY_WORD = new Map<string, SmokeColor>();
for (const [color, words] of Object.entries(SMOKE_WORDS) as [SmokeColor, readonly string[]][]) {
  for (const w of words) SMOKE_BY_WORD.set(w, color);
}
for (const [color, words] of Object.entries(SMOKE_WORDS_FR) as [SmokeColor, readonly string[]][]) {
  for (const m of words) {
    const f = FEMININE.get(m) ?? m;
    for (const form of [m, f, `${m}s`, `${f}s`]) SMOKE_BY_WORD.set(normalizeText(form), color);
  }
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

export function servingFor(order: Pick<Order, 'text' | 'tier' | 'exact' | 'lang'>): Serving {
  const words = plainWords(order);
  if (order.tier === 3 && !order.exact) {
    const smoke = words.map((w) => SMOKE_BY_WORD.get(w)).find(Boolean);
    return { kind: 'mystery', smoke: smoke ?? SMOKE_ORDER[hash(words[0] ?? '') % SMOKE_ORDER.length] };
  }
  const text = words.join(' ');
  if (order.lang === 'fr') {
    for (const [phrase, dish] of PHRASES_FR) if (text.includes(phrase)) return { kind: 'dish', dish };
    const dish = words.map((w) => BY_WORD_FR.get(w)).find(Boolean);
    return { kind: 'dish', dish: dish ?? 'dinner' };
  }
  for (const [phrase, dish] of PHRASES) if (text.includes(phrase)) return { kind: 'dish', dish };
  // The dish is usually named last ("apple pie", "root beer float"), so read from the end.
  for (let i = words.length - 1; i >= 0; i--) {
    const dish = BY_WORD.get(words[i]);
    if (dish) return { kind: 'dish', dish };
  }
  return { kind: 'dish', dish: 'dinner' };
}
