import { describe, expect, it } from 'vitest';
import { formatMoney } from '../src/core/money';

describe('formatMoney', () => {
  it('shows cents below a dollar', () => {
    expect(formatMoney(0)).toBe('0¢');
    expect(formatMoney(5)).toBe('5¢');
    expect(formatMoney(85)).toBe('85¢');
    expect(formatMoney(99)).toBe('99¢');
  });

  it('shows dollars at or above 100 cents with two-digit cents', () => {
    expect(formatMoney(100)).toBe('$1.00');
    expect(formatMoney(120)).toBe('$1.20');
    expect(formatMoney(105)).toBe('$1.05');
    expect(formatMoney(2450)).toBe('$24.50');
  });

  it('never renders negative money', () => {
    expect(formatMoney(-10)).toBe('0¢');
  });
});
