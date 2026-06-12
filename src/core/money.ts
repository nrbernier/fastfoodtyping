// Money formatting for the 1950s diner economy — kept Phaser-free so it can be
// unit-tested in the node test environment. Scores are tracked in whole cents.

/** Render cents as period-appropriate money: "85¢" below a dollar, "$1.20" above. */
export function formatMoney(cents: number): string {
  const c = Math.max(0, Math.round(cents));
  if (c < 100) return `${c}¢`;
  return `$${Math.floor(c / 100)}.${String(c % 100).padStart(2, '0')}`;
}
