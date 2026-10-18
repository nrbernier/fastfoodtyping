// End-of-shift receipt: the printed lines and the missed-key heatmap colours.
import { PACES } from '../core/difficulty';
import { formatMoney } from '../core/money';
import { trickiestPair, weakLetters, type KeyTally } from '../core/typingStats';
import type { OrderTiming, ShiftResult } from '../core/types';

/** Longest order text quoted on the receipt before it is cut short. */
export const QUOTE_MAX = 22;

export const KEY_ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];

/**
 * A receipt row: a stat with its value right-aligned behind a dotted leader,
 * a centred heading, a rule, or an indented note under the stat above.
 */
export type ReceiptRow =
  | { kind: 'stat'; label: string; value: string }
  | { kind: 'title'; text: string }
  | { kind: 'note'; text: string }
  | { kind: 'rule' };

function quoted(t: OrderTiming): string {
  const text = t.text.length > QUOTE_MAX ? `${t.text.slice(0, QUOTE_MAX - 1)}…` : t.text;
  return `"${text}"`;
}

export function receiptRows(r: ShiftResult, shiftName: string): ReceiptRow[] {
  const stat = (label: string, value: string): ReceiptRow => ({ kind: 'stat', label, value });
  const pair = trickiestPair(r.tally);
  const rows: ReceiptRow[] = [
    { kind: 'title', text: "MEL'S DINER" },
    { kind: 'title', text: 'shift receipt' },
    { kind: 'rule' },
    { kind: 'title', text: shiftName },
    { kind: 'title', text: `pace: ${PACES[r.pace].label}` },
    { kind: 'rule' },
    stat('orders served', String(r.served)),
    stat('walked out', String(r.strikes)),
    stat('tips', formatMoney(r.score)),
    stat('speed', `${Math.round(r.wpm)} wpm`),
    stat('accuracy', `${Math.round(r.accuracy * 100)}%`),
    stat('best streak', `x${r.bestCombo}`),
  ];
  if (r.fastest) rows.push(stat('fastest', `${Math.round(r.fastest.wpm)} wpm`), { kind: 'note', text: quoted(r.fastest) });
  if (r.slowest && r.slowest.text !== r.fastest?.text) {
    rows.push(stat('slowest', `${Math.round(r.slowest.wpm)} wpm`), { kind: 'note', text: quoted(r.slowest) });
  }
  rows.push(stat('trickiest pair', pair ? `"${pair}"` : 'none'));
  return rows;
}

/** One line on what the next shift will drill, from the running tally. */
export function nextShiftTip(history: KeyTally): string {
  const letters = weakLetters(history).map((k) => k.toUpperCase());
  const pair = trickiestPair(history);
  const parts = [...letters, ...(pair ? [`"${pair}"`] : [])];
  if (parts.length === 0) return 'Next shift: clean hands, chef!';
  const list = parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')} & ${parts[parts.length - 1]}`;
  return `Next shift: more ${list}`;
}

/** Heatmap fill for a key: grey if untyped, green if clean, mustard to red as misses grow. */
export function keyHeat(tally: KeyTally, key: string): number {
  const misses = tally.misses[key] ?? 0;
  const hits = tally.hits[key] ?? 0;
  if (misses + hits === 0) return 0xd9d1c2;
  if (misses === 0) return 0xbfdcae;
  const t = Math.min(1, misses / (misses + hits) / 0.25);
  const mix = (a: number, b: number) => Math.round(a + (b - a) * t);
  return (mix(0xf0, 0xd6) << 16) | (mix(0xc8, 0x3b) << 8) | mix(0x5a, 0x2a);
}
