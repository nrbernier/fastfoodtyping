// French menu. Regular orders use letters (accents optional when typing) and
// spaces only: no hyphens or apostrophes, and "oe" instead of "œ" so every
// word types on any keyboard. House orders keep French punctuation.
import type { Draw, Vocabulary } from './lang';

/** Plats du jour — short, real snack-bar and café words. Single words only. */
export const FR_TIER1: readonly string[] = [
  // comptoir
  'café', 'thé', 'lait', 'soda', 'cola', 'jus', 'sirop', 'limonade', 'chocolat', 'crème',
  'milkshake', 'smoothie', 'tisane', 'expresso', 'kéfir', 'orangeade',
  // petit déjeuner
  'beurre', 'miel', 'pain', 'toast', 'tartine', 'brioche', 'croissant', 'baguette', 'crêpe',
  'gaufre', 'pancake', 'beignet', 'muffin', 'donut', 'bagel', 'scone', 'confiture', 'yaourt',
  'céréales', 'muesli', 'granola', 'compote', 'oeuf', 'omelette', 'bacon', 'jambon',
  // desserts et douceurs
  'cookie', 'biscuit', 'gâteau', 'cake', 'tarte', 'flan', 'clafoutis', 'sablé', 'madeleine',
  'éclair', 'chou', 'mousse', 'glace', 'sorbet', 'sundae', 'coupe', 'brownie', 'cupcake',
  'crumble', 'macaron', 'praline', 'nougat', 'réglisse', 'guimauve', 'caramel', 'vanille',
  'chantilly', 'meringue', 'financier', 'cannelé',
  // fruits
  'pomme', 'poire', 'pêche', 'prune', 'cerise', 'fraise', 'framboise', 'myrtille', 'banane',
  'ananas', 'citron', 'orange', 'melon', 'kiwi', 'kaki', 'figue', 'abricot', 'raisin', 'datte',
  'coing', 'kumquat', 'quetsche', 'yuzu', 'noix', 'noisette', 'amande', 'pistache',
  // plats
  'burger', 'hamburger', 'frites', 'chips', 'nuggets', 'steak', 'bavette', 'poulet', 'dinde',
  'canard', 'lapin', 'veau', 'porc', 'agneau', 'boeuf', 'rôti', 'ragoût', 'potée', 'daube',
  'jarret', 'saucisse', 'merguez', 'boudin', 'lard', 'pâté', 'rillettes', 'terrine', 'quiche',
  'tourte', 'quenelle', 'chili', 'tacos', 'wrap', 'kebab', 'panini', 'sandwich', 'pizza',
  'gratin', 'purée', 'riz', 'pâtes', 'nouilles', 'raviolis', 'lasagnes', 'couscous', 'tajine',
  'paella', 'wok', 'sushi', 'yakitori', 'zakouski', 'fondue', 'raclette', 'fromage', 'brie',
  'comté', 'gruyère', 'chèvre', 'cheddar',
  // soupes et légumes
  'soupe', 'potage', 'velouté', 'bouillon', 'salade', 'crudités', 'carottes', 'poireau',
  'épinards', 'haricots', 'lentilles', 'pois', 'maïs', 'navet', 'radis', 'oignon', 'olive',
  'câpres', 'cornichon', 'pickles', 'courgette', 'potiron', 'champignon',
  // condiments
  'moutarde', 'ketchup', 'mayo', 'vinaigre', 'sel', 'poivre', 'sucre', 'cannelle', 'safran',
  'paprika', 'wasabi', 'zeste', 'thym', 'persil',
  // poissons
  'truite', 'saumon', 'thon', 'sardine', 'moules', 'huîtres', 'crabe', 'homard', 'crevette',
  'calamar', 'morue', 'hareng',
];

