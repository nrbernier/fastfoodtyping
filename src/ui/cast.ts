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
  single('s-17-183', 1),
  single('s-18-189', 1),
  single('s-18-194', 1),
  single('s-19-200', 2),
  single('s-20-213', 2),
  single('s-20-214', 1),
  single('s-21-227', 2),
  single('s-23-240', 2),
  single('s-23-242', 1),
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
