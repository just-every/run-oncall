import { useState } from 'react';
import { Field, Form } from '../forms';
import type { Incident, Member } from '../family/response-operations/domain';
import { incidentAssignee, incidentUrgency } from '../family/response-operations/incident-controls';

export function IncidentResponseControls({incident, members, busy, canEdit, mutate}: {incident: Incident; members: Member[]; busy: boolean; canEdit: boolean; mutate: (data: any) => Promise<any>}) {
  const [type, setType] = useState('assign-role');
  const name = (id: string | null | undefined) => members.find(m => m.id === id)?.name ?? 'Unassigned';
  return <section className="response-controls" aria-label="Response ownership">
    <h3>Response ownership</h3>
    <dl className="response-roles">
      <div><dt>Assignee</dt><dd>{name(incidentAssignee(incident))}</dd></div>
      <div><dt>Commander</dt><dd>{name(incident.commander)}</dd></div>
      <div><dt>Scribe</dt><dd>{name(incident.scribe)}</dd></div>
      <div><dt>Communications</dt><dd>{name(incident.communications)}</dd></div>
      <div><dt>Urgency</dt><dd>{incidentUrgency(incident)}</dd></div>
      <div><dt>Priority</dt><dd>{incident.priority ?? 'Unset'}</dd></div>
    </dl>
    {canEdit && <details><summary>Change response ownership or priority</summary>
      <label>Response change<select aria-label="Response change" value={type} onChange={e => setType(e.target.value)}>
        <option value="assign-role">Assign or transfer a role</option><option value="reassign">Reassign incident</option>
        <option value="set-priority">Set priority</option><option value="set-urgency">Set urgency</option><option value="set-severity">Set severity</option>
      </select></label>
      <Form busy={busy} label="Save response change" onSubmit={data => mutate({...data, type, member: data.member || null})}>
        {type === 'assign-role' && <Field name="role" label="Response role"><option value="commander">Commander</option><option value="scribe">Scribe</option><option value="communications">Communications</option></Field>}
        {['assign-role', 'reassign'].includes(type) && <Field name="member" label="Assigned responder" required={false}><option value="">Unassigned</option>{members.filter(m => m.active && m.role !== 'viewer').map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</Field>}
        {type === 'set-priority' && <Field name="priority" label="Response priority">{['P1', 'P2', 'P3', 'P4', 'P5'].map(p => <option key={p}>{p}</option>)}</Field>}
        {type === 'set-urgency' && <Field name="urgency" label="Response urgency"><option>high</option><option>low</option></Field>}
        {type === 'set-severity' && <Field name="severity" label="Response severity"><option>critical</option><option>warning</option><option>info</option></Field>}
        <Field name="reason" label="Reason for response change" type="textarea" />
      </Form>
    </details>}
  </section>;
}
