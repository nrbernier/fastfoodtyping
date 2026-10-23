import { describe, expect, it } from 'vitest';
import { clockHandAngle, starburstPoints, wrapOrder } from '../../src/ui/geom';

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


describe('wrapOrder', () => {
  const fitsChars = (n: number) => (line: string) => line.length <= n;

  it('keeps a short order on one line', () => {
    expect(wrapOrder('apple pie', fitsChars(20))).toEqual([[0, 9]]);
  });

  it('breaks at spaces, leaving each breaking space on its line', () => {
    const text = 'soufflé de zèbre hanté';
    const lines = wrapOrder(text, fitsChars(12));
    expect(lines.map(([a, b]) => text.slice(a, b))).toEqual(['soufflé de ', 'zèbre hanté']);
    expect(lines[0][0]).toBe(0);
    expect(lines.at(-1)![1]).toBe(text.length);
  });

  it('never splits inside a word, even one too long to fit', () => {
    expect(wrapOrder('taxidermied pie', fitsChars(5)).length).toBe(2);
  });
});
