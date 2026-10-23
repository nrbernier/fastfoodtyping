import { describe, expect, it } from 'vitest';
import { BIOS } from '../../src/ui/bios';
import { POSES } from '../../src/ui/cast';

describe('scrapbook bios', () => {
  it('has a name and a bio for every character in the cast, and none extra', () => {
    const characters = new Set(POSES.map((p) => p.character));
    for (const c of characters) {
      expect(BIOS[c]?.name, c).toBeTruthy();
      expect(BIOS[c]?.bio.length, c).toBeGreaterThan(30);
    }
    for (const key of Object.keys(BIOS)) expect(characters.has(key), key).toBe(true);
  });

  it('gives every character a different name', () => {
    const names = Object.values(BIOS).map((b) => b.name);
    expect(new Set(names).size).toBe(names.length);
  });
});
