import { useId, useState } from 'react';
import type { Action, Incident, Member } from '../family/response-operations/domain';
import { Field, Form } from '../forms';
import { EvidenceLink, utc } from './display';
import './reviews.css';

export function followupOrder(a: Action, b: Action) {
  return Number(a.done) - Number(b.done) || (a.priority ?? 'P2').localeCompare(b.priority ?? 'P2') || a.due.localeCompare(b.due) || a.id.localeCompare(b.id);
}
export function isOverdue(action: Action, now = Date.now()) {
  return !action.done && now >= Date.parse(action.due + 'T00:00:00.000Z') + 86400000;
}
type Props = {incident: Incident; members: Member[]; busy: boolean; canEdit: boolean; mutate: (data: any) => Promise<any>; incidentMode?: boolean};
export function Followups({incident, members, busy, canEdit, mutate, incidentMode = false}: Props) {
  const name = (id: string) => members.find(member => member.id === id)?.name ?? 'Erased member';
  return <section className="followups">
    <div className="right-title owners-heading"><h3>Follow-up owners</h3><span>{incident.actions.filter(action => !action.done).length} open</span></div>
    {!incidentMode && <p className="review-meta">Due dates run through the end of the named UTC day. Overdue starts at 00:00 UTC the next day. Escalation contacts are for manual coordination; no automatic reminders or escalation are sent.</p>}
    {!incidentMode && !incident.actions.length && <p className="muted">No follow-ups recorded.</p>}
    <ul className="followup-list">{[...incident.actions].sort(followupOrder).map(action => <li className="followup-item" key={action.id}>
      <div className="review-heading"><strong>{action.title}</strong><span className={'tag ' + (action.done ? 'state-resolved' : '')}>{action.done ? 'Complete' : action.submission ? 'Awaiting acceptance' : 'Open'}</span></div>
      <p>{name(action.owner)} · {action.priority ?? 'P2 (legacy default)'} · due <strong>{action.due}, end of day UTC</strong>{isOverdue(action) && <span className="tag state-declared">Overdue</span>}</p>
      {!incidentMode && <p className="review-meta">Action {action.id}<br />
        {action.completionPolicy === undefined ? 'Legacy evidence policy · submission of evidence completes this action.' : action.completionPolicy === 'human-review' ? 'Human-review policy · submit evidence, then explicitly accept completion.' : 'Evidence policy · submission of evidence completes this action.'}<br />
        Manual escalation contact: {action.escalationRecipient ? name(action.escalationRecipient) : 'Not recorded (legacy)'}</p>}
      {action.evidence && <p><EvidenceLink url={action.evidence}>Completion evidence</EvidenceLink></p>}
      {action.submission && <p className="review-meta">Evidence submitted by {name(action.submission.by)} {!incidentMode && ` (${action.submission.by})`} at <time>{utc(action.submission.at)}</time>.</p>}
      {action.accepted ? <p className="review-meta">{action.completionPolicy === 'human-review' ? 'Completion accepted' : 'Evidence-policy completion recorded'} by {name(action.accepted.by)} {!incidentMode && ` (${action.accepted.by})`} at <time>{utc(action.accepted.at)}</time>.</p>
        : action.done && <p className="review-meta">Recorded legacy completion; acceptance actor and time were not retained.</p>}
      {!action.done && canEdit && <>
        <Form busy={busy} label={incidentMode ? 'Add evidence' : action.completionPolicy === 'human-review' ? action.submission ? 'Replace submitted evidence' : 'Submit completion evidence' : 'Complete with evidence'} onSubmit={data => mutate({...data, type: 'complete', action: action.id})}>
          <Field name="evidence" label={incidentMode ? "Completion evidence" : "HTTP(S) completion evidence"} type="url" value={action.submission?.evidence ?? ''} />
        </Form>
        {action.completionPolicy === 'human-review' && action.submission && <div className="followup-accept">
          <p>Submission has not completed this action. Any responder, including the submitter, may accept it as a separate recorded step.</p>
          <Form busy={busy} label="Accept follow-up completion" onSubmit={data => mutate({...data, type: 'accept-action', action: action.id})}>
            <Field name="reason" label="Reason for accepting completion" type="textarea" />
          </Form>
        </div>}
      </>}
    </li>)}</ul>
    {canEdit && <CreateFollowup key={incident.id} members={members} busy={busy} mutate={mutate} incidentMode={incidentMode} initiallyOpen={incidentMode && !incident.actions.length} />}
  </section>;
}
function CreateFollowup({members, busy, mutate, incidentMode = false, initiallyOpen = false}: Pick<Props, 'members' | 'busy' | 'mutate' | 'incidentMode'> & {initiallyOpen?: boolean}) {
  const labelId = useId();
  const [priority, setPriority] = useState('P2'), [policy, setPolicy] = useState('human-review');
  const eligible = members.filter(member => member.active && ["admin", "responder"].includes(member.role));
  const Advanced = incidentMode ? 'details' : 'div';
  const options = eligible.map(member => <option value={member.id} key={member.id}>{member.name}</option>);
  return <details className="followup-create" open={initiallyOpen || undefined}><summary>Add a follow-up</summary>
    {!eligible.length && <p>No active responders are available to own a follow-up.</p>}
    <Form busy={busy} disabled={!eligible.length} label="Add follow-up" onSubmit={async data => {
      const result = await mutate({...data, type: 'action', priority, completionPolicy: priority === 'P1' ? 'human-review' : policy});
      if (result) { setPriority('P2'); setPolicy('human-review'); }
      return result;
    }}>
      <Field name="title" label="Improvement action" />
      {incidentMode && eligible.length === 1 ? <><p>Owner: {eligible[0].name}</p><input type="hidden" name="owner" value={eligible[0].id} /></> : <Field name="owner" label="Owner">{options}</Field>}
      <Field name="due" label={incidentMode ? "Due date (UTC)" : "Due date · through end of day UTC"} type="date" />
      <div className="review-pair">
        <label className="field"><span id={labelId + '-priority'}>Priority</span><select name="priority" aria-labelledby={labelId + '-priority'} value={priority} onChange={e => {setPriority(e.target.value); if (e.target.value === 'P1') setPolicy('human-review');}}>
          <option value="P1">P1 · critical</option><option value="P2">P2</option><option value="P3">P3</option>
        </select></label>
      </div>
      <Advanced>{incidentMode && <summary>More options</summary>}
        <label className="field"><span id={labelId + '-policy'}>Completion policy</span><select name="completionPolicy" aria-labelledby={labelId + '-policy'} value={policy} onChange={e => setPolicy(e.target.value)}>
          <option value="human-review">Human review</option><option value="evidence" disabled={priority === 'P1'}>Evidence</option>
        </select><small>P1 requires human review. New follow-ups default to human review.</small></label>
      {incidentMode && eligible.length === 1 ? <><p>Escalation contact: {eligible[0].name}</p><input type="hidden" name="escalationRecipient" value={eligible[0].id} /></> : <Field name="escalationRecipient" label="Manual escalation contact" help="A recorded contact only. Contact them yourself when escalation is needed.">{options}</Field>}
      </Advanced>
    </Form>
  </details>;
}
