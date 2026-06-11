import { describe, expect, it } from 'vitest';
import { clockHandAngle, perspectiveFloorQuads, starburstPoints } from '../../src/ui/geom';

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

describe('perspectiveFloorQuads', () => {
  it('returns rows*cols quads tiling a trapezoid that narrows toward the top', () => {
    const quads = perspectiveFloorQuads({
      width: 800, top: 100, bottom: 300, rows: 4, cols: 8, vanishInset: 0.25,
    });
    expect(quads).toHaveLength(4 * 8);
    const back = quads[0];
    const front = quads[quads.length - 1];
    expect(back.points[0].y).toBeCloseTo(100);
    expect(front.points[2].y).toBeCloseTo(300);
    const backLeft = Math.min(...back.points.map((p) => p.x));
    const frontLeft = Math.min(...front.points.map((p) => p.x));
    expect(backLeft).toBeGreaterThan(frontLeft);
  });

  it('alternates the checker flag across columns and rows', () => {
    const quads = perspectiveFloorQuads({
      width: 800, top: 100, bottom: 300, rows: 2, cols: 2, vanishInset: 0.25,
    });
    expect(quads[0].dark).toBe(true);
    expect(quads[1].dark).toBe(false);
    expect(quads[2].dark).toBe(false);
    expect(quads[3].dark).toBe(true);
  });
});

describe('clockHandAngle', () => {
  it('is -90deg (straight up) at the start and sweeps clockwise', () => {
    expect(clockHandAngle(0, 60000)).toBeCloseTo(-90);
    expect(clockHandAngle(15000, 60000)).toBeCloseTo(0);   // quarter -> right
    expect(clockHandAngle(30000, 60000)).toBeCloseTo(90);  // half -> down
  });
  it('wraps each minute of the remaining window', () => {
    expect(clockHandAngle(60000, 60000)).toBeCloseTo(-90);
  });
});
