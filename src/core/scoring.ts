import type { Order } from './types';

/** 5 tip dollars per letter (spaces excluded). */
export function baseTip(order: Order): number {
  return 5 * order.normalized.replace(/ /g, '').length;
}

/** Serve in the green (>=50% patience left) for 1.5x, yellow (>=20%) for 1.2x. */
export function patienceMultiplier(fractionLeft: number): number {
  if (fractionLeft >= 0.5) return 1.5;
  if (fractionLeft >= 0.2) return 1.2;
  return 1.0;
}

/** +0.25x per consecutive clean order before this one, capped at 3x. */
export function comboMultiplier(cleanStreak: number): number {
  return Math.min(1 + 0.25 * cleanStreak, 3);
}

export function orderTip(order: Order, patienceFractionLeft: number, cleanStreak: number): number {
  return Math.round(baseTip(order) * patienceMultiplier(patienceFractionLeft) * comboMultiplier(cleanStreak));
}
