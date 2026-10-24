// Customer cast: cut-outs from Stivers Studio's 1930s–50s advertising cuts
// (public domain; see assets-src/characters/SOURCES.md). Each pose is one
// image at public/characters/<key>.png, keyed by its scan id (s-<page>-<n>).
//
// `character` groups poses of the same drawn person, so the counter never
// seats them twice at once; one-off figures are their own character.
// `tier` matches the order tiers: 1 regulars bring plain menu items, 2
// characters bring the specials, 3 wacky poses bring the weird dishes.
// `fingers` marks the Finger-Counter, who only appears for his special order.

export interface PoseDef {
  key: string;
  character: string;
  tier: 1 | 2 | 3;
  fingers?: number;
}

type Tier = PoseDef['tier'];
const pose = (key: string, character: string, tier: Tier): PoseDef => ({ key, character, tier });
const single = (key: string, tier: Tier): PoseDef => ({ key, character: key, tier });

export const POSES: PoseDef[] = [
  // The Agent — big-headed insurance salesman with his little dog
  pose('s-13-128', 'agent', 2),
  pose('s-12-121', 'agent', 2),
  pose('s-08-073', 'agent', 3),
  pose('s-13-136', 'agent', 2),
  pose('s-14-144', 'agent', 2),
  pose('s-13-135', 'agent', 2),
  pose('s-10-094', 'agent', 2),
  pose('s-08-070', 'agent', 3),
  pose('s-10-091', 'agent', 3),
  pose('s-10-095', 'agent', 3),
  pose('s-10-098', 'agent', 3),
  pose('s-12-126', 'agent', 3),
  pose('s-13-129', 'agent', 3),
  pose('s-14-141', 'agent', 3),
  pose('s-14-145', 'agent', 3),
  pose('s-32-353', 'agent', 3),
  pose('s-32-357', 'agent', 3),
  // The Scotsman — kilt, tam and spats, mid-jig
  pose('s-09-078', 'scotsman', 3),
  pose('s-09-080', 'scotsman', 3),
  pose('s-09-081', 'scotsman', 3),
  pose('s-09-082', 'scotsman', 3),
  pose('s-09-083', 'scotsman', 3),
  pose('s-09-086', 'scotsman', 3),
  // Slim — stick-thin ad man in a dark suit
  pose('s-03-021', 'slim', 1),
  pose('s-09-087', 'slim', 1),
  pose('s-17-179', 'slim', 2),
  pose('s-22-232', 'slim', 1),
  pose('s-30-329', 'slim', 2),
  // The Boater — long-nosed gent in a straw hat
  pose('s-04-033', 'boater', 1),
  pose('s-24-261', 'boater', 2),
  pose('s-16-170', 'boater', 3),
  pose('s-30-327', 'boater', 3),
  // The Big Eater — portly bald gent
  pose('s-11-114', 'bigeater', 1),
  pose('s-11-112', 'bigeater', 2),
  pose('s-19-205', 'bigeater', 1),
  // Four-Eyes — round glasses, side part
  pose('s-18-187', 'foureyes', 1),
  pose('s-18-188', 'foureyes', 1),
  // Specs — wire glasses, slicked hair
  pose('s-25-271', 'specs', 1),
  pose('s-25-272', 'specs', 1),
  // The Blonde — front and profile
  pose('s-29-311', 'blonde', 1),
  pose('s-29-317', 'blonde', 1),
  // The Brunette — pearls, front and profile
  pose('s-29-313', 'brunette', 1),
  pose('s-29-314', 'brunette', 1),
  // The Finger-Counter — holds up how many he wants (special order)
  { key: 's-25-267', character: 'counter', tier: 1, fingers: 1 },
  { key: 's-25-266', character: 'counter', tier: 1, fingers: 2 },
  { key: 's-25-270', character: 'counter', tier: 1, fingers: 3 },
  { key: 's-25-269', character: 'counter', tier: 1, fingers: 4 },
  { key: 's-25-268', character: 'counter', tier: 1, fingers: 5 },
  // One-off figures
  single('s-02-007', 2),
  single('s-02-009', 1),
  single('s-03-019', 2),
  single('s-06-052', 2),
  single('s-07-055', 2),
  single('s-07-056', 1),
  single('s-15-155', 2),
  single('s-15-156', 2),
  single('s-15-158', 1),
  single('s-17-178', 2),
  single('s-17-183', 2),
  single('s-18-189', 1),
  single('s-18-194', 2),
  single('s-19-200', 2),
  single('s-20-213', 2),
  single('s-20-214', 1),
  single('s-21-227', 2),
  single('s-23-240', 2),
  single('s-23-242', 2),
  single('s-24-253', 1),
  single('s-24-260', 1),
  single('s-25-265', 1),
  single('s-25-273', 1),
  single('s-25-275', 1),
  single('s-25-276', 1),
  single('s-27-297', 2),
  single('s-27-298', 2),
  single('s-29-321', 2),
  single('s-29-324', 2),
  single('s-30-337', 1),
  single('s-06-043', 3),
  single('s-06-046', 3),
  single('s-06-049', 3),
  single('s-07-060', 3),
  single('s-07-063', 3),
  single('s-11-106', 3),
  single('s-11-111', 3),
  single('s-14-148', 3),
  single('s-16-165', 3),
  single('s-16-166', 3),
  single('s-17-180', 3),
  single('s-18-195', 3),
  single('s-19-203', 3),
  single('s-21-225', 3),
  single('s-23-244', 3),
  single('s-23-250', 3),
  single('s-26-284', 3),
  single('s-27-290', 3),
  single('s-27-292', 3),
  single('s-29-319', 3),
  single('s-29-320', 3),
  single('s-31-344', 3),
  single('s-32-351', 3),
  single('s-33-367', 3),
];

