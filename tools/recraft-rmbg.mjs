// Run Recraft removeBackground on generated candidates.
// Usage: node --env-file=.env tools/recraft-rmbg.mjs <png-path> [...more]
// Writes <name>-rmbg.png next to each input.
import { readFile, writeFile } from 'node:fs/promises';

const KEY = process.env.RECRAFT_API_KEY;
if (!KEY) throw new Error('RECRAFT_API_KEY missing — run via: node --env-file=.env');

for (const path of process.argv.slice(2)) {
  const form = new FormData();
  form.append('file', new Blob([await readFile(path)], { type: 'image/png' }), 'in.png');
  form.append('response_format', 'url');
  const res = await fetch('https://external.api.recraft.ai/v1/images/removeBackground', {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}` },
    body: form,
  });
  if (!res.ok) {
    console.error(`FAILED ${path}: HTTP ${res.status} ${await res.text()}`);
    continue;
  }
  const json = await res.json();
  const img = await fetch(json.image?.url ?? json.data?.[0]?.url);
  const out = path.replace(/\.png$/, '-rmbg.png');
  await writeFile(out, Buffer.from(await img.arrayBuffer()));
  console.log(`stripped ${out}`);
}
