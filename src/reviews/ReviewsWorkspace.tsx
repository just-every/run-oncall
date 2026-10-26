import {useViewAnchor} from '../app/useViewAnchor';
import { useEffect, useState } from 'react';
import type { Incident, State } from '../family/response-operations/domain';
import { Field, Form } from '../forms';
import {FailureLine,useActionFailure} from '../app/FailureLine';
import { request } from '../useWorkspace';
import { Followups, followupOrder, isOverdue } from './Followups';
import { ResponseReport } from './ResponseReport';
import { ReviewMaterial, type Material } from './ReviewMaterial';
import { utc } from './display';
import './reviews.css';

type Props = {state: State; busy: boolean; canEdit: boolean; command: (data: any) => Promise<any>; onOpenIncident: (id: string) => void};
export function ReviewsWorkspace(props: Props) {
  const {state, onOpenIncident} = props;
  const open = state.incidents.flatMap(incident => incident.actions.filter(action => !action.done).map(action => ({incident, action})))
    .sort((a, b) => followupOrder(a.action, b.action));
  return <div className="reviews-workspace">
    <ResponseReport state={state} />
    <section className="panel padded">
      <h2>Open improvements</h2>
      <p>{open.length} open follow-ups · {open.filter(({action}) => action.priority === 'P1').length} critical P1 · {open.filter(({action}) => isOverdue(action)).length} overdue after the UTC due day.</p>
      {!!open.length && <details><summary>Follow-ups by priority and UTC due date</summary>
        <ul className="review-rollup">{open.map(({incident, action}) => <li key={action.id}>
          <div><strong>{action.priority ?? 'P2 (legacy default)'} · {action.title}</strong><br />
            {state.members.find(member => member.id === action.owner)?.name ?? action.owner} · due {action.due}, end of day UTC{isOverdue(action) && ' · overdue'}{action.submission && ' · awaiting acceptance'}<br /><span className="review-meta">{incident.title}</span></div>
          <button type="button" onClick={() => onOpenIncident(incident.id)}>Open incident</button>
        </li>)}</ul>
      </details>}
      <p className="muted">Manual escalation contacts are recorded on each follow-up. No automatic reminders or escalation are sent.</p>
    </section>
    <section className="panel padded">
      <h2>Incident reviews</h2>
      {!state.incidents.length && <p>Incident reviews and follow-ups appear here.</p>}
      {state.incidents.map(incident => <ReviewCard {...props} incident={incident} key={incident.id} />)}
    </section>
  </div>;
}
function ReviewCard({incident, state, busy, canEdit, command, onOpenIncident}: Props & {incident: Incident}) {
  const preserveView=useViewAnchor();
  const failures=useActionFailure();
  const [open, setOpen] = useState(false), [material, setMaterial] = useState<Material | null>(null);
  const [loading, setLoading] = useState(false), [refresh, setRefresh] = useState(0);
  useEffect(() => {
    if (!open) return;
    let live = true;
    if(!material)setLoading(true); failures.clear();
    request('/api/reviews/' + encodeURIComponent(incident.id) + '/material').then((result: Material) => {if (live) {preserveView(); setMaterial(result);}})
      .catch(e => {if (live) failures.show(e,{read:true,target:null,retry:async()=>setRefresh(value=>value+1)});})
      .finally(() => {if (live) setLoading(false);});
    return () => {live = false;};
  }, [open, incident.id, incident.revision, refresh]);
  const accepted = incident.reviewAcceptance;
  const name = (id: string) => state.members.find(member => member.id === id)?.name ?? id;
  const currentMaterial = material?.incidentRevision === incident.revision && material.workspaceRevision >= state.revision;
  return <article className="review-card">
    <div className="review-heading"><h3>{incident.title} <span className="tag">{incident.state}</span></h3><button type="button" onClick={() => onOpenIncident(incident.id)}>Open incident</button></div>
    <p className="review-meta">Incident {incident.id} · current revision {incident.revision}</p>
    <h4>Recorded human review</h4><p className="review-literal">{incident.review || 'No postincident review recorded.'}</p>
    {accepted ? <div className="review-snapshot">
      <h4>Human-accepted root cause and impact</h4>
      <dl><dt>Root cause</dt><dd className="review-literal">{accepted.rootCause}</dd><dt>Impact</dt><dd className="review-literal">{accepted.impact}</dd></dl>
      <p>Accepted by {name(accepted.by)} ({accepted.by}) at <time>{utc(accepted.at)}</time>.</p>
      <p>Accepted workspace revision {accepted.workspaceRevision} · material incident revision {accepted.materialRevision} · current incident revision {incident.revision}.</p>
      {incident.revision > accepted.materialRevision + 1 && <p>Incident records have changed after this acceptance. The prior acceptance is retained; inspect current material before accepting a new review.</p>}
    </div> : <p className="muted">No explicit human acceptance of root cause and impact is recorded. Existing manual review text remains available above.</p>}
    <details className="review-material" open={open} onToggle={event => {if (event.target === event.currentTarget) setOpen(event.currentTarget.open);}}>
      <summary>Generated review material and human acceptance</summary>
      {loading && <p role="status">Loading retained review material…</p>}
      <FailureLine failure={failures.failure}/>
      <button type="button" disabled={loading} onClick={() => setRefresh(value => value + 1)}>Refresh material</button>
      {material && <ReviewMaterial material={material} />}
      {material && !currentMaterial && <p role="status">This material is workspace revision {material.workspaceRevision}, incident revision {material.incidentRevision}; the current workspace is revision {state.revision}, incident revision {incident.revision}. Refresh material before accepting.</p>}
      {canEdit && incident.state === 'resolved' && material && <div className="review-acceptance">
        <h4>Accept a human-authored review</h4>
        <p>Write your own root cause and impact assessment. Generated material is supporting context and is not copied into these fields. Any responder may accept this review.</p>
        <Form key={incident.id} busy={busy} disabled={loading} label="Accept root cause, impact and review" onSubmit={data => command({type: 'review', text: data.text, rootCause: data.rootCause, impact: data.impact, incident: incident.id, revision: incident.revision, accept: true, materialRevision: incident.revision, materialWorkspaceRevision: material.workspaceRevision})}>
          <Field name="text" label="Review · response lessons and next verification" type="textarea" value={incident.review} />
          <Field name="rootCause" label="Human-assessed root cause" type="textarea" value={accepted?.rootCause ?? ''} />
          <Field name="impact" label="Human-assessed impact" type="textarea" value={accepted?.impact ?? ''} />
          <label className="review-confirm"><input key={material.workspaceRevision} type="checkbox" name="confirmation" required value="accepted" /><span>I reviewed retained material at workspace revision {material.workspaceRevision} and incident revision {incident.revision} and explicitly accept this root cause, impact and review as my human assessment.</span></label>
        </Form>
      </div>}
      {incident.state !== 'resolved' && <p className="muted">Human review acceptance is available after the incident is resolved.</p>}
    </details>
    <details><summary>Follow-ups ({incident.actions.length})</summary>
      <Followups incident={incident} members={state.members} busy={busy} canEdit={canEdit} mutate={data => command({...data, incident: incident.id, revision: incident.revision})} />
    </details>
  </article>;
}