/** Spécialités — real, longer menu items. May contain spaces. */
export const FR_TIER2: readonly string[] = [
  // petit déjeuner
  'oeufs brouillés', 'oeufs au plat', 'oeuf à la coque', 'oeufs bacon', 'omelette nature',
  'omelette au fromage', 'omelette aux champignons', 'omelette jambon fromage', 'pain perdu',
  'tartine beurrée', 'tartine de confiture', 'pain au chocolat', 'pain aux raisins',
  'croissant aux amandes', 'chausson aux pommes', 'crêpe au sucre', 'crêpe au chocolat',
  'crêpe beurre sucre', 'crêpe complète', 'galette saucisse', 'gaufre au sucre',
  'gaufre à la chantilly', 'pancakes au sirop', 'muesli au lait', 'yaourt au miel',
  'bol de céréales', 'brioche tressée', 'bagel saumon', 'pain de mie grillé',
  // boissons
  'café crème', 'café noisette', 'café allongé', 'café glacé', 'grand crème', 'chocolat chaud',
  'chocolat viennois', 'thé au citron', 'thé à la menthe', 'thé glacé', 'jus de pomme',
  'jus de raisin', 'jus de tomate', 'jus de pamplemousse', 'orange pressée', 'citron pressé',
  'lait fraise', 'lait grenadine', 'diabolo menthe', 'diabolo grenadine', 'sirop de menthe',
  'limonade maison', 'milkshake vanille', 'milkshake fraise', 'milkshake chocolat',
  'smoothie banane', 'cola light', 'soda au citron', 'eau gazeuse', 'lait chaud',
  // sandwichs et snacks
  'jambon beurre', 'sandwich poulet', 'sandwich thon', 'sandwich au pâté', 'club sandwich',
  'hot dog', 'cheeseburger', 'double cheese', 'burger maison', 'burger au bacon',
  'burger végétarien', 'frites maison', 'nuggets de poulet', 'ailes de poulet',
  'panini mozzarella', 'wrap au poulet', 'kebab frites', 'tacos au boeuf', 'pizza reine',
  'pizza margherita', 'pizza quatre fromages', 'quiche lorraine', 'tourte au poulet',
  'feuilleté au fromage', 'pâté en croûte', 'oeuf mayonnaise', 'friand à la viande',
  // plats
  'steak frites', 'steak haché', 'poulet rôti', 'poulet frites', 'poulet basquaise',
  'boeuf bourguignon', 'blanquette de veau', 'rôti de porc', 'côte de boeuf', 'côtes de porc',
  'hachis parmentier', 'gratin dauphinois', 'gratin de pâtes', 'lasagnes maison',
  'spaghetti bolognaise', 'saucisse purée', 'boudin noir', 'andouillette frites',
  'choucroute garnie', 'cassoulet maison', 'tartiflette savoyarde', 'fondue savoyarde',
  'raclette complète', 'moules frites', 'moules marinières', 'filet de poisson',
  'pavé de saumon', 'brandade de morue', 'sole meunière', 'quenelles de brochet',
  'canard aux cerises', 'lapin à la moutarde', 'navarin de mouton', 'chili con carne',
  'couscous royal', 'tajine de poulet', 'paella aux fruits de mer', 'riz cantonais',
  'nouilles sautées', 'plat du jour', 'menu enfant', 'assiette anglaise',
  // soupes, salades, légumes
  'soupe de poisson', 'soupe au pistou', 'soupe de légumes', 'velouté de potiron',
  'potage du jour', 'bouillon de poule', 'salade verte', 'salade niçoise', 'salade composée',
  'salade de tomates', 'salade de chèvre chaud', 'salade de fruits', 'carottes râpées',
  'céleri rémoulade', 'haricots verts', 'petits pois', 'pommes sautées', 'purée maison',
  'ratatouille niçoise', 'champignons à la crème',
  // desserts
  'tarte aux pommes', 'tarte au citron', 'tarte aux fraises', 'tarte tatin', 'tarte au sucre',
  'crème brûlée', 'crème caramel', 'mousse au chocolat', 'île flottante', 'riz au lait',
  'profiteroles au chocolat', 'éclair au café', 'paris brest', 'baba au rhum',
  'fondant au chocolat', 'moelleux au chocolat', 'gâteau de riz', 'gâteau basque',
  'far breton', 'kouign amann', 'clafoutis aux cerises', 'crumble aux pommes', 'coupe glacée',
  'banana split', 'café liégeois', 'chocolat liégeois', 'poire belle hélène', 'pêche melba',
  'sorbet citron', 'glace vanille', 'glace pistache', 'dame blanche', 'coupe colonel',
  'salade de fruits frais', 'fromage blanc', 'yaourt aux fruits', 'compote de pommes',
];

