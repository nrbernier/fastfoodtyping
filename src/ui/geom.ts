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
