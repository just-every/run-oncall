import {useEffect, useId, useRef, useState} from 'react';
import type {Member} from '../../family/response-operations/domain';

/** Kept in the shell so workspace polling cannot replace an open account menu. */
export function OwnerMenu({actor, busy, signingOut, onSignOut}: {actor: Member; busy: boolean; signingOut: boolean; onSignOut: () => Promise<void>}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const root = useRef<HTMLDivElement>(null), button = useRef<HTMLButtonElement>(null), action = useRef<HTMLButtonElement>(null);
  const close = () => {setOpen(false); button.current?.focus({preventScroll: true});};
  useEffect(() => {
    if (!open) return;
    action.current?.focus({preventScroll: true});
    const outside = (event: PointerEvent) => {if (!root.current?.contains(event.target as Node)) setOpen(false);};
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);
  return <div className="profile owner-menu" ref={root} onKeyDown={event => {
    if (event.key === 'Escape' && open) {event.preventDefault(); event.stopPropagation(); close();}
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {event.preventDefault(); setOpen(true); action.current?.focus();}
  }}>
    <button className="owner-button" ref={button} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? id : undefined} onClick={() => setOpen(value => !value)}>
      <span className="avatar" aria-hidden="true">{actor.name.slice(0, 2).toUpperCase()}</span>
      <span className="owner-identity"><span className="owner-name">{actor.name}</span><span className="muted">{actor.role}</span></span>
      <span aria-hidden="true">⌄</span>
    </button>
    {open && <div className="owner-popup" id={id} role="menu" aria-label="Account">
      <button ref={action} role="menuitem" disabled={busy || signingOut} onClick={() => {void onSignOut();}}>{signingOut ? 'Signing out…' : 'Sign out'}</button>
    </div>}
  </div>;
}
