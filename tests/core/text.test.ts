import { describe, expect, it } from 'vitest';
import { normalizeText } from '../../src/core/text';

describe('normalizeText', () => {
  it('lowercases', () => {
    expect(normalizeText('Burger')).toBe('burger');
  });

  it('strips accents', () => {
    expect(normalizeText('soufflé')).toBe('souffle');
    expect(normalizeText('jalapeño')).toBe('jalapeno');
    expect(normalizeText('sautéed')).toBe('sauteed');
  });

  it('preserves length for accented vocabulary', () => {
    expect(normalizeText('zebra soufflé')).toHaveLength('zebra soufflé'.length);
  });
});
