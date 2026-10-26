import {useLayoutEffect, useRef} from 'react';

// Workspace and panel reads can both preserve the same edited field.
const corrections = new WeakMap<HTMLElement, {original: string; clear: () => void}>();

/** Keep the edited field at its exact visual position when records arrive. */
export function useViewAnchor() {
  const pending = useRef<{element: HTMLElement; top: number} | null>(null);
  useLayoutEffect(() => {
    const anchor = pending.current;
    pending.current = null;
    if (!anchor?.element.isConnected || document.activeElement !== anchor.element) return;
    const element = anchor.element;
    if (element.getBoundingClientRect().top === anchor.top) return;
    const previous = corrections.get(element);
    const original = previous?.original ?? element.style.transform;
    previous?.clear();
    const delta = element.getBoundingClientRect().top - anchor.top;
    if (delta) window.scrollBy({top: delta, behavior: 'instant'});
    // Chromium quantizes scrolling to physical pixels. Correct its remaining
    // subpixel distance before paint, without accumulating an offset per read.
    const residual = element.getBoundingClientRect().top - anchor.top;
    if (!residual) return;
    const transform = getComputedStyle(element).transform;
    const clear: () => void = () => {
      if (corrections.get(element)?.clear !== clear) return;
      element.style.transform = original;
      element.removeEventListener('blur', clear);
      corrections.delete(element);
    };
    corrections.set(element, {original, clear});
    element.style.transform = `${transform === 'none' ? '' : transform} translateY(${-residual}px)`;
    element.addEventListener('blur', clear, {once: true});
  });
  return () => {
    const element = document.activeElement;
    if (!(element instanceof HTMLElement) || !element.matches('input, textarea, select, summary') || !element.closest('main')) return;
    const box = element.getBoundingClientRect();
    if (box.bottom < 0 || box.top > window.innerHeight) return;
    pending.current = {element, top: box.top};
  };
}
