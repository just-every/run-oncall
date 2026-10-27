import {useEffect, useId, useRef, useState, type ReactNode} from 'react';
import {Tooltip} from '../app/Tooltip';
import type {Member, Role} from '../family/response-operations/domain';
export const roleName = (role: string) => role[0].toUpperCase() + role.slice(1);
type Props = {member: Member; admin: boolean; role: Role; roleChanged: (role: Role) => void; roleMark?: ReactNode; roleFeedback?: ReactNode; roleConfirm?: ReactNode; accessAction: () => void; resetAction: (password: string) => void; confirmation?: ReactNode; feedback?: ReactNode; accessFeedback?: ReactNode; busy?: boolean; openRequest?: number; resetVersion?: number};
export function MemberRow({member, admin, role, roleChanged, roleMark, roleFeedback, roleConfirm, accessAction, resetAction, confirmation, feedback, accessFeedback, busy, openRequest, resetVersion}: Props) {
  const [tipDismissed, setTipDismissed] = useState(false);
  const [open, setOpen] = useState(false), [resetting, setResetting] = useState(false), [password, setPassword] = useState('');
  const opener = useRef<HTMLButtonElement>(null), menu = useRef<HTMLDivElement>(null), id = useId();
  useEffect(() => {if (openRequest) setOpen(true);}, [openRequest]);
  useEffect(() => {if (resetVersion) {setPassword('');setResetting(false);opener.current?.focus();}}, [resetVersion]);
  const close = () => {setOpen(false); opener.current?.focus();};
  useEffect(() => {
    if (!open) return;
    menu.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const outside = (event: PointerEvent) => {
      if (!menu.current?.contains(event.target as Node) && !opener.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {if (event.key === 'Escape') close();};
    document.addEventListener('pointerdown', outside);window.addEventListener('keydown', escape);
    return () => {document.removeEventListener('pointerdown', outside);window.removeEventListener('keydown', escape);};
  }, [open]);
  return <article className="team-member" aria-label={member.name}>
    <div className="team-member-main"><h3>{member.name}</h3>{(!admin || !member.active) && <p>{!admin ? roleName(member.role) + (!member.active ? ' · Access revoked' : '') : 'Access revoked'}</p>}</div>
    {admin && !member.erased ? <>
      <div className="team-member-role"><label className="field"><span>Role {roleMark}</span><select aria-label={'Role for ' + member.name} value={role} onChange={event => roleChanged(event.target.value as Role)}>{(['viewer', 'stakeholder', 'responder', 'admin'] as const).map(value => <option key={value} value={value}>{roleName(value)}</option>)}</select></label>{roleConfirm}{roleFeedback}</div>
      <div className="team-member-actions" data-tip-dismissed={tipDismissed || undefined}><Tooltip label="Member actions"><button ref={opener} type="button" onMouseEnter={() => setTipDismissed(false)} onFocus={() => setTipDismissed(false)} onKeyDown={event => {if (event.key === 'Escape') setTipDismissed(true);}} aria-label="Member actions" aria-expanded={open} aria-controls={id} onClick={() => setOpen(value => !value)}>⋯</button></Tooltip>
        {open && <div className="team-row-menu" id={id} ref={menu} role="region" aria-label={'Actions for ' + member.name} onKeyDown={event => {if (event.key === 'Escape') {event.stopPropagation(); close();}}}>
          <h4>{member.name}</h4>
          {!confirmation && <button type="button" disabled={busy} onClick={accessAction}>{member.active ? 'Revoke access' : 'Restore access'}</button>}
          {member.active && !confirmation && <button type="button" aria-expanded={resetting} onClick={() => setResetting(value => !value)}>Reset password</button>}
          {resetting && member.active && <form onSubmit={event => {event.preventDefault(); resetAction(password);}}><label className="field">New password<input type="password" autoComplete="new-password" required minLength={12} value={password} onChange={event => setPassword(event.target.value)}/></label><button type="submit" disabled={busy}>Reset</button></form>}
          {confirmation}{feedback}
          <button type="button" onClick={close}>Done</button>
        </div>}
      </div>
      <div className="team-member-feedback">{accessFeedback}</div>
    </> : null}
  </article>;
}