/** Plats bizarres — the dish, with its gender and number for agreement. */
const FORMS: ReadonlyArray<readonly [string, 'm' | 'f', boolean]> = [
  ['soufflé', 'm', false], ['gaufres', 'f', true], ['bisque', 'f', false], ['velouté', 'm', false],
  ['potage', 'm', false], ['gratin', 'm', false], ['beignets', 'm', true], ['crumble', 'm', false],
  ['ragoût', 'm', false], ['cassoulet', 'm', false], ['crêpes', 'f', true], ['brochettes', 'f', true],
  ['boulettes', 'f', true], ['raviolis', 'm', true], ['risotto', 'm', false], ['omelette', 'f', false],
  ['quiche', 'f', false], ['tourte', 'f', false], ['terrine', 'f', false], ['mousse', 'f', false],
  ['sorbet', 'm', false], ['smoothie', 'm', false], ['milkshake', 'm', false], ['sundae', 'm', false],
  ['flan', 'm', false], ['clafoutis', 'm', false], ['compote', 'f', false], ['confiture', 'f', false],
  ['purée', 'f', false], ['soupe', 'f', false], ['fondue', 'f', false], ['raclette', 'f', false],
  ['lasagnes', 'f', true], ['tartines', 'f', true], ['croquettes', 'f', true], ['nuggets', 'm', true],
  ['pancakes', 'm', true], ['cupcakes', 'm', true], ['muffins', 'm', true], ['donuts', 'm', true],
  ['éclairs', 'm', true], ['macarons', 'm', true], ['madeleines', 'f', true], ['brownies', 'm', true],
  ['tacos', 'm', true], ['burritos', 'm', true], ['nachos', 'm', true], ['kebab', 'm', false],
  ['panini', 'm', false], ['wraps', 'm', true], ['burger', 'm', false], ['sandwich', 'm', false],
  ['pizza', 'f', false], ['calzone', 'f', false], ['quenelles', 'f', true], ['rillettes', 'f', true],
  ['pâté', 'm', false], ['boudin', 'm', false], ['saucisses', 'f', true], ['frites', 'f', true],
  ['chips', 'f', true], ['galette', 'f', false], ['tarte', 'f', false], ['tartelettes', 'f', true],
  ['gâteau', 'm', false], ['cake', 'm', false], ['bûche', 'f', false], ['charlotte', 'f', false],
  ['profiteroles', 'f', true], ['chouquettes', 'f', true], ['nougat', 'm', false], ['sucettes', 'f', true],
  ['sirop', 'm', false], ['jus', 'm', false], ['yaourt', 'm', false], ['parfait', 'm', false],
  ['granité', 'm', false], ['coulis', 'm', false], ['nectar', 'm', false], ['consommé', 'm', false],
  ['bouillon', 'm', false], ['potée', 'f', false], ['daube', 'f', false], ['blanquette', 'f', false],
  ['fricassée', 'f', false], ['gelée', 'f', false], ['tajine', 'm', false], ['couscous', 'm', false],
  ['paella', 'f', false], ['chili', 'm', false], ['curry', 'm', false], ['wok', 'm', false],
  ['sushis', 'm', true], ['makis', 'm', true], ['yakitoris', 'm', true], ['zakouskis', 'm', true],
  ['quesadilla', 'f', false], ['fajitas', 'f', true], ['pickles', 'm', true], ['jardinière', 'f', false],
  ['julienne', 'f', false], ['kouglof', 'm', false], ['toasts', 'm', true],
];

