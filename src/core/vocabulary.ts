/**
 * Word pools. Besides the diner flavour, the lists are built as typing
 * practice: every letter shows up many times (with extra x, z, q, j, k and v
 * words), and common English pairs (th, er, in, ou, ing, tion) and awkward
 * reaches (ui, ce, ex, br, my) each appear across plenty of words.
 */

/** Tier 1 — The Regulars: short, real diner words. Single words only. */
export const TIER1: readonly string[] = [
  // counter staples
  'burger', 'malt', 'fries', 'soda', 'pie', 'shake', 'toast', 'eggs', 'bacon',
  'ham', 'cola', 'melt', 'hash', 'grits', 'soup', 'salad', 'donut', 'coffee',
  'cocoa', 'waffle', 'pancake', 'sundae', 'float', 'chili', 'corn', 'beans',
  'rice', 'gravy', 'biscuit', 'jello',
  // breakfast
  'omelet', 'oatmeal', 'porridge', 'granola', 'cereal', 'muffin', 'bagel',
  'scone', 'crepe', 'sausage', 'scrapple', 'kipper', 'lox', 'yogurt', 'kefir',
  'honey', 'syrup', 'butter', 'jam', 'jelly', 'bran', 'brioche',
  // grill and plates
  'steak', 'brisket', 'ribs', 'chops', 'cutlet', 'pork', 'lamb', 'veal',
  'liver', 'oxtail', 'kebab', 'patty', 'slider', 'frank', 'wiener', 'brats',
  'kielbasa', 'salami', 'meatball', 'nuggets', 'wings', 'tenders', 'tuna',
  'trout', 'cod', 'clams', 'crab', 'shrimp', 'oysters', 'squid', 'quail',
  'turkey', 'chicken', 'knish', 'quiche', 'pizza', 'ziti', 'taco', 'burrito',
  'nachos', 'hoagie', 'reuben', 'panini',
  // soups and sides
  'broth', 'chowder', 'bisque', 'gumbo', 'stew', 'slaw', 'kraut', 'pickles',
  'relish', 'ketchup', 'mustard', 'mayo', 'okra', 'kale', 'squash', 'zucchini',
  'spinach', 'carrots', 'peas', 'potato', 'yams', 'tots', 'onions', 'olives',
  'chives', 'cloves', 'vinegar', 'veggies', 'jicama', 'mixed',
  // sweets
  'cake', 'cupcake', 'cookie', 'brownie', 'eclair', 'cobbler', 'crumble',
  'custard', 'pudding', 'tapioca', 'sherbet', 'fudge', 'taffy', 'pretzel',
  'strudel', 'icing', 'sprinkle', 'jimmies', 'vanilla', 'pecans', 'almonds',
  'cherry', 'peach', 'banana', 'quince', 'kiwi', 'kumquat', 'prunes', 'figs',
  'raisins', 'lemon', 'lime', 'melon', 'berries', 'apricot',
  // drinks
  'juice', 'java', 'joe', 'tea', 'milk', 'cider', 'punch', 'seltzer',
  'smoothie', 'lemonade', 'eggnog', 'fizz', 'tonic', 'cream',
  'mocha', 'latte', 'espresso', 'ginger', 'frappe',
];

