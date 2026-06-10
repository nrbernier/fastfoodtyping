import { describe, expect, it } from 'vitest';
import { COLORS, FONTS } from '../../src/ui/palette';

describe('aged-print palette', () => {
  it('contains no pure white or pure black', () => {
    for (const [name, value] of Object.entries(COLORS)) {
      const hex =
        typeof value === 'number'
          ? value.toString(16).padStart(6, '0')
          : value.replace('#', '').toLowerCase();
      expect(hex, name).not.toBe('ffffff');
      expect(hex, name).not.toBe('000000');
    }
  });

  it('string and hex variants of the same color agree', () => {
    expect(COLORS.creamHex).toBe(parseInt(COLORS.cream.slice(1), 16));
    expect(COLORS.redHex).toBe(parseInt(COLORS.red.slice(1), 16));
    expect(COLORS.darkHex).toBe(parseInt(COLORS.dark.slice(1), 16));
    expect(COLORS.mustardHex).toBe(parseInt(COLORS.mustard.slice(1), 16));
  });

  it('defines the four typography roles', () => {
    expect(FONTS.script).toContain('Pacifico');
    expect(FONTS.slab).toContain('Alfa Slab One');
    expect(FONTS.sans).toContain('Oswald');
    expect(FONTS.mono).toContain('Special Elite');
  });
});
