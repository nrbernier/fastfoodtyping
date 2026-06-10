import { describe, expect, it } from 'vitest';
import { starburstPoints } from '../../src/ui/geom';

describe('starburstPoints', () => {
  it('produces two points per spike (outer + inner)', () => {
    expect(starburstPoints(40, 12)).toHaveLength(24);
  });

  it('alternates outer radius and inner radius (inner = 0.78 * outer)', () => {
    const pts = starburstPoints(100, 12);
    const r0 = Math.hypot(pts[0].x, pts[0].y);
    const r1 = Math.hypot(pts[1].x, pts[1].y);
    expect(r0).toBeCloseTo(100, 5);
    expect(r1).toBeCloseTo(78, 5);
  });

  it('starts the first outer point at the top (angle -90deg)', () => {
    const [first] = starburstPoints(50, 12);
    expect(first.x).toBeCloseTo(0, 5);
    expect(first.y).toBeCloseTo(-50, 5);
  });
});
