import type {Service, State} from '../../family/response-operations/domain';
export type GroupingDraft = {enabled: boolean; field: string; seconds: number; dependencies: boolean; flapping: number; owner: string};
export function GroupingFields({value, change, state, readOnly = false}: {value: GroupingDraft; change: (value: GroupingDraft) => void; state: State; readOnly?: boolean}) {
  if (readOnly) return <div className="service-readonly"><p>{value.enabled ? `Group by ${value.field} within ${value.seconds} seconds` : 'Grouping is off'}</p>{value.enabled && <p>{value.dependencies ? 'Includes direct dependencies' : 'This service only'} · {value.flapping ? `Hold after ${value.flapping} generations` : 'No flapping hold'}</p>}<p>Owner: {state.members.find(member => member.id === value.owner)?.name ?? 'Unassigned'}</p></div>;
  return <fieldset disabled={readOnly}>
    <label className="service-choice"><input type="checkbox" checked={value.enabled} onChange={event => change({...value, enabled: event.target.checked})}/>Enable grouping</label>
    {value.enabled && <>
      <label className="field">Match field<input value={value.field} required placeholder="key, title or labels.correlation" onChange={event => change({...value, field: event.target.value})}/></label>
      <label className="field">Grouping window in seconds<input type="number" min={1} max={86400} required value={value.seconds} onChange={event => change({...value, seconds: Number(event.target.value)})}/></label>
      <label className="service-choice"><input type="checkbox" checked={value.dependencies} onChange={event => change({...value, dependencies: event.target.checked})}/>Include direct dependencies</label>
      <label className="field">Flapping trigger generations<input type="number" min={0} max={100} value={value.flapping} onChange={event => change({...value, flapping: Number(event.target.value)})}/></label>
    </>}
    <label className="field">Grouping coordination owner<select aria-label="Grouping coordination owner" value={value.owner} onChange={event => change({...value, owner: event.target.value})}><option value="">Unassigned</option>{state.members.filter(member => member.active && ['admin', 'responder'].includes(member.role)).map(member => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label>
  </fieldset>;
}
export function groupingDraft(service: Service, state: State): GroupingDraft {
  const policy = state.policies.find(row => row.service === service.id && row.severity === '*'), current = policy?.correlation;
  return {enabled: !!current, field: current?.field ?? 'labels.correlation', seconds: current?.windowSeconds ?? 300, dependencies: current?.includeDependencies ?? false, flapping: current?.flappingCount ?? 0, owner: policy?.owner ?? service.owner};
}
