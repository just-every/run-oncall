import {useEffect, useRef, useState} from 'react';
import type {Service, State} from '../family/response-operations/domain';
import {request} from '../useWorkspace';
import {autosaveRequest, useAutosave} from '../app/autosave/useAutosave';
import {SavedState, SaveFeedback} from '../app/autosave/SavedState';
import {InlineConfirm} from '../app/autosave/InlineConfirm';
import {useLeaveGuard} from '../app/autosave/leaveGuard';
import {readLocalDraft, removeLocalDraft, writeLocalDraft} from '../app/autosave/localDraft';
import {ServiceHead, serviceValues, type ServiceValues} from './ServiceHead';
type Pending = Partial<Pick<ServiceValues, 'pager' | 'team'>>;
export function ServiceHeadEditor({service, state, admin, refresh, focusName}: {service: Service; state: State; admin: boolean; refresh: () => Promise<void>; focusName?: boolean}) {
  const snapshot = (service: Service, revision: number) => ({values:serviceValues(service), revision});
  const save = useAutosave<ServiceValues>({equal:(a,b) => {const clean=(value:unknown) => Array.isArray(value) ? value.map(item => typeof item === 'string' ? item.trim() : item).filter(Boolean) : typeof value === 'string' ? value.trim() : value;return JSON.stringify(clean(a)) === JSON.stringify(clean(b));},snapshot:snapshot(service,state.revision), read:async () => {
    const latest: State = await request('/api/state');
    const found = latest.services.find(row => row.id === service.id);
    if (!found) throw Error('This service is no longer available.');
    return snapshot(found, latest.revision);
  }, write:async change => {
    const value = change.field === 'runbook' ? (change.to as string[]).map(step => step.trim()).filter(Boolean) : typeof change.to === 'string' ? change.to.trim() : change.to;
    const result = await autosaveRequest('/api/command', {type:'service', id:service.id, field:change.field, from:change.from, to:value});
    const latest: State = await request('/api/state');
    void refresh();
    return snapshot(latest.services.find(row => row.id === service.id) ?? result, latest.revision);
  }});
  const [pending, setPending] = useState<Pending>({}), [pagerAsk, setPagerAsk] = useState(false);
  const stage = (value: Pending) => {setPending(value); if (Object.keys(value).length) writeLocalDraft({kind:'service-confirm',id:service.id,baseVersion:0,value}); else removeLocalDraft('service-confirm',service.id,0);};
  useEffect(() => {const stored=readLocalDraft<Pending>('service-confirm',service.id,0); if (stored) {setPending(stored.value);setPagerAsk(true);}}, [service.id]);
  useEffect(() => {if(pending.pager === undefined)return; const timer=setTimeout(() => setPagerAsk(true),2000); return () => clearTimeout(timer);}, [pending.pager]);
  const guard = useRef({flush:async () => true, pagehide:() => {}, pending:(): boolean => false});
  guard.current.flush = async () => {if (pending.pager !== undefined) setPagerAsk(true); return Object.keys(pending).length === 0;};
  guard.current.pending = () => Object.keys(pending).length > 0;
  useLeaveGuard(guard.current);
  const cancel = (field: keyof Pending) => {const next={...pending};delete next[field];stage(next);};
  const confirm = (field: keyof Pending) => {const value=pending[field];if (value !== undefined) {save.change(field,value as never,'choice');cancel(field);}};
  const change = <K extends keyof ServiceValues>(field: K, value: ServiceValues[K]) => {
    if (!admin) return;
    if (field === 'pager' || field === 'team') {
      if (value === save.values[field]) {cancel(field); return;}
      stage({...pending,[field]:value});
    } else save.change(field,value,field === 'owner' ? 'choice' : 'text');
  };
  const format = (field: keyof ServiceValues, value: unknown) => field === 'owner' ? state.members.find(member => member.id === value)?.name ?? 'Unassigned' : field === 'team' ? state.teams?.find(team => team.id === value)?.name ?? 'Unassigned' : Array.isArray(value) ? value.join('\n') : String(value ?? '');
  return <ServiceHead focusName={focusName} service={service} state={state} admin={admin} values={{...save.values,...pending}} change={change} blur={field => {if (field === 'pager') setPagerAsk(true); else save.blur(field);}}
    mark={field => <SavedState state={save.states[field]}/>}
    feedback={field => <SaveFeedback state={save.states[field]} retry={() => save.retry(field)} useMine={() => save.useMine(field)} format={value => format(field,value)}/>}
    confirm={field => field === 'pager' ? pending.pager !== undefined && pagerAsk && <InlineConfirm action="Change link" keep="Keep the old link" onConfirm={() => confirm('pager')} onCancel={() => cancel('pager')}>Send responders to the new pager link? Incident links change too.</InlineConfirm> : pending.team !== undefined && <InlineConfirm action="Change team" keep="Keep the old team" onConfirm={() => confirm('team')} onCancel={() => cancel('team')}>Change this service’s owning team? This changes who can see the service.</InlineConfirm>}/>;
}
