import {useEffect, useRef} from 'react';

/** Position the shared tooltip within this screen's viewport, including inside scrolled bands. */
export function useRotaTooltips<T extends HTMLElement = HTMLDivElement>() {
  const root = useRef<T>(null);
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    let active: HTMLElement | null = null;
    const place = () => {
      if (!active?.isConnected) return;
      const tip = active.querySelector<HTMLElement>('[role=tooltip]');
      if (!tip) return;
      const rect = active.getBoundingClientRect();
      tip.style.position = 'fixed';tip.style.bottom = 'auto';tip.style.right = 'auto';
      tip.style.maxWidth = Math.max(80, innerWidth - 24) + 'px';
      const size = tip.getBoundingClientRect();
      tip.style.left = Math.max(12, Math.min(innerWidth - size.width - 12, rect.left + rect.width / 2 - size.width / 2)) + 'px';
      tip.style.top = (rect.top >= size.height + 12 ? rect.top - size.height - 6 : rect.bottom + 6) + 'px';
    };
    const enter = (event: Event) => {
      const target = (event.target as Element).closest<HTMLElement>('.oncall-tooltip');
      if (!target || !element.contains(target)) return;
      active = target;
      const tip = target.querySelector<HTMLElement>('[role=tooltip]');
      if (tip) {tip.style.removeProperty('visibility');tip.style.removeProperty('opacity');}
      place();
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      const tip = active?.querySelector<HTMLElement>('[role=tooltip]');
      if (tip) {tip.style.visibility = 'hidden';tip.style.opacity = '0';}
    };
    element.addEventListener('pointerover', enter);element.addEventListener('focusin', enter);
    element.addEventListener('keydown', escape);window.addEventListener('scroll', place, true);window.addEventListener('resize', place);
    return () => {element.removeEventListener('pointerover', enter);element.removeEventListener('focusin', enter);element.removeEventListener('keydown', escape);window.removeEventListener('scroll', place, true);window.removeEventListener('resize', place);};
  }, []);
  return root;
}
