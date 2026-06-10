// Pure clock formatting for the shift timer — kept Phaser-free so it can be
// unit-tested in the node test environment.

/** Format a millisecond remainder as "M:SS", clamped so it never goes negative. */
export function formatClock(remainingMs: number): string {
  const s = Math.max(0, Math.ceil(remainingMs / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * Wall-clock label for a shift. Finite shifts count down (duration − elapsed);
 * Overtime has no limit (durationMs = Infinity) and counts elapsed time up,
 * which avoids rendering a meaningless "Infinity:NaN".
 */
export function clockLabel(durationMs: number, elapsedMs: number): string {
  return Number.isFinite(durationMs)
    ? formatClock(durationMs - elapsedMs)
    : formatClock(elapsedMs);
}
