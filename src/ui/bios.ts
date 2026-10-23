// Who's who at Mel's counter: a name and a short bio for every character in
// the scrapbook, keyed by the `character` in cast.ts.

export interface Bio {
  name: string;
  bio: string;
}

export const BIOS: Readonly<Record<string, Bio>> = {
  agent: {
    name: 'Walt the Agent',
    bio: 'Sells life insurance, fire insurance and, on slow days, insurance on his insurance. His little dog Premium has never missed a lunch.',
  },
  scotsman: {
    name: 'Angus McTavish',
    bio: 'Came for one cup of coffee in 1949 and has been dancing a jig at the counter ever since. Tips exactly one penny, with ceremony.',
  },
  slim: {
    name: 'Slim Pickens',
    bio: 'Advertising man. Can sell ice to a penguin and gravy to a gravy boat. Weighs less than his briefcase.',
  },
  boater: {
    name: 'Mr. Beauregard',
    bio: 'Wears his straw boater in every season, at every meal, possibly in the bath. Always in a hurry to somewhere very important.',
  },
  bigeater: {
    name: 'Big Lou',
    bio: 'Holds the counter record: eleven pancakes, four malts and a pickle "for balance". Mel keeps a stool reinforced just for him.',
  },
  foureyes: {
    name: 'Professor Hartwell',
    bio: 'Teaches arithmetic at the high school and checks the math on every bill. He has found a mistake once, and still talks about it.',
  },
  specs: {
    name: 'Norman Specks',
    bio: 'Accountant. Orders the same thing every day so he can budget for it. Today might be the day he tries the pie.',
  },
  blonde: {
    name: 'Betty',
    bio: 'Switchboard operator at the phone company. Knows everybody\'s business and the price of every pie in town.',
  },
  brunette: {
    name: 'Dolores',
    bio: 'Wears her pearls to breakfast, lunch and dinner. Insists her toast be cut on the diagonal, "like civilized people".',
  },
  counter: {
    name: 'Two-Fingers Tony',
    bio: 'Never says how many he wants. Just holds up his fingers and waits. Mel thinks he lost a bet about talking.',
  },
  's-02-007': {
    name: 'Chuck Bixby',
    bio: 'Used-car salesman. Every handshake comes with a wink and a "for you, a special price". Pays in nickels.',
  },
  's-02-009': {
    name: 'Mr. Halloway',
    bio: 'Walks in, orders, eats and walks out without ever putting down his briefcase. Nobody knows what is inside.',
  },
  's-03-019': {
    name: 'Grinning Gus',
    bio: 'Has smiled continuously since VJ Day. Doctors are baffled. Waitresses are delighted.',
  },
  's-06-043': {
    name: 'Herb',
    bio: 'Tried the chili on a dare in 1952. Has not been quite the same since, but keeps coming back for more.',
  },
  's-06-046': {
    name: 'Sleepy Sonny',
    bio: 'Overslept again. Ran here in his pyjamas, still holding the alarm clock, which is still ringing.',
  },
  's-06-049': {
    name: 'Aunt Mabel',
    bio: 'Brings her own washtub of hot water for her feet. Mel stopped arguing years ago.',
  },
  's-06-052': {
    name: 'Postman Pete',
    bio: 'Neither snow nor rain nor gloom of night stays him from his midmorning doughnut.',
  },
  's-07-055': {
    name: 'Eddie Gee-Whiz',
    bio: 'Gets excited about everything. The napkins. The ketchup. The fact that the coffee is hot. Especially that.',
  },
  's-07-056': {
    name: 'Happy Hank',
    bio: 'Has never met a hot dog he did not like. Has met most of them.',
  },
  's-07-060': {
    name: "Officer O'Malley",
    bio: 'Walks the beat around the diner. Today he brought in a young fellow who tried to dine and dash. The boy is paying in dishes.',
  },
  's-07-063': {
    name: 'Jumping Jack',
    bio: 'Just heard his horse came in. Or went out. Either way, he is very loud about it.',
  },
  's-11-106': {
    name: 'Sam Shady',
    bio: 'Private eye, or says he is. Sits facing the door and orders his coffee "black, like my past".',
  },
  's-11-111': {
    name: 'Moving-Day Morris',
    bio: 'Has been moving house for three weeks. Some of the house is still on him.',
  },
  's-14-148': {
    name: 'The Crook and the Mark',
    bio: 'A gentleman in a mask "borrowing" from a gentleman in a bow tie. They share a booth and split the check.',
  },
  's-15-155': {
    name: 'Weepy Walter',
    bio: 'Literally cries over spilled milk. Mel keeps a mop and a hankie by his stool.',
  },
  's-15-156': {
    name: 'The Bookworm',
    bio: 'Reads the dictionary at the counter, one letter per week. Currently on Q, which is why he keeps ordering quince.',
  },
  's-15-158': {
    name: 'Puzzled Pierre',
    bio: 'Has been reading the menu since Tuesday. There are only twelve things on it.',
  },
  's-16-165': {
    name: 'Cornelius Moneybags',
    bio: 'Lights his cigars with five-dollar bills and tips with ones. Owns the bank across the street, and the street.',
  },
  's-16-166': {
    name: 'Lucky Lenny',
    bio: 'Just won the church raffle. Throwing the money in the air seemed like a good idea at the time.',
  },
  's-17-178': {
    name: 'Cocktail Carl',
    bio: 'Orders a malted in a martini glass, with an olive. Says it is "for the vitamins".',
  },
  's-17-180': {
    name: 'Bathtub Bob',
    bio: 'The plumbing at his place is out. Mel let him use the big soup pot. Do not order the soup today.',
  },
  's-17-183': {
    name: 'Cardsharp Clyde',
    bio: 'Always holding four aces and a stack of chips. Mel will not play him for the check anymore.',
  },
  's-18-189': {
    name: 'Forgetful Fred',
    bio: 'Ties a string round his finger to remember his order. Then forgets what the string was for.',
  },
  's-18-194': {
    name: 'Vain Vernon',
    bio: 'Checks his hair in a hand mirror between every bite. The hair is fine, Vernon. The hair is always fine.',
  },
  's-18-195': {
    name: 'Dizzy Dan',
    bio: 'Spun round on his stool once too often in 1951. The room has been spinning since.',
  },
  's-19-200': {
    name: 'Big Order Bill',
    bio: 'Travelling salesman with an order book the size of a door. Every lunch is a business lunch.',
  },
  's-19-203': {
    name: 'Handy Andy',
    bio: 'Fixes the diner\'s stools for free coffee. Keeps the nails in his mouth, which makes ordering tricky.',
  },
  's-20-213': {
    name: 'Hooray Harry',
    bio: 'Cheers for every plate that comes out of the kitchen. Mel has asked him to stop. He cheered that too.',
  },
  's-20-214': {
    name: 'Chuckles Chester',
    bio: 'Laughs at his own jokes before he tells them. Usually that is the best part.',
  },
  's-21-225': {
    name: 'Furious Phil',
    bio: 'Has been late for everything since 1938. Runs in, shouts his order, runs out, comes back for his hat.',
  },
  's-21-227': {
    name: 'Ideas Ike',
    bio: 'Carries a sack of PROSPECTS and a sack of IDEAS. The ideas sack is lighter.',
  },
  's-23-240': {
    name: 'Twinkle-Toes Terry',
    bio: 'Dances in from the bus stop every morning. The jukebox is not even on.',
  },
  's-23-242': {
    name: 'Worried Wendell',
    bio: 'Worries the pie will be too warm, the coffee too cold and the stool too stool-like. Tips generously out of nerves.',
  },
  's-23-244': {
    name: 'Shouting Sid',
    bio: 'Uses the diner phone to call his broker. The whole street knows how his stocks are doing.',
  },
  's-23-250': {
    name: 'Soapbox Sully',
    bio: 'Stands on a crate of soap to give speeches about the price of coffee. It is a nickel, Sully.',
  },
  's-24-253': {
    name: 'Lookout Lyle',
    bio: 'Scans the horizon for his wife, his boss or the bus. Never sure which one he is hiding from.',
  },
  's-24-260': {
    name: 'Nervous Ned',
    bio: 'Bites his nails while waiting for his food, and his food when it arrives.',
  },
  's-25-265': {
    name: 'Pointing Percy',
    bio: '"That one." "That one?" "No, that one." Percy orders by pointing, which at a counter is very confusing.',
  },
  's-25-273': {
    name: 'Wink Wilkins',
    bio: 'Has a secret. Tells everyone. Winks after each telling.',
  },
  's-25-275': {
    name: 'Judge Hollister',
    bio: 'Retired judge. Raises one finger to object to anything: the weather, the jukebox, the price of pie. Overruled.',
  },
  's-25-276': {
    name: 'Uncle Ambrose',
    bio: 'Has one more thing to say. He always has one more thing to say.',
  },
  's-26-284': {
    name: 'Romeo Ralph',
    bio: 'In love with the waitress, the cook and, briefly, the pie. Hearts float wherever he sits.',
  },
  's-27-290': {
    name: 'Mr. Vanderbilt-Smith',
    bio: 'Old money. Uses a twenty to light his cigar, then complains that coffee went up a penny.',
  },
  's-27-292': {
    name: 'Jackpot Jerry',
    bio: 'Hit it big at the track and has been throwing money around the diner all afternoon. Mel is not complaining.',
  },
  's-27-297': {
    name: 'Penny Saver',
    bio: 'Brought the biggest dollar bill in town and wants exact change.',
  },
  's-27-298': {
    name: 'Rita Rich',
    bio: 'Won the Saturday night bingo. Fans herself with the winnings and orders one of everything.',
  },
  's-29-319': {
    name: 'Old Man Whiskers',
    bio: 'Has been growing that beard since the Coolidge administration. It has its own stool.',
  },
  's-29-320': {
    name: 'Inspector Pip',
    bio: 'Searches every plate with a magnifying glass. His dog sniffs out the crumbs he missed.',
  },
  's-29-321': {
    name: 'Pencil Pete',
    bio: 'Doing his taxes at the counter, for the fourth year in a row. Still on line two.',
  },
  's-29-324': {
    name: 'Christmas Charlie',
    bio: 'Does all his shopping in one afternoon, then stops for pie before he drops something.',
  },
  's-30-337': {
    name: 'Giggling Gordon',
    bio: 'Somebody told him a joke in 1947. He is still laughing. Nobody remembers the joke.',
  },
  's-31-344': {
    name: 'Birdie Bertram',
    bio: 'Comes in with a bird on his shoulder. The bird orders for both of them.',
  },
  's-32-351': {
    name: 'Hunter Hank',
    bio: 'Went duck hunting. Came back with a question mark and a very small dog. Will settle for chicken.',
  },
  's-33-367': {
    name: 'Bertie the Big Kid',
    bio: 'Writes his order on a notepad at a desk three sizes too small. Spelling is not his strong suit, but his appetite is.',
  },
};