/**
 * Where each pose's head sits in its 256px-tall image: [top of the skull
 * (under any hat), chin]. The counter scales poses toward a common head size
 * and lines their heads up, so a full-figure scan and a close-up bust read as
 * the same size of person.
 */
export const HEADS: Readonly<Record<string, readonly [number, number]>> = {
  's-13-128': [20, 128], 's-12-121': [22, 150], 's-08-073': [18, 130], 's-13-136': [16, 140], 's-14-144': [18, 140],
  's-13-135': [16, 120], 's-10-094': [18, 130], 's-08-070': [18, 120], 's-10-091': [62, 130], 's-10-095': [18, 130],
  's-10-098': [20, 130], 's-12-126': [70, 145], 's-13-129': [15, 120], 's-14-141': [62, 140], 's-14-145': [32, 140],
  's-32-353': [20, 125], 's-32-357': [22, 128], 's-09-078': [38, 82], 's-09-080': [25, 70], 's-09-081': [30, 72],
  's-09-082': [40, 75], 's-09-083': [55, 100], 's-09-086': [35, 75], 's-03-021': [12, 72], 's-09-087': [22, 72],
  's-17-179': [18, 82], 's-22-232': [14, 64], 's-30-329': [62, 112], 's-04-033': [38, 85], 's-24-261': [40, 92],
  's-16-170': [45, 115], 's-30-327': [40, 110], 's-11-114': [18, 110], 's-11-112': [15, 100], 's-19-205': [10, 140],
  's-18-187': [15, 200], 's-18-188': [8, 155], 's-25-271': [12, 140], 's-25-272': [15, 150], 's-29-311': [10, 175],
  's-29-317': [10, 175], 's-29-313': [15, 185], 's-29-314': [10, 180], 's-02-007': [18, 112], 's-02-009': [38, 98],
  's-03-019': [12, 135], 's-06-052': [38, 85], 's-07-055': [15, 92], 's-07-056': [14, 175], 's-15-155': [18, 92],
  's-15-156': [25, 120], 's-15-158': [15, 155], 's-17-178': [25, 140], 's-17-183': [15, 150], 's-18-189': [15, 125],
  's-18-194': [15, 125], 's-19-200': [40, 205], 's-20-213': [80, 128], 's-20-214': [20, 120], 's-21-227': [40, 100],
  's-23-240': [15, 72], 's-23-242': [12, 135], 's-24-253': [55, 140], 's-24-260': [18, 145], 's-25-265': [15, 145],
  's-25-273': [15, 160], 's-25-275': [15, 205], 's-25-276': [15, 205], 's-27-297': [20, 75], 's-27-298': [20, 125],
  's-29-321': [10, 125], 's-29-324': [45, 100], 's-30-337': [15, 150], 's-06-043': [15, 150], 's-06-046': [15, 65],
  's-06-049': [15, 95], 's-07-060': [30, 100], 's-07-063': [50, 100], 's-11-106': [20, 72], 's-11-111': [60, 125],
  's-14-148': [30, 120], 's-16-165': [15, 145], 's-16-166': [35, 112], 's-17-180': [12, 85], 's-18-195': [20, 112],
  's-19-203': [40, 125], 's-21-225': [20, 100], 's-23-244': [45, 150], 's-23-250': [30, 115], 's-26-284': [18, 175],
  's-27-290': [15, 165], 's-27-292': [50, 115], 's-29-319': [15, 180], 's-29-320': [22, 60], 's-31-344': [15, 100],
  's-32-351': [55, 110], 's-33-367': [15, 130], 's-25-267': [15, 165], 's-25-266': [15, 165], 's-25-270': [15, 165],
  's-25-269': [15, 165], 's-25-268': [15, 165],
};
