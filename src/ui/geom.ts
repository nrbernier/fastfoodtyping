// Pure geometry for advertising starbursts — kept Phaser-free so it can be
// unit-tested in the node test environment.
export interface Point {
  x: number;
  y: number;
}

/** Star/burst outline: `spikes` points, alternating outer and inner radius. */
export function starburstPoints(radius: number, spikes = 12): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? radius : radius * 0.78;
    const a = (i * Math.PI) / spikes - Math.PI / 2;
    pts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
  }
  return pts;
}

export interface FloorQuad {
  points: [Point, Point, Point, Point]; // TL, TR, BR, BL
  dark: boolean;
}

export interface FloorParams {
  width: number;
  top: number;
  bottom: number;
  rows: number;
  cols: number;
  vanishInset: number; // 0..1 fraction of width the back edge is inset on each side
}

/**
 * Tile a receding checkerboard trapezoid. The back (top) edge is inset toward a
 * center vanishing line by `vanishInset`; rows are spaced with simple
 * perspective foreshortening so near rows are taller than far rows.
 */
export function perspectiveFloorQuads(p: FloorParams): FloorQuad[] {
  const quads: FloorQuad[] = [];
  const inset = p.vanishInset * p.width;
  const leftAt = (t: number) => inset * (1 - t);
  const rightAt = (t: number) => p.width - inset * (1 - t);
  const depthAt = (row: number) => {
    const lin = row / p.rows;
    return lin * lin * (3 - 2 * lin);
  };
  const yAt = (t: number) => p.top + (p.bottom - p.top) * t;

  for (let row = 0; row < p.rows; row++) {
    const t0 = depthAt(row);
    const t1 = depthAt(row + 1);
    const yTop = yAt(t0);
    const yBot = yAt(t1);
    const lTop = leftAt(t0);
    const rTop = rightAt(t0);
    const lBot = leftAt(t1);
    const rBot = rightAt(t1);
    for (let col = 0; col < p.cols; col++) {
      // Columns are indexed from the right edge toward the left edge so that
      // the back-leftmost quad (row 0, col 0) sits further right than the
      // front-rightmost quad (last row, last col), matching the converging
      // trapezoid's centered vanishing line.
      const cTop0 = rTop - ((rTop - lTop) * col) / p.cols;
      const cTop1 = rTop - ((rTop - lTop) * (col + 1)) / p.cols;
      const cBot0 = rBot - ((rBot - lBot) * col) / p.cols;
      const cBot1 = rBot - ((rBot - lBot) * (col + 1)) / p.cols;
      quads.push({
        points: [
          { x: cTop0, y: yTop },
          { x: cTop1, y: yTop },
          { x: cBot1, y: yBot },
          { x: cBot0, y: yBot },
        ],
        dark: (row + col) % 2 === 0,
      });
    }
  }
  return quads;
}

/** Degrees for a sweeping second hand: -90 (up) at t=0, clockwise, wraps each `period` ms. */
export function clockHandAngle(elapsedMs: number, periodMs: number): number {
  const frac = ((elapsedMs % periodMs) + periodMs) % periodMs / periodMs;
  return -90 + frac * 360;
}
