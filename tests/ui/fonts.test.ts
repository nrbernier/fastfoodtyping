import { readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = fileURLToPath(new URL('../..', import.meta.url));

const FONT_FILES = [
  'pacifico.woff2',
  'alfa-slab-one.woff2',
  'oswald-500.woff2',
  'oswald-700.woff2',
  'special-elite.woff2',
];

describe('self-hosted webfonts', () => {
  it('ships all five woff2 files at a non-trivial size', () => {
    for (const f of FONT_FILES) {
      const size = statSync(`${root}/public/fonts/${f}`).size;
      expect(size, f).toBeGreaterThan(2048);
    }
  });

  it('declares every font via @font-face using a base-path-safe URL', () => {
    const html = readFileSync(`${root}/index.html`, 'utf8');
    for (const f of FONT_FILES) {
      // %BASE_URL% (not a bare /fonts/...) so fonts resolve under a sub-path deploy
      expect(html, f).toContain(`%BASE_URL%fonts/${f}`);
    }
    for (const family of ['Pacifico', 'Alfa Slab One', 'Oswald', 'Special Elite']) {
      expect(html, family).toContain(`font-family: '${family}'`);
    }
  });

  it('precaches fonts and character art offline via workbox glob', () => {
    const config = readFileSync(`${root}/vite.config.ts`, 'utf8');
    expect(config).toMatch(/globPatterns:\s*\[[^\]]*woff2/);
    expect(config).toMatch(/globPatterns:\s*\[[^\]]*png/);
  });
});
