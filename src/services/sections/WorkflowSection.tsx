import type {State} from '../../family/response-operations/domain';
export type WorkflowDraft = {member: string; reason: string};
export function WorkflowFields({value, change, state, readOnly = false}: {value: WorkflowDraft; change: (value: WorkflowDraft) => void; state: State; readOnly?: boolean}) {
  if (readOnly) return <div className="service-readonly"><p>Responder: {state.members.find(member => member.id === value.member)?.name ?? 'Unassigned'}</p><p>{value.reason}</p></div>;
  return <fieldset disabled={readOnly}>
    <label className="field">Workflow responder<select aria-label="Workflow responder" value={value.member} onChange={event => change({...value, member: event.target.value})} required><option value="">Choose a responder</option>{state.members.filter(member => member.active && ['admin', 'responder'].includes(member.role)).map(member => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label>
    <label className="field">Workflow purpose<textarea aria-label="Workflow purpose" value={value.reason} onChange={event => change({...value, reason: event.target.value})} required maxLength={1000}/></label>
  </fieldset>;
}
