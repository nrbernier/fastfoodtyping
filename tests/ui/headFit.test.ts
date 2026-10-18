import { describe, expect, it } from 'vitest';
import { HEADS, POSES } from '../../src/ui/cast';
import { fitPose, HEAD_TOP_Y, SPRITE_HEIGHT } from '../../src/ui/headFit';

describe('fitPose', () => {
  it('has a measured head for every pose, inside the image', () => {
    for (const p of POSES) {
      const head = HEADS[p.key];
      expect(head, p.key).toBeDefined();
      expect(head[0]).toBeGreaterThanOrEqual(0);
      expect(head[1]).toBeGreaterThan(head[0]);
      expect(head[1]).toBeLessThanOrEqual(256);
    }
  });

  it('evens out head sizes across the cast', () => {
    const shown = POSES.map((p) => {
      const [skull, chin] = HEADS[p.key];
      return (chin - skull) * fitPose(HEADS[p.key], 256).scale;
    });
    const raw = POSES.map((p) => (HEADS[p.key][1] - HEADS[p.key][0]) * (SPRITE_HEIGHT / 256));
    const spread = (xs: number[]) => Math.max(...xs) / Math.min(...xs);
    expect(spread(shown)).toBeLessThan(spread(raw) / 2);
  });

  it('hangs an enlarged head at the common height and lets the body run behind the counter', () => {
    const fit = fitPose([30, 72], 256); // small head on a full figure
    expect(fit.scale).toBeGreaterThan(SPRITE_HEIGHT / 256);
    expect(fit.bottom - (256 - 30) * fit.scale).toBeCloseTo(HEAD_TOP_Y);
    expect(fit.bottom).toBeGreaterThan(0);
  });

  it('rests a shrunken close-up on the counter instead of floating', () => {
    const fit = fitPose([15, 205], 256);
    expect(fit.scale).toBeLessThan(SPRITE_HEIGHT / 256);
    expect(fit.bottom).toBe(0);
    expect(fit.top).toBeCloseTo(-256 * fit.scale);
  });

  it('falls back to the plain size without a measurement', () => {
    expect(fitPose(undefined, 256)).toEqual({ scale: SPRITE_HEIGHT / 256, bottom: 0, top: -SPRITE_HEIGHT });
  });
});
