// Recraft API generation for the cast (Task 11).
// Usage: node --env-file=.env tools/recraft-gen.mjs cast
// Images land in assets-src/characters/candidates/ for review (picks get
// promoted to assets-src/characters/<key>.png and reprocessed afterwards).
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const API = 'https://external.api.recraft.ai/v1/images/generations';
const KEY = process.env.RECRAFT_API_KEY;
if (!KEY) throw new Error('RECRAFT_API_KEY missing — run via: node --env-file=.env');

const OUT = 'assets-src/characters/candidates';

const PREAMBLE =
  '1950s American advertising illustration, black and white grayscale, smooth confident ' +
  'ink linework with halftone dot shading, vintage screen-print look, one single isolated ' +
  'full-body character standing centered with generous empty white margin separating it ' +
  'from all four frame edges, plain solid white background, nothing else in frame: no other ' +
  'people or partial figures even at the edges, not holding any sign, card, board, or blank ' +
  'placard, no furniture or props, no text, no border';

const CAST = {
  housewife:
    'cheerful 1950s housewife in a polka-dot dress and gloves, clutching her handbag, hands empty otherwise',
  businessman:
    'impatient portly businessman in a suit and fedora, checking his wristwatch, hands empty otherwise',
  kid:
    '1950s newsboy character, about 10 years old, flat cap and suspenders, holding a rolled ' +
    'newspaper under one arm, the only figure in the image, white void background, no other ' +
    'character anywhere in frame',
  grandma:
    'sweet grandmother in a flowered hat and shawl, leaning on a tiny umbrella, hands otherwise empty',
  cowboy:
    'lanky cowboy in a ten-gallon hat and boots, both thumbs hooked into his belt buckle, hands empty',
  teenager:
    '1950s teenage girl with a ponytail, poodle skirt and saddle shoes, chewing gum, hands empty',
  waiter:
    'off-duty short-order cook in an apron and paper hat, towel over his shoulder, hands otherwise empty',
  robot: 'friendly boxy 1950s retro robot with an antenna, standing politely, hands empty',
  alien:
    'goofy B-movie alien with bug eyes and antennae, wearing a bubble space helmet, hands empty',
  beatnik: 'cool beatnik with beret, dark sunglasses, goatee and turtleneck, hands in pockets',
};

// Custom style derived from Food Chain Magnate reference crops (see
// recraft-style.json), constrained to monochrome ink on white.
const MONO = {
  colors: [{ rgb: [38, 34, 30] }, { rgb: [255, 255, 255] }],
  background_color: { rgb: [255, 255, 255] },
};
const { id: STYLE_ID } = JSON.parse(await readFile('assets-src/characters/recraft-style.json', 'utf8'));
const CAST_STYLE = { style_id: STYLE_ID, controls: MONO };

const JOBSETS = {
  cast: Object.entries(CAST).map(([key, prompt]) => ({ name: `gen-${key}`, prompt, ...CAST_STYLE })),
};

const jobs = JOBSETS[process.argv[2]];
if (!jobs) throw new Error(`usage: recraft-gen.mjs <${Object.keys(JOBSETS).join('|')}>`);

await mkdir(OUT, { recursive: true });
for (const job of jobs) {
  const body = {
    prompt: `${PREAMBLE}, ${job.prompt}`,
    model: 'recraftv3',
    size: '1024x1536',
    response_format: 'url',
    style_id: job.style_id,
    controls: job.controls,
  };
  const res = await fetch(API, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    console.error(`FAILED ${job.name}: HTTP ${res.status} ${await res.text()}`);
    continue;
  }
  const json = await res.json();
  const url = json.data?.[0]?.url;
  if (!url) {
    console.error(`FAILED ${job.name}: no url in response ${JSON.stringify(json)}`);
    continue;
  }
  const img = await fetch(url);
  const buf = Buffer.from(await img.arrayBuffer());
  await writeFile(`${OUT}/${job.name}.png`, buf);
  console.log(`generated ${job.name}.png (${(buf.length / 1024).toFixed(0)} KB)`);
}
