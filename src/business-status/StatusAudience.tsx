import type {ReactNode} from 'react';
import type {Member} from '../family/response-operations/domain';
import {request} from '../useWorkspace';
import {useAutosave, autosaveRequest} from '../app/autosave/useAutosave';
import {SavedState, SaveFeedback} from '../app/autosave/SavedState';

export function StakeholderAudience({members, value, onChange, saved}: {
  members: Member[]; value: string[]; onChange: (value: string[]) => void; saved?: ReactNode;
}) {
  const eligible = members.filter(member => member.active && member.role === 'stakeholder');
  return <fieldset className="status-audience" aria-label="Stakeholder audience"><legend>Stakeholder audience {saved}</legend>
    {eligible.length ? eligible.map(member => <label className="status-audience-choice" key={member.id}>
      <input type="checkbox" name="audience" value={member.id} checked={value.includes(member.id)} onChange={event => onChange(event.target.checked ? [...value, member.id] : value.filter(id => id !== member.id))}/>
      <span>{member.name}</span>
    </label>) : <p>No active stakeholders.</p>}
  </fieldset>;
}

export function StatusAudience({service, actorId, members, onServices}: {
  service: any; actorId: string; members: Member[]; onServices: (services: any[]) => void;
}) {
  const snapshot = (row: any) => ({values: {audience: row.audience as string[]}, revision: row.revision as number});
  const receive = (result: any) => {
    onServices(result.services);
    return snapshot(result.services.find((row: any) => row.id === service.id));
  };
  const save = useAutosave({storageKey: 'status-audience:' + actorId + ':' + service.id,
    snapshot: snapshot(service),
    read: async () => receive(await request('/api/status')),
    write: async change => receive(await autosaveRequest('/api/status', {action: 'audience', id: service.id, revision: change.revision, audience: change.to})),
  });
  return <div className="status-audience-editor">
    <StakeholderAudience members={members} value={save.values.audience} onChange={value => save.change('audience', value, 'choice')} saved={<SavedState state={save.states.audience}/>}/>
    <SaveFeedback state={save.states.audience} retry={() => save.retry('audience')} useMine={() => save.useMine('audience')} format={value => (value as string[]).map(id => members.find(member => member.id === id)?.name ?? 'Former member').join(', ') || 'None'}/>
  </div>;
}