/** Tier 2 — The Specials: real, longer menu items. May contain spaces. */
export const TIER2: readonly string[] = [
  'banana split', 'chicken pot pie', 'onion rings', 'grilled cheese',
  'apple pie', 'root beer float', 'tuna melt', 'club sandwich',
  'mashed potatoes', 'meat loaf', 'cherry malt', 'blueberry pancakes',
  'fried chicken', 'peach cobbler', 'strawberry shake', 'patty melt',
  'corned beef hash', 'hot fudge sundae', 'egg salad sandwich',
  'french toast', 'clam chowder', 'pot roast', 'lemon pie', 'baked beans',
  'sloppy joe',
  // breakfast specials
  'eggs benedict', 'western omelet', 'cheese omelet', 'denver omelet',
  'buttermilk biscuits', 'biscuits and gravy', 'steak and eggs',
  'ham and eggs', 'bacon and eggs', 'hash browns', 'home fries',
  'buckwheat pancakes', 'pecan waffles', 'belgian waffle', 'cinnamon toast',
  'cinnamon roll', 'blueberry muffin', 'bran muffin', 'english muffin',
  'texas toast', 'rye toast', 'sourdough toast', 'jelly donut',
  'cream cheese bagel', 'lox and bagel', 'quiche lorraine', 'oatmeal with raisins',
  'grits and sausage', 'country ham', 'creamed chipped beef', 'huevos rancheros',
  'breakfast burrito', 'sausage links', 'poached eggs', 'scrambled eggs',
  'eggs over easy', 'sunny side up', 'soft boiled egg', 'cheese blintzes',
  'potato knish', 'corn muffin',
  // lunch counter
  'turkey club', 'reuben sandwich', 'chili dog', 'corn dog', 'foot long',
  'hot pastrami', 'chicken salad', 'tuna salad', 'cobb salad', 'chef salad',
  'waldorf salad', 'jello salad', 'cole slaw', 'potato salad', 'macaroni salad',
  'macaroni and cheese', 'chicken noodle soup', 'tomato soup', 'split pea soup',
  'french onion soup', 'beef barley soup', 'vegetable soup', 'minestrone soup',
  'texas chili', 'chili con carne', 'chili cheese fries', 'curly fries',
  'tater tots', 'pickle spear', 'deviled eggs', 'liverwurst on rye',
  'bologna sandwich', 'fried bologna', 'monte cristo', 'cuban sandwich',
  'philly cheesesteak', 'french dip', 'roast beef au jus', 'meatball sub',
  'italian sub', 'fish sandwich', 'oyster po boy', 'shrimp basket',
  'chicken fried steak', 'chicken and waffles', 'chicken wings', 'buffalo wings',
  'jumbo shrimp', 'fried clams', 'fish and chips', 'crab cakes', 'salmon croquettes',
  'quesadilla platter', 'beef taco', 'frito pie', 'tamale pie', 'sloppy joe platter',
  'box lunch', 'kids portion', 'half portion', 'double portion',
  'combination plate', 'blue plate special', 'mystery meat', 'mixed grill',
  // dinner plates
  'salisbury steak', 'swiss steak', 'liver and onions', 'pork chops',
  'lamb chops', 'veal cutlet', 'veal parmigiana', 'chicken parmesan',
  'spaghetti and meatballs', 'baked ziti', 'stuffed peppers', 'cabbage rolls',
  'beef stroganoff', 'chicken kiev', 'shish kebab', 'beef brisket',
  'barbecue ribs', 'pulled pork', 'smoked kielbasa', 'kielbasa and kraut',
  'turkey dinner', 'turkey and stuffing', 'ham steak', 'fried catfish',
  'broiled cod', 'shrimp scampi', 'lobster bisque', 'oyster stew',
  'creamed spinach', 'creamed corn', 'green beans', 'buttered peas',
  'glazed carrots', 'candied yams', 'fried okra', 'zucchini sticks',
  'stewed tomatoes', 'black eyed peas', 'collard greens', 'squash casserole',
  // desserts
  'cherry pie', 'pecan pie', 'pumpkin pie', 'key lime pie', 'banana cream pie',
  'coconut cream pie', 'lemon meringue', 'boston cream pie', 'rhubarb pie',
  'mince pie', 'blackberry cobbler', 'apple crumble', 'apple strudel',
  'rice pudding', 'bread pudding', 'tapioca pudding', 'chocolate pudding',
  'devils food cake', 'angel food cake', 'pineapple upside down cake',
  'carrot cake', 'cheesecake', 'strawberry shortcake', 'jelly roll',
  'baked alaska', 'cherries jubilee', 'peach melba', 'brownie sundae',
  'hot fudge brownie', 'vanilla cone', 'pistachio ice cream', 'butter pecan',
  'rocky road', 'frozen yogurt', 'raspberry sherbet', 'whipped cream',
  // fountain and drinks
  'chocolate malt', 'vanilla shake', 'black and white shake', 'egg cream',
  'cherry cola', 'vanilla coke', 'orange crush', 'lemon lime soda',
  'ginger ale', 'cream soda', 'birch beer', 'iced tea', 'sweet tea',
  'hot cocoa', 'cup of joe', 'black coffee', 'coffee with cream',
  'decaf coffee', 'orange juice', 'tomato juice', 'grapefruit juice',
  'chocolate milk', 'strawberry milk', 'buttermilk shake', 'lime rickey',
  'cherry phosphate', 'mexican hot chocolate', 'boston cooler', 'extra whipped cream',
  'extra pickles', 'extra crispy fries',
];

