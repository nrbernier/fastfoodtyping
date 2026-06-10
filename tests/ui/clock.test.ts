import { describe, expect, it } from 'vitest';
import { clockLabel, formatClock } from '../../src/ui/clock';

describe('formatClock', () => {
  it('formats minutes and zero-padded seconds', () => {
    expect(formatClock(90_000)).toBe('1:30');
    expect(formatClock(5_000)).toBe('0:05');
  });

  it('clamps negative remainders to 0:00', () => {
    expect(formatClock(-1_000)).toBe('0:00');
  });
});

describe('clockLabel', () => {
  it('counts down for a finite shift', () => {
    expect(clockLabel(120_000, 30_000)).toBe('1:30');
  });

  it('counts elapsed time up for Overtime (Infinity), never "Infinity:NaN"', () => {
    expect(clockLabel(Infinity, 0)).toBe('0:00');
    expect(clockLabel(Infinity, 65_000)).toBe('1:05');
  });
});
