import {useEffect, useId, useRef, useState} from 'react';
import type {Member} from '../../family/response-operations/domain';

/** Kept in the shell so workspace polling cannot replace an open account menu. */
export function OwnerMenu({actor, signInSettings, busy, signingOut, onSignOut}: {actor: Member; signInSettings: boolean; busy: boolean; signingOut: boolean; onSignOut: () => Promise<void>}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const root = useRef<HTMLDivElement>(null), button = useRef<HTMLButtonElement>(null), menu = useRef<HTMLDivElement>(null);
  const close = () => {setOpen(false); button.current?.focus({preventScroll: true});};
  useEffect(() => {
    if (!open) return;
    menu.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus({preventScroll: true});
    const outside = (event: PointerEvent) => {if (!root.current?.contains(event.target as Node)) setOpen(false);};
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);
  return <div className="profile owner-menu" ref={root} onKeyDown={event => {
    if (event.key === 'Escape' && open) {event.preventDefault(); event.stopPropagation(); close();}
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) {setOpen(true); return;}
      const items = Array.from(menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)') ?? []);
      const index = items.indexOf(document.activeElement as HTMLElement);
      const next = (index + (event.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length;
      items[next]?.focus();
    }
  }}>
    <button className="owner-button" ref={button} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? id : undefined} onClick={() => setOpen(value => !value)}>
      <span className="avatar" aria-hidden="true">{actor.name.slice(0, 2).toUpperCase()}</span>
      <span className="owner-identity"><span className="owner-name">{actor.name}</span><span className="muted">{actor.role}</span></span>
      <span aria-hidden="true">⌄</span>
    </button>
    {open && <div className="owner-popup" ref={menu} id={id} role="menu" aria-label="Account">
      {signInSettings && <a href="/auth/settings/identity" role="menuitem">Sign-in settings</a>}
      <button role="menuitem" disabled={busy || signingOut} onClick={() => {void onSignOut();}}>{signingOut ? 'Signing out…' : 'Sign out'}</button>
    </div>}
  </div>;
}
