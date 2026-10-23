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

/** Degrees for a sweeping second hand: -90 (up) at t=0, clockwise, wraps each `period` ms. */
export function clockHandAngle(elapsedMs: number, periodMs: number): number {
  const frac = ((elapsedMs % periodMs) + periodMs) % periodMs / periodMs;
  return -90 + frac * 360;
}

/**
 * Split an order into ticket lines no wider than `fits` allows, breaking only
 * at spaces. Each line is [start, end) into the text; a breaking space stays
 * at the end of its line so every character belongs to exactly one line.
 */
export function wrapOrder(text: string, fits: (line: string) => boolean): Array<[number, number]> {
  const lines: Array<[number, number]> = [];
  let start = 0;
  let lastBreak = -1;
  for (let i = 0; i <= text.length; i++) {
    if (i < text.length && text[i] !== ' ') continue;
    if (!fits(text.slice(start, i)) && lastBreak > start) {
      lines.push([start, lastBreak + 1]);
      start = lastBreak + 1;
    }
    lastBreak = i;
  }
  lines.push([start, text.length]);
  return lines;
}