/** Tier 3 pool — preparations/modifiers. Single words only. */
export const PREPARATIONS: readonly string[] = [
  'pickled', 'smoked', 'candied', 'deviled', 'jellied', 'frosted', 'glazed',
  'whipped', 'toasted', 'charred', 'blackened', 'breaded', 'battered',
  'curried', 'herbed', 'iced', 'marinated', 'poached', 'roasted', 'salted',
  'sautéed', 'scorched', 'seared', 'simmered', 'smothered', 'spiced',
  'steamed', 'stewed', 'stuffed', 'sugared', 'tangy', 'tenderized',
  'twisted', 'fermented', 'gilded', 'haunted', 'hypnotized', 'irradiated',
  'jittery', 'juggled', 'kingly', 'lacquered', 'levitating', 'lukewarm',
  'magnetized', 'mummified', 'nervous', 'orbiting', 'oversized', 'panicked',
  'pixelated', 'polished', 'quivering', 'quartered', 'radioactive',
  'rubbery', 'sentient', 'shimmering', 'sneaky', 'sparkling', 'squeaky',
  'translucent', 'turbocharged', 'varnished', 'velvety', 'vibrating',
  'whistling', 'wobbly', 'xeroxed', 'yodeling', 'zesty',
  // more x, z, q, j, k, v
  'boxed', 'waxed', 'mixed', 'fixed', 'relaxed', 'vexed', 'exotic', 'excited',
  'extinct', 'exploding', 'taxidermied', 'perplexed', 'flexible', 'luxurious',
  'fizzy', 'frizzy', 'dazzling', 'sizzling', 'puzzled', 'muzzled', 'frozen',
  'bronzed', 'glitzy', 'jazzy', 'zigzag', 'zippered', 'zombified', 'blazing',
  'quilted', 'quaint', 'queasy', 'quirky', 'squished', 'squashed', 'liquid',
  'antique', 'quantum', 'conquered', 'jumbo', 'jolly', 'jinxed', 'jaunty',
  'jeweled', 'juiced', 'jumping', 'banjo', 'kooky', 'knitted', 'knotted',
  'kicking', 'cooked', 'baked', 'crackling', 'flaky', 'sulking', 'vampiric',
  'vintage', 'vivid', 'evil', 'lavish', 'vacuumed', 'devious', 'groovy',
  'invisible', 'vocal', 'volcanic',
  // th, ing, tion, ou, ui, ce, br, my
  'emotional', 'sensational', 'motionless', 'traditional', 'fictional',
  'ambitious', 'cautious', 'fabulous', 'famous', 'gorgeous', 'mysterious',
  'nauseous', 'ominous', 'enormous', 'humorous', 'bouncing', 'shouting',
  'singing', 'sobbing', 'thinking', 'breathing', 'grumbling', 'trembling',
  'smothering', 'brooding', 'bruised', 'brittle', 'bronze', 'brassy',
  'bribed', 'brined', 'broiled', 'creamy', 'gummy', 'slimy', 'foamy',
  'steamy', 'clammy', 'stormy', 'mythic', 'fruity', 'suited', 'squinting',
  'ruined', 'buttery', 'lethargic', 'gothic', 'thrifty', 'thorny', 'pathetic',
  'ancient', 'ceramic', 'certified', 'fierce', 'icy', 'spicy', 'saucy',
  'celestial', 'enchanted',
];

