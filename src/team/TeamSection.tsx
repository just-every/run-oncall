import {useEffect, useRef, useState} from 'react';
import type {Member, State} from '../family/response-operations/domain';
import {useWorkspaceContext} from '../app/shell/WorkspaceContext';
import {autosaveRequest, useAutosave} from '../app/autosave/useAutosave';
import {SavedState, SaveFeedback} from '../app/autosave/SavedState';
import {useLeaveGuard} from '../app/autosave/leaveGuard';
import {InlineConfirm} from '../app/autosave/InlineConfirm';
import {failureMessage} from '../app/FailureLine';
import {request} from '../useWorkspace';
import {Field, Form} from '../forms';
import {TeamsPanel} from '../teams/TeamsPanel';
import {MemberRow} from './MemberRow';
import './team-section.css';
export function TeamSection() {
  const {s, actor, admin, w, page} = useWorkspaceContext(), [adding, setAdding] = useState(false);
  if (page !== 'team') return null;
  return <div className="team-section">
    <section className="panel padded"><div className="team-title"><h2>Team</h2>{admin && <button type="button" aria-expanded={adding} onClick={() => setAdding(value => !value)}>Add member</button>}</div>
      {!admin && <p>Admins can change roles and access.</p>}
      <div className="team-members">{s.members.filter(member => !member.machine).map(member => admin && !member.erased ? <MemberEditor key={member.id} member={member} state={s} admin={admin} refresh={w.refresh}/> : <MemberRow key={member.id} member={member} admin={false} role={member.role} roleChanged={() => {}} accessAction={() => {}} resetAction={() => {}}/>)}</div>
      {admin && adding && <section className="team-add" aria-label="Add member"><h3>Add member</h3><Form busy={w.busy} label="Create member" onSubmit={async data => {const result=await w.run('/api/members',data);if(result)w.setNotice('');return result;}}>
        <Field name="name" label="Name"/>
        <Field name="role" label="Role"><option value="responder">Responder</option><option value="viewer">Viewer</option><option value="stakeholder">Stakeholder</option><option value="admin">Admin</option></Field>
        <Field name="password" label="Password" type="password"/>
      </Form></section>}
    </section>
    <TeamsPanel state={s} actor={actor} refresh={w.refresh}/>
  </div>;
}
function MemberEditor({member, state, admin, refresh}: {member: Member; state: State; admin: boolean; refresh: () => Promise<void>}) {
  const snapshot = (member: Member, revision: number) => ({values:{role:member.role, active:member.active}, revision});
  const save = useAutosave({storageKey:'member:'+member.id,snapshot:snapshot(member,state.revision), read:async () => {
    const latest: State = await request('/api/state');
    const found = latest.members.find(row => row.id === member.id);
    if (!found) throw Error('This member is no longer available.');
    return snapshot(found,latest.revision);
  }, write:async change => {
    const result = await autosaveRequest('/api/command', {type:'member',id:member.id,field:change.field,from:change.from,to:change.to});
    const latest: State = await request('/api/state');
    void refresh();return {...snapshot(latest.members.find(row => row.id === member.id)!,latest.revision),changed:result.changed !== false};
  }});
  const [adminConfirm, setAdminConfirm] = useState(false), [action, setAction] = useState<'access' | 'password' | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [resetVersion, setResetVersion] = useState(0), [resetSaved, setResetSaved] = useState(false);
  useEffect(() => {if (!resetSaved) return;const timer=setTimeout(() => setResetSaved(false),2000);return () => clearTimeout(timer);}, [resetSaved]);
  const [accessTarget, setAccessTarget] = useState(false);
  const password = useRef('');
  const [openRequest, setOpenRequest] = useState(0);
  const guard = useRef({flush:async () => true,pagehide:() => {},pending:(): boolean => false});
  guard.current.flush = async () => {if (action) setOpenRequest(n => n + 1);return !adminConfirm && !action;};
  guard.current.pending = () => adminConfirm || !!action;
  useLeaveGuard(guard.current);
  const cancel = () => {setAction(null); setError(''); password.current = '';};
  return <MemberRow member={member} admin={admin} role={adminConfirm ? 'admin' : save.values.role} roleChanged={role => {if(role === 'admin' && member.role !== 'admin') setAdminConfirm(true);else {setAdminConfirm(false);save.change('role',role,'choice');}}}
    roleMark={<SavedState state={save.states.role}/>}
    roleFeedback={<SaveFeedback state={save.states.role} retry={() => save.retry('role')} useMine={() => save.useMine('role')}/>}
    roleConfirm={adminConfirm && <InlineConfirm action="Make admin" keep="Keep the old role" onCancel={() => setAdminConfirm(false)} onConfirm={() => {save.change('role','admin','choice');setAdminConfirm(false);}}>Make {member.name} an Admin? They can manage services, people and archives.</InlineConfirm>}
    accessAction={() => {setAccessTarget(!member.active);setAction('access');setError('');}}
    resetAction={value => {password.current=value;setAction('password');setError('');}}
    busy={busy} openRequest={openRequest} resetVersion={resetVersion}
    confirmation={action && <InlineConfirm action={action === 'password' ? 'Reset password' : accessTarget ? 'Restore access' : 'Revoke access'} keep={action === 'password' ? 'Keep the old password' : 'Keep the current access'} busy={busy} onCancel={cancel} onConfirm={async () => {
      if (action === 'access') {save.change('active',accessTarget,'choice');setAction(null);return;}
      setBusy(true);setError('');
      try {await request('/api/password',{member:member.id,password:password.current});cancel();setResetVersion(n => n + 1);setResetSaved(true);await refresh();}
      catch (cause) {setError(failureMessage(cause));}
      finally {setBusy(false);}
    }}>{action === 'password' ? `Reset ${member.name}’s password? This ends their current sessions.` : !accessTarget ? `Revoke ${member.name}’s access? Their current sessions will end.` : `Restore ${member.name}’s access? They can sign in again.`}</InlineConfirm>}
    accessFeedback={<><SaveFeedback state={save.states.active} retry={() => save.retry('active')} useMine={() => save.useMine('active')}/>{['failed','conflict'].includes(save.states.active?.status ?? '') && <button type="button" onClick={() => save.change('active',member.active,'choice')}>Keep current access</button>}</>}
    feedback={<>{error && <p role="alert">{error}</p>}{resetSaved && <p role="status">Password reset</p>}</>}/>;
}
