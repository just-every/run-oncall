import {severityLabel} from '../reviews/display';
import {useState} from 'react';
import {Field, Form} from '../forms';
import type {State} from '../family/response-operations/domain';

export function Declare({state, busy, submit}: {state: State; busy: boolean; submit: (data: any) => Promise<any>}) {
  const [operation] = useState(() => crypto.randomUUID());
  const [serviceId, setServiceId] = useState(state.services[0]?.id ?? '');
  const people = state.members.filter(member => member.active && !member.machine && ['admin', 'responder'].includes(member.role));
  const template = state.services.find(service => service.id === serviceId)?.incidentTemplates?.at(-1);
  return <Form busy={busy} label="Declare" onSubmit={data => submit({...data, type: 'manual-page', operationId: operation, users: Array.isArray(data.users) ? data.users : data.users ? [data.users] : []})}>
    <label className="field"><span>Incident title</span><input name="title" autoFocus required maxLength={300} /></label>
    {state.services.length === 1 ? <><p>Service: {state.services[0].name}</p><input type="hidden" name="service" value={state.services[0].id} /></> : <label className="field"><span>Service</span><select aria-label="Service" name="service" required value={serviceId} onChange={event => setServiceId(event.target.value)}>{state.services.map(service => <option key={service.id} value={service.id}>{service.name}</option>)}</select></label>}
    <Field name="severity" label="Severity">{(['critical', 'warning', 'info'] as const).map(severity => <option key={severity} value={severity}>{template?.severityWording[severity] ?? severityLabel(severity)}</option>)}</Field>
    <details><summary>More options</summary>
      {people.length === 1 ? <label className="workflow-choice"><input type="checkbox" name="users" value={people[0].id} /><span>{people[0].name}</span></label> : <label className="field"><span>Named responders</span><select aria-label="Named responders" name="users" multiple>{people.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label>}
      {!!template?.incidentTypes.length && <Field name="incidentType" label="Incident type (service template)" required={false}><option value="">Service default</option>{template.incidentTypes.map(type => <option key={type}>{type}</option>)}</Field>}
      <Field name="urgency" label="Page urgency" required={false}><option value="">Service default</option><option value="high">High</option><option value="low">Low</option></Field>
      <Field name="priority" label="Page priority" required={false}><option value="">Unset</option>{['P1', 'P2', 'P3', 'P4', 'P5'].map(priority => <option key={priority}>{priority}</option>)}</Field>
      <Field name="summary" label="Customer impact and current evidence" type="textarea" required={false} />
    </details>
  </Form>;
}