/** Tier 3 pool — ingredients. Single words only. */
export const INGREDIENTS: readonly string[] = [
  'zebra', 'cactus', 'quince', 'jicama', 'yuzu', 'xigua', 'kelp', 'walnut',
  'mango', 'pickle', 'octopus', 'dragonfruit', 'turnip', 'radish', 'kumquat',
  'lobster', 'anchovy', 'beet', 'broccoli', 'bubblegum', 'cabbage',
  'caramel', 'cashew', 'dandelion', 'durian', 'eel', 'eggplant', 'fig',
  'garlic', 'ginger', 'hazelnut', 'huckleberry', 'jackfruit', 'jalapeño',
  'kale', 'kiwi', 'lavender', 'leek', 'lemon', 'licorice', 'lychee',
  'maple', 'marshmallow', 'meteor', 'moonbeam', 'mushroom', 'mustard',
  'noodle', 'nutmeg', 'okra', 'olive', 'onion', 'papaya', 'parsnip',
  'peanut', 'pumpkin', 'quail', 'rhubarb', 'saffron', 'seaweed', 'squid',
  'stardust', 'tofu', 'tomato', 'truffle', 'unicorn', 'vanilla', 'venison',
  'wasabi', 'watermelon', 'yam', 'zucchini',
  // more x, z, q, j, k, v
  'ox', 'oxtail', 'flax', 'lox', 'wax', 'onyx', 'phoenix', 'sphinx', 'lynx',
  'fox', 'yak', 'kudzu', 'mozzarella', 'pizza', 'pretzel', 'gizzard', 'lizard',
  'blizzard', 'wizard', 'buzzard', 'ozone', 'topaz', 'chorizo', 'kazoo',
  'squash', 'squirrel', 'quinoa', 'sasquatch', 'tequila', 'mosquito', 'quartz',
  'queso', 'loquat', 'aquarium', 'jelly', 'jam', 'jellybean', 'jasmine',
  'juniper', 'javelin', 'jerky', 'jujube', 'jackalope', 'jellyfish', 'kimchi',
  'kohlrabi', 'kipper', 'kraken', 'koala', 'kidney', 'kiwano', 'ketchup',
  'pancake', 'volcano', 'violet', 'vulture', 'velvet', 'viper', 'vinegar',
  'vegetable', 'clover', 'chives', 'raven', 'beaver', 'avocado', 'guava',
  // th, ing, tion, ou, ui, ce, br, my
  'thistle', 'thunder', 'thyme', 'moth', 'sloth', 'mammoth', 'python',
  'icing', 'pudding', 'dumpling', 'starling', 'herring', 'gosling', 'stuffing',
  'potion', 'lotion', 'trout', 'grouse', 'mouse', 'cloud', 'sourdough',
  'fruit', 'biscuit', 'juice', 'penguin', 'guinea', 'quiche', 'celery',
  'rice', 'spice', 'mincemeat', 'sauce', 'iceberg', 'brisket', 'bramble',
  'bread', 'brie', 'brussels', 'brownie', 'bratwurst', 'mystery', 'myrtle',
  'chimney', 'myrrh',
];

/** Tier 3 pool — dish forms. Single words only. */
export const DISH_FORMS: readonly string[] = [
  'soufflé', 'waffles', 'bisque', 'chowder', 'gumbo', 'fritters',
  'casserole', 'dumplings', 'flapjacks', 'goulash', 'hotpot', 'jambalaya',
  'kebabs', 'lasagna', 'meatballs', 'nachos', 'omelette', 'pancakes',
  'quesadilla', 'ravioli', 'risotto', 'sandwich', 'skewers', 'smoothie',
  'sorbet', 'stew', 'strudel', 'sushi', 'terrine', 'turnovers', 'milkshake',
  'muffins', 'nuggets', 'pudding', 'quiche', 'relish', 'sliders', 'syrup',
  'wraps', 'juice', 'jerky', 'fondue', 'flan', 'curry', 'custard',
  'crumble', 'croquettes', 'cupcakes', 'dip', 'donuts', 'eclairs',
  'empanadas', 'enchiladas', 'fajitas', 'parfait', 'popsicle', 'porridge',
  'pretzels', 'tacos', 'brownies', 'burrito', 'calzone', 'cobbler',
  'compote', 'crepes', 'velouté', 'yogurt', 'ziti',
  // more x, z, q, j, k, v
  'mix', 'trifle', 'pizza', 'pizzelle', 'pozole', 'kolache',
  'kebab', 'knishes', 'kugel', 'kimchi', 'kofta', 'kasha', 'kabobs', 'pierogi',
  'pakoras', 'kedgeree', 'cake', 'cookies', 'snacks', 'jelly', 'jam', 'julep',
  'juleps', 'jambon', 'jus', 'jollof', 'jumble', 'jello', 'aspic', 'bisques',
  'quiches', 'squares', 'croque', 'banquet', 'bouquet', 'sundae', 'gravy',
  'vindaloo', 'vegetables', 'chevre', 'caviar', 'olives',
  'loaves', 'preserves', 'stroganoff', 'brochettes', 'buckle', 'slurry',
  'crackers', 'kettlecorn', 'sizzler', 'zeppole', 'bruschetta', 'goulashes',
  // th, ing, tion, ou, ui, ce, br, my
  'broth', 'froth', 'smoothies', 'stuffing', 'filling', 'frosting', 'topping',
  'icing', 'dumpling', 'ration', 'portion', 'concoction', 'potion',
  'creation', 'confection', 'selection', 'soup', 'roulade', 'mousse',
  'croutons', 'biscuits', 'fruitcake', 'juices', 'cuisine', 'sauce',
  'mince', 'slices', 'pieces', 'rice', 'bread', 'brittle', 'brisket',
  'brioche', 'brulee', 'brine', 'salmagundi', 'mash', 'mush', 'medley',
  'hash', 'platter', 'pie', 'tart', 'pot', 'pemmican',
];