/** Ingrédients improbables — all start with a consonant (or h aspiré) so "de" never elides. */
export const FR_INGREDIENTS: readonly string[] = [
  'zèbre', 'cactus', 'coing', 'kumquat', 'kiwi', 'yuzu', 'varech', 'noix', 'mangue', 'cornichon',
  'poulpe', 'navet', 'radis', 'homard', 'hareng', 'betterave', 'brocoli', 'chou', 'caramel',
  'pissenlit', 'durian', 'gingembre', 'noisette', 'myrtille', 'jacquier', 'jalapeño', 'lavande',
  'poireau', 'citron', 'réglisse', 'litchi', 'météore', 'champignon', 'moutarde', 'muscade',
  'gombo', 'papaye', 'panais', 'cacahuète', 'potiron', 'caille', 'rhubarbe', 'safran', 'sardine',
  'tofu', 'tomate', 'truffe', 'licorne', 'vanille', 'chevreuil', 'wasabi', 'pastèque', 'patate',
  'courgette', 'kéfir', 'kaki', 'quetsche', 'quinoa', 'jambon', 'jasmin', 'genièvre', 'guimauve',
  'pieuvre', 'calamar', 'crabe', 'crevette', 'morue', 'saucisson', 'dinosaure', 'chameau',
  'kangourou', 'koala', 'yack', 'zébu', 'wapiti', 'pingouin', 'pélican', 'pigeon', 'sanglier',
  'bison', 'bonbon', 'chocolat', 'nougat', 'praline', 'pistache', 'figue', 'datte', 'prune',
  'pruneau', 'pomme', 'poire', 'fenouil', 'céleri', 'cresson', 'persil', 'ciboulette', 'thym',
  'sauge', 'menthe', 'basilic', 'piment', 'poivron', 'paprika', 'curcuma', 'cumin', 'cannelle',
  'vinaigre', 'quenelle', 'zeste', 'kimchi', 'kebab', 'wok', 'yaourt', 'jujube', 'girafe',
  'hibou', 'hérisson', 'requin', 'sorcière', 'fantôme', 'vampire', 'robot', 'martien', 'comète',
  'nuage', 'tonnerre', 'velours', 'carton', 'jacinthe', 'violette', 'tournesol',
  'mammouth', 'dragon', 'gnome', 'lutin', 'farfadet', 'cyclope', 'sphinx', 'phénix', 'lynx',
];

/** Préparations — adjectives as [masculine, feminine]; plurals add -s unless they end in s or x. */
const ADJECTIVES: ReadonlyArray<readonly [string, string]> = [
  ['hanté', 'hantée'], ['fumé', 'fumée'], ['glacé', 'glacée'], ['confit', 'confite'], ['mariné', 'marinée'],
  ['poché', 'pochée'], ['rôti', 'rôtie'], ['grillé', 'grillée'], ['flambé', 'flambée'], ['farci', 'farcie'],
  ['pané', 'panée'], ['caramélisé', 'caramélisée'], ['sucré', 'sucrée'], ['salé', 'salée'], ['épicé', 'épicée'],
  ['pimenté', 'pimentée'], ['fermenté', 'fermentée'], ['doré', 'dorée'], ['gratiné', 'gratinée'],
  ['braisé', 'braisée'], ['mijoté', 'mijotée'], ['frit', 'frite'], ['croustillant', 'croustillante'],
  ['fondant', 'fondante'], ['moelleux', 'moelleuse'], ['mousseux', 'mousseuse'], ['gélatineux', 'gélatineuse'],
  ['radioactif', 'radioactive'], ['hypnotisé', 'hypnotisée'], ['momifié', 'momifiée'], ['lévitant', 'lévitante'],
  ['tiède', 'tiède'], ['nerveux', 'nerveuse'], ['géant', 'géante'], ['paniqué', 'paniquée'],
  ['pixelisé', 'pixelisée'], ['ciré', 'cirée'], ['tremblotant', 'tremblotante'], ['quantique', 'quantique'],
  ['caoutchouteux', 'caoutchouteuse'], ['conscient', 'consciente'], ['scintillant', 'scintillante'],
  ['pétillant', 'pétillante'], ['couinant', 'couinante'], ['translucide', 'translucide'], ['verni', 'vernie'],
  ['vibrant', 'vibrante'], ['sifflant', 'sifflante'], ['tordu', 'tordue'], ['zesté', 'zestée'],
  ['juteux', 'juteuse'], ['joyeux', 'joyeuse'], ['jaloux', 'jalouse'], ['mystérieux', 'mystérieuse'],
  ['maudit', 'maudite'], ['enchanté', 'enchantée'], ['céleste', 'céleste'], ['gothique', 'gothique'],
  ['maléfique', 'maléfique'], ['vampirique', 'vampirique'], ['zombifié', 'zombifiée'], ['endormi', 'endormie'],
  ['explosif', 'explosive'], ['volcanique', 'volcanique'], ['galactique', 'galactique'], ['magnétique', 'magnétique'],
  ['lunaire', 'lunaire'], ['électrique', 'électrique'], ['atomique', 'atomique'], ['cosmique', 'cosmique'],
  ['gelé', 'gelée'], ['brûlé', 'brûlée'], ['carbonisé', 'carbonisée'], ['violet', 'violette'], ['argenté', 'argentée'],
  ['quadrillé', 'quadrillée'], ['zébré', 'zébrée'], ['tacheté', 'tachetée'], ['poilu', 'poilue'],
  ['bavard', 'bavarde'], ['timide', 'timide'], ['grincheux', 'grincheuse'], ['fâché', 'fâchée'], ['vexé', 'vexée'],
  ['perplexe', 'perplexe'], ['ému', 'émue'], ['excité', 'excitée'], ['exquis', 'exquise'], ['luxueux', 'luxueuse'],
  ['toxique', 'toxique'], ['mixé', 'mixée'], ['taxidermisé', 'taxidermisée'], ['extraterrestre', 'extraterrestre'],
  ['exotique', 'exotique'], ['bizarre', 'bizarre'], ['gazeux', 'gazeuse'], ['blasé', 'blasée'],
  ['psychédélique', 'psychédélique'], ['frisé', 'frisée'], ['dansant', 'dansante'], ['chantant', 'chantante'],
  ['bondissant', 'bondissante'], ['kidnappé', 'kidnappée'], ['jongleur', 'jongleuse'], ['qualifié', 'qualifiée'],
  ['quintuple', 'quintuple'], ['vaporeux', 'vaporeuse'], ['fluorescent', 'fluorescente'], ['ensorcelé', 'ensorcelée'],
  ['velu', 'velue'], ['wagnérien', 'wagnérienne'], ['jazzifié', 'jazzifiée'],
];

