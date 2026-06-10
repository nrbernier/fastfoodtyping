import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CHARACTERS, characterKeyFor, PLACEHOLDER_KEY } from '../../src/ui/assets';

const publicDir = fileURLToPath(new URL('../../public', import.meta.url));

describe('character manifest', () => {
  it('every entry has a processed image on disk', () => {
    for (const c of CHARACTERS) {
      expect(existsSync(`${publicDir}/${c.file}`), c.key).toBe(true);
    }
  });

  it('keys are unique', () => {
    expect(new Set(CHARACTERS.map((c) => c.key)).size).toBe(CHARACTERS.length);
  });

  it('falls back to the placeholder when the cast is empty, cycles otherwise', () => {
    if (CHARACTERS.length === 0) {
      expect(characterKeyFor(0)).toBe(PLACEHOLDER_KEY);
      expect(characterKeyFor(7)).toBe(PLACEHOLDER_KEY);
    } else {
      expect(characterKeyFor(0)).toBe(CHARACTERS[0].key);
      expect(characterKeyFor(CHARACTERS.length)).toBe(CHARACTERS[0].key);
    }
  });
});