/**
 * House orders: capitals and punctuation, typed exactly as written. They
 * show up later in the week, and the player can switch them off.
 */
export const HOUSE_ORDERS: readonly string[] = [
  "Mel's BLT", "Mrs. O'Brien's pie", 'a la mode, hold the onions', 'BLT, no mayo',
  'eggs, over easy', "Joe's chili, extra hot", 'coffee, black', 'Denver omelet, no peppers',
  'OJ, no pulp', 'Swiss on rye, toasted', 'burger, medium rare', 'fries, extra crispy!',
  'tea, two sugars', 'malt, chocolate. Make it thick!', 'hash browns, well done',
  "Sam's usual", 'pie, warmed up', 'the Blue Plate Special', 'Texas toast, extra butter',
  'Philly cheesesteak, no peppers', 'Reuben, hold the kraut', 'Cobb salad, dressing on the side',
  'BLT on white, light mayo', 'two eggs, sunny side up', "Mom's meat loaf", "Pop's pot roast",
  'Waldorf salad, no grapes', 'pancakes, short stack', 'waffle, extra syrup', 'coffee, cream, no sugar',
  'root beer float, two straws', 'Boston cream pie, please', 'Key lime pie, a big slice!',
  'New York cheesecake', 'Mississippi mud pie', 'Buffalo wings, extra hot!', 'Kansas City ribs',
  'Coney Island hot dog', 'Manhattan clam chowder', 'New England chowder, no crackers',
  'Monte Cristo, extra jam', 'Any soup today?', 'Is the coffee hot?',
  'What, no pickles?', 'Mac and cheese. Hurry!', 'grilled cheese, cut corners', 'Dr. Pepper float',
  'Mr. Kim wants kimchi', 'Jack cheese, not Swiss', 'Hot dog: mustard, relish, onions',
  'Eggs: scrambled, dry', 'Toast: rye, buttered', "Chef's choice", "Kids' meal, no crust",
  'Ham on rye. Quick!', 'Liver and onions. Yes, really.', 'Jello: lime. Always lime.',
  "Zeke's zesty zucchini", "Vera's veal cutlet", "Quincy's quiche", 'XL shake, extra whip',
  'Jumbo shrimp, OK?', 'Tex-Mex chili, extra beans', 'two-egg special', 'all-day breakfast',
];

/** Finger-Counter special — the count he holds up, by finger total (index 0 = one). */
export const COUNT_WORDS: readonly string[] = ['one', 'two', 'three', 'four', 'five'];

/** Finger-Counter special — dishes you can order several of, as [singular, plural]. */
export const COUNTABLE: readonly (readonly [string, string])[] = [
  ['burger', 'burgers'], ['malt', 'malts'], ['shake', 'shakes'], ['pie', 'pies'],
  ['donut', 'donuts'], ['waffle', 'waffles'], ['pancake', 'pancakes'],
  ['sundae', 'sundaes'], ['float', 'floats'], ['biscuit', 'biscuits'],
  ['soda', 'sodas'], ['cola', 'colas'], ['melt', 'melts'], ['coffee', 'coffees'],
  ['egg', 'eggs'], ['salad', 'salads'],
];
