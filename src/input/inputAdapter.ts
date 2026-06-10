/** Forward printable single characters from a physical keyboard. Returns a detach fn. */
export function attachPhysicalKeyboard(target: EventTarget, onChar: (c: string) => void): () => void {
  const handler = (e: Event) => {
    const ke = e as KeyboardEvent;
    if (ke.ctrlKey || ke.metaKey || ke.altKey) return;
    if (ke.key.length !== 1) return;
    if (ke.key === ' ') ke.preventDefault(); // avoid page scroll
    onChar(ke.key);
  };
  target.addEventListener('keydown', handler);
  return () => target.removeEventListener('keydown', handler);
}

export interface HiddenInput {
  focus(): void;
  destroy(): void;
}

/**
 * Invisible input that keeps the mobile keyboard summoned. Characters are
 * forwarded then the field is cleared, so autocomplete has nothing to chew on.
 */
export function createHiddenInput(doc: Document, onChar: (c: string) => void): HiddenInput {
  const el = doc.createElement('input');
  el.type = 'text';
  el.setAttribute('autocapitalize', 'none');
  el.setAttribute('autocomplete', 'off');
  el.setAttribute('autocorrect', 'off');
  el.setAttribute('spellcheck', 'false');
  el.setAttribute('aria-hidden', 'true');
  el.style.cssText =
    'position:fixed;bottom:0;left:0;width:1px;height:1px;opacity:0.01;border:0;padding:0;background:transparent;z-index:-1;';
  doc.body.appendChild(el);

  const onInput = () => {
    const value = el.value;
    el.value = '';
    for (const ch of value) onChar(ch);
  };
  el.addEventListener('input', onInput);

  return {
    focus: () => el.focus(),
    destroy: () => {
      el.removeEventListener('input', onInput);
      el.remove();
    },
  };
}

export function isTouchDevice(): boolean {
  return typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
}
