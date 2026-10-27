import {useEffect, useRef, type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {Tooltip} from '../../app/Tooltip';

export function ActionSheet({title, children, close, menu = false}: {title: string; children: ReactNode; close: () => void; menu?: boolean}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const onClose = useRef(close);
  onClose.current = close;
  useEffect(() => {
    const node = dialog.current!;
    const opener = document.activeElement as HTMLElement | null;
    node.showModal();
    const cancel = (event: Event) => {event.preventDefault(); onClose.current();};
    node.addEventListener('cancel', cancel);
    return () => {node.removeEventListener('cancel', cancel); node.close(); (opener?.isConnected ? opener : document.querySelector<HTMLElement>('.incident-page [aria-label="Incident actions"]'))?.focus({preventScroll: true});};
  }, []);
  return createPortal(<dialog ref={dialog} className={'incident-sheet' + (menu ? ' incident-menu-sheet' : '')} aria-label={title}>
    <div className="incident-sheet-head"><h2>{title}</h2><Tooltip label="Close" dismissOnEscape><button type="button" className="incident-icon" aria-label="Close" onClick={close}>×</button></Tooltip></div>
    <div className="incident-sheet-body">{children}</div>
  </dialog>, document.body);
}
