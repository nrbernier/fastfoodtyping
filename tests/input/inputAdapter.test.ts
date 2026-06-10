// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { attachPhysicalKeyboard, createHiddenInput } from '../../src/input/inputAdapter';

describe('attachPhysicalKeyboard', () => {
  it('forwards single-character keys', () => {
    const chars: string[] = [];
    const detach = attachPhysicalKeyboard(window, (c) => chars.push(c));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
    detach();
    expect(chars).toEqual(['a', ' ']);
  });

  it('ignores modifier combos and special keys', () => {
    const chars: string[] = [];
    const detach = attachPhysicalKeyboard(window, (c) => chars.push(c));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', ctrlKey: true }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'r', metaKey: true }));
    detach();
    expect(chars).toEqual([]);
  });

  it('stops forwarding after detach', () => {
    const chars: string[] = [];
    const detach = attachPhysicalKeyboard(window, (c) => chars.push(c));
    detach();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    expect(chars).toEqual([]);
  });
});

describe('createHiddenInput', () => {
  it('forwards typed characters and clears its value', () => {
    const chars: string[] = [];
    const hidden = createHiddenInput(document, (c) => chars.push(c));
    const el = document.querySelector('input')!;
    el.value = 'ab';
    el.dispatchEvent(new Event('input'));
    expect(chars).toEqual(['a', 'b']);
    expect(el.value).toBe('');
    hidden.destroy();
  });

  it('disables autocorrect-family attributes', () => {
    const hidden = createHiddenInput(document, () => {});
    const el = document.querySelector('input')!;
    expect(el.getAttribute('autocapitalize')).toBe('none');
    expect(el.getAttribute('autocomplete')).toBe('off');
    expect(el.getAttribute('autocorrect')).toBe('off');
    expect(el.getAttribute('spellcheck')).toBe('false');
    hidden.destroy();
    expect(document.querySelector('input')).toBeNull();
  });
});
