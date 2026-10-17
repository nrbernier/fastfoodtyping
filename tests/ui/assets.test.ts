import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../../src/core/rng';
import { CHARACTERS, pickPose, TITLE_LINEUP } from '../../src/ui/assets';
import { POSES } from '../../src/ui/cast';

const publicDir = fileURLToPath(new URL('../../public', import.meta.url));
const byKey = new Map(POSES.map((p) => [p.key, p]));

describe('character manifest', () => {
  it('every entry has a processed image on disk', () => {
    for (const c of CHARACTERS) {
      expect(existsSync(`${publicDir}/${c.file}`), c.key).toBe(true);
    }
  });

  it('keys are unique', () => {
    expect(new Set(CHARACTERS.map((c) => c.key)).size).toBe(CHARACTERS.length);
  });

  it('has a Finger-Counter pose for every count from one to five', () => {
    const counts = POSES.filter((p) => p.fingers).map((p) => p.fingers).sort();
    expect(counts).toEqual([1, 2, 3, 4, 5]);
  });

  it('title lineup only uses poses in the cast', () => {
    for (const key of TITLE_LINEUP) expect(byKey.has(key), key).toBe(true);
  });
});

describe('pickPose', () => {
  it('sends the Finger-Counter with the matching hand for a special', () => {
    for (let f = 1; f <= 5; f++) {
      expect(pickPose({ tier: 1, fingers: f }, new Set(), mulberry32(f)).fingers).toBe(f);
    }
  });

  it('keeps wacky poses and the Finger-Counter out of regular orders', () => {
    const rng = mulberry32(7);
    for (let i = 0; i < 500; i++) {
      const p = pickPose({ tier: i % 2 ? 1 : 2 }, new Set(), rng);
      expect(p.wacky, p.key).toBe(false);
      expect(p.fingers, p.key).toBeUndefined();
    }
  });

  it('brings mostly wacky poses for weird orders', () => {
    const rng = mulberry32(8);
    let wacky = 0;
    for (let i = 0; i < 1000; i++) if (pickPose({ tier: 3 }, new Set(), rng).wacky) wacky++;
    expect(wacky).toBeGreaterThan(650);
    expect(wacky).toBeLessThan(850);
  });

  it('never seats a character who is already at the counter', () => {
    const rng = mulberry32(9);
    const seated = new Set(['agent', 'slim', 'bigeater', 'scotsman']);
    for (let i = 0; i < 500; i++) {
      const p = pickPose({ tier: (1 + (i % 3)) as 1 | 2 | 3 }, seated, rng);
      expect(seated.has(p.character), p.key).toBe(false);
    }
  });
});