const FORM_NAMES = FORMS.map(([w]) => w);
const FORM_INFO = new Map(FORMS.map(([w, g, plural]) => [w, { g, plural }]));
const ADJ_NAMES = ADJECTIVES.map(([m]) => m);
const ADJ_FEMININE = new Map(ADJECTIVES);

/** The adjective agreed with its dish ("gaufres hantées", "soufflé hanté"). */
export function agree(adjective: string, form: string): string {
  const { g, plural } = FORM_INFO.get(form) ?? { g: 'm', plural: false };
  const base = g === 'f' ? ADJ_FEMININE.get(adjective) ?? adjective : adjective;
  return plural && !/[sx]$/.test(base) ? `${base}s` : base;
}

export const FR_FORMS = FORM_NAMES;
export const FR_ADJECTIVES = ADJ_NAMES;
export const FR_ADJECTIVE_PAIRS = ADJECTIVES;

/** Commandes maison — capitals and punctuation, typed exactly. */
export const FR_HOUSE_ORDERS: readonly string[] = [
  'Le BLT de Mel', 'Un café, noir.', 'Deux croissants, merci !', 'La tarte de Mme Dupont',
  'Un steak, à point.', 'Frites, bien cuites !', 'Un thé, deux sucres.', "Café crème, s'il vous plaît",
  'Une crêpe au sucre, vite !', 'Le plat du jour', 'Le menu enfant, sans croûte',
  'Croque-monsieur, sans jambon ?', "Jus d'orange, sans pulpe", 'OK pour un burger ?',
  'Le Spécial de Paulette', 'Quiche lorraine, chaude.', 'Une glace : vanille, fraise.',
  'Omelette, bien baveuse !', 'Steak-frites, saignant', 'Le café de Jacques', 'Encore du pain, SVP',
  'Rien que de la soupe ?', 'Hot-dog : moutarde, oignons', 'Mme Leroux veut du flan',
  'M. Kim veut du kimchi', 'Zoé prend une gaufre', 'Xavier : un yaourt nature',
  'Quentin veut un quatre-quarts', 'Wanda veut un wrap', 'Le sandwich de Yannick',
  'Une pizza, extra fromage !', 'BLT, sans mayo', 'Un chocolat. Chaud ! Vite !',
  'Tarte Tatin, avec de la glace', 'Pêche Melba, deux cuillères', 'Le Croque de Mamie',
  'Une bière ? Non, un soda.', 'Fondue : pour deux !', "L'addition, s'il vous plaît",
  'Encore un café ? Allez.', 'Deux oeufs, au plat.', 'Toast : beurre, confiture',
  'Purée maison, double portion', 'Café allongé, sans sucre', 'Lait fraise, deux pailles',
  'Le burger du Chef', 'Tartiflette ? Oui, chef !', 'Kebab, sauce blanche', 'Moules-frites, merci !',
  'Salade, vinaigrette à part', 'Croissant aux amandes, SVP', 'Club sandwich, coupé en quatre',
  'Pain perdu. Vraiment ?', 'Zut, plus de frites ?', 'Jambon-beurre, et vite !', 'Un expresso, serré.',
  'Hachis Parmentier, SVP', 'La soupe du Chef', 'Coca, sans glaçons', 'Mme Vachon : du gâteau',
  "Paris-Brest pour Jean-Luc", "Un p'tit noir, au comptoir",
];

