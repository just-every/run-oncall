import {useLayoutEffect, useRef} from 'react';

/** Keep the responder's place when records arrive above the field being edited. */
export function useViewAnchor() {
  const pending = useRef<{element: HTMLElement; top: number} | null>(null);
  useLayoutEffect(() => {
    const anchor = pending.current;
    pending.current = null;
    if (!anchor?.element.isConnected || document.activeElement !== anchor.element) return;
    const delta = anchor.element.getBoundingClientRect().top - anchor.top;
    if (Math.abs(delta) > 0.5) window.scrollBy({top: delta, behavior: 'instant'});
  });
  return () => {
    const element = document.activeElement;
    if (!(element instanceof HTMLElement) || !element.matches('input, textarea, select, summary') || !element.closest('main')) return;
    const box = element.getBoundingClientRect();
    if (box.bottom < 0 || box.top > window.innerHeight) return;
    pending.current = {element, top: box.top};
  };
}
