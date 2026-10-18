// Customer cast: cut-outs from Stivers Studio's 1930s–50s advertising cuts
// (public domain; see assets-src/characters/SOURCES.md). Each pose is one
// image at public/characters/<key>.png, keyed by its scan id (s-<page>-<n>).
//
// `character` groups poses of the same drawn person, so the counter never
// seats them twice at once; one-off figures are their own character.
// `wacky` poses are held back for the weird (tier 3) orders of later shifts.
// `fingers` marks the Finger-Counter, who only appears for his special order.

export interface PoseDef {
  key: string;
  character: string;
  wacky: boolean;
  fingers?: number;
}

const pose = (key: string, character: string, wacky = false): PoseDef => ({ key, character, wacky });
const single = (key: string, wacky = false): PoseDef => ({ key, character: key, wacky });

export const POSES: PoseDef[] = [
  // The Agent — big-headed insurance salesman with his little dog
  pose('s-13-128', 'agent'),
  pose('s-12-121', 'agent'),
  pose('s-08-073', 'agent'),
  pose('s-13-136', 'agent'),
  pose('s-14-144', 'agent'),
  pose('s-13-135', 'agent'),
  pose('s-10-094', 'agent'),
  pose('s-08-070', 'agent', true),
  pose('s-10-091', 'agent', true),
  pose('s-10-095', 'agent', true),
  pose('s-10-098', 'agent', true),
  pose('s-12-126', 'agent', true),
  pose('s-13-129', 'agent', true),
  pose('s-14-141', 'agent', true),
  pose('s-14-145', 'agent', true),
  pose('s-32-353', 'agent', true),
  pose('s-32-357', 'agent', true),
  // The Scotsman — kilt, tam and spats, mid-jig
  pose('s-09-078', 'scotsman', true),
  pose('s-09-080', 'scotsman', true),
  pose('s-09-081', 'scotsman', true),
  pose('s-09-082', 'scotsman', true),
  pose('s-09-083', 'scotsman', true),
  pose('s-09-086', 'scotsman', true),
  // Slim — stick-thin ad man in a dark suit
  pose('s-03-021', 'slim'),
  pose('s-09-087', 'slim'),
  pose('s-17-179', 'slim'),
  pose('s-22-232', 'slim'),
  pose('s-30-329', 'slim'),
  // The Boater — long-nosed gent in a straw hat
  pose('s-04-033', 'boater'),
  pose('s-24-261', 'boater'),
  pose('s-16-170', 'boater', true),
  pose('s-30-327', 'boater', true),
  // The Big Eater — portly bald gent
  pose('s-11-114', 'bigeater'),
  pose('s-11-112', 'bigeater'),
  pose('s-19-205', 'bigeater'),
  // Four-Eyes — round glasses, side part
  pose('s-18-187', 'foureyes'),
  pose('s-18-188', 'foureyes'),
  // Specs — wire glasses, slicked hair
  pose('s-25-271', 'specs'),
  pose('s-25-272', 'specs'),
  // The Blonde — front and profile
  pose('s-29-311', 'blonde'),
  pose('s-29-317', 'blonde'),
  // The Brunette — pearls, front and profile
  pose('s-29-313', 'brunette'),
  pose('s-29-314', 'brunette'),
  // The Finger-Counter — holds up how many he wants (special order)
  { key: 's-25-267', character: 'counter', wacky: false, fingers: 1 },
  { key: 's-25-266', character: 'counter', wacky: false, fingers: 2 },
  { key: 's-25-270', character: 'counter', wacky: false, fingers: 3 },
  { key: 's-25-269', character: 'counter', wacky: false, fingers: 4 },
  { key: 's-25-268', character: 'counter', wacky: false, fingers: 5 },
  // One-off regulars
  single('s-02-007'),
  single('s-02-009'),
  single('s-03-019'),
  single('s-06-052'),
  single('s-07-055'),
  single('s-07-056'),
  single('s-15-155'),
  single('s-15-156'),
  single('s-15-158'),
  single('s-17-178'),
  single('s-17-183'),
  single('s-18-189'),
  single('s-18-194'),
  single('s-19-200'),
  single('s-20-213'),
  single('s-20-214'),
  single('s-21-227'),
  single('s-23-240'),
  single('s-23-242'),
  single('s-24-253'),
  single('s-24-260'),
  single('s-25-265'),
  single('s-25-273'),
  single('s-25-275'),
  single('s-25-276'),
  single('s-27-297'),
  single('s-27-298'),
  single('s-29-321'),
  single('s-29-324'),
  single('s-30-337'),
  // One-off oddballs
  single('s-06-043', true),
  single('s-06-046', true),
  single('s-06-049', true),
  single('s-07-060', true),
  single('s-07-063', true),
  single('s-11-106', true),
  single('s-11-111', true),
  single('s-14-148', true),
  single('s-16-165', true),
  single('s-16-166', true),
  single('s-17-180', true),
  single('s-18-195', true),
  single('s-19-203', true),
  single('s-21-225', true),
  single('s-23-244', true),
  single('s-23-250', true),
  single('s-26-284', true),
  single('s-27-290', true),
  single('s-27-292', true),
  single('s-29-319', true),
  single('s-29-320', true),
  single('s-31-344', true),
  single('s-32-351', true),
  single('s-33-367', true),
];