/** Finger-Counter specials: [one, many, feminine]. */
const FR_COUNTABLE: ReadonlyArray<readonly [string, string, boolean]> = [
  ['croissant', 'croissants', false], ['crêpe', 'crêpes', true], ['gaufre', 'gaufres', true],
  ['beignet', 'beignets', false], ['café', 'cafés', false], ['chocolat', 'chocolats', false],
  ['oeuf', 'oeufs', false], ['hamburger', 'hamburgers', false], ['burger', 'burgers', false],
  ['milkshake', 'milkshakes', false], ['soda', 'sodas', false], ['tarte', 'tartes', true],
  ['biscuit', 'biscuits', false], ['muffin', 'muffins', false], ['donut', 'donuts', false],
  ['cookie', 'cookies', false], ['éclair', 'éclairs', false], ['glace', 'glaces', true],
  ['sandwich', 'sandwichs', false], ['madeleine', 'madeleines', true], ['brioche', 'brioches', true],
];
const FR_COUNT_NAMES = FR_COUNTABLE.map(([one]) => one);
const FR_NUMBERS = ['deux', 'trois', 'quatre', 'cinq'];

export const FRENCH: Vocabulary = {
  lang: 'fr',
  tier1: FR_TIER1,
  tier2: FR_TIER2,
  house: FR_HOUSE_ORDERS,
  weird(count, draw: Draw) {
    const form = draw(FORM_NAMES);
    if (count <= 1) return { words: [form], fresh: [form] };
    const adjective = agree(draw(ADJ_NAMES), form);
    if (count === 2) return { words: [form, adjective], fresh: [form, adjective] };
    const ingredient = draw(FR_INGREDIENTS);
    return { words: [form, 'de', ingredient, adjective], fresh: [form, ingredient, adjective] };
  },
  maxCount: 5,
  counted(fingers, draw: Draw) {
    const one = draw(FR_COUNT_NAMES);
    const [, many, feminine] = FR_COUNTABLE.find(([o]) => o === one)!;
    const count = fingers === 1 ? (feminine ? 'une' : 'un') : FR_NUMBERS[fingers - 2];
    const dish = fingers === 1 ? one : many;
    return { words: [count, dish], fresh: [dish] };
  },
  followUps: [
    'café', 'thé', 'chocolat', 'tarte', 'glace', 'crêpe', 'gaufre', 'flan', 'mousse', 'sorbet', 'éclair', 'expresso',
    'tisane', 'crème brûlée', 'île flottante', 'café crème', 'coupe glacée', 'tarte tatin', 'riz au lait',
    'madeleine', 'cookie', 'brownie', 'macaron', 'yaourt', 'fromage blanc', 'mousse au chocolat', 'café liégeois',
  ],
  rushDrinks: [
    'café', 'thé', 'cola', 'soda', 'jus', 'sirop', 'limonade', 'lait', 'tisane', 'expresso', 'smoothie', 'milkshake',
    'orangeade', 'diabolo', 'kéfir', 'grenadine', 'noisette', 'allongé', 'eau', 'menthe', 'coca', 'infusion',
    'jus de pomme', 'café crème', 'thé glacé', 'grand crème',
  ],
};
