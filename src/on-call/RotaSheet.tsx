import {useEffect, useRef, type ReactNode} from 'react';
import {leaveAfterSaving} from '../app/autosave/leaveGuard';
import {Tooltip} from '../app/Tooltip';
export function RotaSheet({title, close, children}: {title: string; close: () => void; children: ReactNode}) {
  const panel = useRef<HTMLDivElement>(null), opener = useRef<HTMLElement | null>(null);
  useEffect(() => {
    opener.current = document.activeElement as HTMLElement;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panel.current?.focus();
    return () => {document.body.style.overflow = previous;opener.current?.focus();};
  }, []);
  const dismiss = () => {void leaveAfterSaving(close);};
  return <div className="oc-sheet-backdrop" onMouseDown={event => {if (event.target === event.currentTarget) dismiss();}}><div className="oc-sheet" ref={panel} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} onKeyDown={event => {
    if (event.key === 'Escape') {event.preventDefault();dismiss();}
    if (event.key !== 'Tab') return;
    const controls = Array.from(panel.current!.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),summary,[tabindex="0"]')).filter(control => control.getClientRects().length);
    const first = controls[0], last = controls.at(-1);
    if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) {event.preventDefault();last?.focus();}
    else if (!event.shiftKey && document.activeElement === last) {event.preventDefault();first?.focus();}
  }}><header><h2>{title}</h2><Tooltip label="Close sheet"><button type="button" aria-label="Close sheet" onClick={dismiss}>×</button></Tooltip></header>{children}</div></div>;
}
