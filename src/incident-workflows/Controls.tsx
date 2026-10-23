import { useState } from 'react';
import { Field, Form } from '../forms';
import type { Incident, Member, State } from '../family/response-operations/domain';
import { incidentAssignee } from '../family/response-operations/incident-controls';
import './workflows.css';

type Props = { state: State; incident: Incident; member: Member; send: (command: any) => Promise<any> };
const time = (value: string) => new Date(value).toLocaleString();

export function IncidentWorkflows({ state, incident, member, send }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sources, setSources] = useState<{ id: string; revision: number }[]>([]);
  const [alerts, setAlerts] = useState<string[]>([]);
  const editable = member.active && !member.machine && member.role !== 'viewer' && !incident.mergedInto && incident.state !== 'resolved';
  const name = (id: string | null | undefined) => state.members.find(m => m.id === id)?.name ?? (id ? 'Erased member' : 'Unassigned');
  const service = (id: string | null) => state.services.find(s => s.id === id)?.name ?? id ?? 'Unknown service';
  async function save(command: any) {
    setBusy(true);
    setError('');
    try {
      const result = await send(command);
      if (!result) setError('Change was not saved. Check the workspace error and refresh before trying again.');
      return result;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Change could not be saved.');
      return null;
    } finally { setBusy(false); }
  }
  const retained: Incident[] = [];
  const seen = new Set([incident.id]);
  const visit = (parent: Incident) => {
    for (const id of parent.mergedSources ?? []) {
      if (seen.has(id)) continue;
      seen.add(id);
      const source = state.incidents.find(i => i.id === id);
      if (source) { retained.push(source); visit(source); }
    }
  };
  visit(incident);
  const candidates = state.incidents.filter(i => i.id !== incident.id && !i.mergedInto && i.state !== 'resolved');
  const attached = state.alerts.filter(a => incident.alerts.includes(a.id));

  return <section className="response-controls incident-workflows" aria-label="Incident workflows">
    <h3>Incident workflows</h3>
    {incident.splitFrom && <p>Split from <a href={`?incident=${encodeURIComponent(incident.splitFrom.incident)}#incidents`}>{incident.splitFrom.incident}</a> by {name(incident.splitFrom.by)} · {time(incident.splitFrom.at)}. {incident.splitFrom.reason}</p>}
    {incident.template && <section aria-label="Incident template snapshot">
      <h4>Response template · version {incident.template.version}</h4>
      <p>{incident.template.severityWording[incident.severity as 'critical' | 'warning' | 'info']} · {incident.template.incidentType ?? 'No incident type selected'}</p>
      <p>{incident.template.impactPrompt}</p>
      {incident.template.checklist.length > 0 && <ul className="checklist workflow-checklist">
        {incident.template.checklist.map(item => <li key={item.id}>
          <label className="workflow-choice"><input type="checkbox" checked={item.done} disabled={busy || !editable || incident.commander !== member.id}
            onChange={e => { void save({ type: 'template-check', incident: incident.id, revision: incident.revision, item: item.id, done: e.target.checked }); }} />
            <span>{item.text}{item.history.length > 0 && <small>Last changed by {name(item.history.at(-1)!.by)} · {time(item.history.at(-1)!.at)}</small>}</span>
          </label>
        </li>)}
      </ul>}
      {incident.template.checklist.length > 0 && incident.commander !== member.id && <p className="workflow-help">The current commander updates this checklist.</p>}
      <p className="workflow-help">Copied at declaration from {service(incident.template.service)}. Later template versions apply to new incidents.</p>
    </section>}
    {editable && <>
      <details>
        <summary>Merge related incidents into this incident</summary>
        <p>This incident keeps its response roles. Source incidents retain their history and become aliases here.</p>
        {candidates.length ? <Form busy={busy} label="Merge selected incidents" onSubmit={async data => {
          if (!sources.length) { setError('Select at least one related incident to merge.'); return null; }
          const result = await save({ type: 'merge-incidents', incident: incident.id, revision: incident.revision, sources, reason: data.reason });
          if (result) setSources([]);
          return result;
        }}>
          <fieldset className="workflow-options"><legend>Related incidents</legend>
            {candidates.map(candidate => {
              const selected = sources.find(s => s.id === candidate.id);
              return <label className="workflow-choice" key={candidate.id}>
                <input type="checkbox" checked={!!selected} onChange={e => setSources(current => e.target.checked
                  ? [...current, { id: candidate.id, revision: candidate.revision }]
                  : current.filter(s => s.id !== candidate.id))} />
                <span>{candidate.title}<small>{service(candidate.service)} · {candidate.state} · revision {selected?.revision ?? candidate.revision} · {candidate.id}</small>
                  {selected && selected.revision !== candidate.revision && <small>Changed since selection. Deselect and review before selecting again.</small>}</span>
              </label>;
            })}
          </fieldset>
          <Field name="reason" label="Reason for merging" type="textarea" />
        </Form> : <p>No other open incidents are available to merge.</p>}
      </details>
      <details>
        <summary>Split unrelated alerts into a new incident</summary>
        <p>Selected alert groups move to a new incident. Their source and generation stay attached to each alert.</p>
        {attached.length ? <Form busy={busy} label="Split selected alerts" onSubmit={async data => {
          if (!alerts.length) { setError('Select at least one alert group to split.'); return null; }
          const result = await save({ type: 'split-incident', incident: incident.id, revision: incident.revision, alerts, title: data.title, summary: data.summary, reason: data.reason });
          if (result) setAlerts([]);
          return result;
        }}>
          <fieldset className="workflow-options"><legend>Alert groups</legend>
            {attached.map(alert => <label className="workflow-choice" key={alert.id}>
              <input type="checkbox" checked={alerts.includes(alert.id)} onChange={e => setAlerts(current => e.target.checked ? [...current, alert.id] : current.filter(id => id !== alert.id))} />
              <span>{alert.key}<small>{service(alert.service)} · {alert.environment} · {alert.source} · generation {alert.generation} · {alert.state}</small><small>{alert.id}</small></span>
            </label>)}
          </fieldset>
          <Field name="title" label="New incident title" />
          <Field name="summary" label="New incident impact summary" type="textarea" />
          <Field name="reason" label="Reason for splitting" type="textarea" />
        </Form> : <p>No attached alerts are available to split.</p>}
      </details>
    </>}
    {error && <p role="alert">{error}</p>}
    {retained.length > 0 && <section aria-label="Retained merged incidents">
      <h4>Retained source incidents</h4>
      {retained.map(source => <details key={source.id}>
        <summary>{source.title} · {service(source.service)}</summary>
        <p>Source {source.id} · {source.state} · revision {source.revision}</p>
        {source.mergedInto && <p>Merged by {name(source.mergedInto.by)} · {time(source.mergedInto.at)}. {source.mergedInto.reason}</p>}
        <dl className="response-roles">
          <div><dt>Source assignee</dt><dd>{name(incidentAssignee(source))}</dd></div>
          <div><dt>Source commander</dt><dd>{name(source.commander)}</dd></div>
          <div><dt>Source scribe</dt><dd>{name(source.scribe)}</dd></div>
          <div><dt>Source communications</dt><dd>{name(source.communications)}</dd></div>
        </dl>
        <h4>Source runbook</h4>
        {source.runbook.length ? <ul className="workflow-history">{source.runbook.map((item, index) => <li key={index}>{item.done ? 'Done' : 'Open'} · {item.text}</li>)}</ul> : <p>No source runbook steps.</p>}
        {source.template && <><h4>Source template · version {source.template.version}</h4><p>{source.template.incidentType ?? 'No incident type selected'} · {source.template.impactPrompt}</p>
          <ul className="workflow-history">{source.template.checklist.map(item => <li key={item.id}>{item.done ? 'Done' : 'Open'} · {item.text}
            {item.history.map(change => <small key={change.id}>{change.done ? 'Completed' : 'Reopened'} by {name(change.by)} · {time(change.at)}</small>)}
          </li>)}</ul></>}
        <h4>Source follow-ups</h4>
        {source.actions.length ? <ul className="workflow-history">{source.actions.map(action => <li key={action.id}>{action.done ? 'Done' : 'Open'} · {action.title}
          <small>{name(action.owner)} · due {time(action.due)}</small>
          {action.evidence && <p>{action.evidence}</p>}
          {action.submission && <small>Submitted by {name(action.submission.by)} · {time(action.submission.at)} · {action.submission.evidence}</small>}
          {action.accepted && <small>Accepted by {name(action.accepted.by)} · {time(action.accepted.at)}</small>}
          {!action.done && member.active && member.role!=='viewer' && <>
            <Form busy={busy} label={`Submit evidence for ${action.title}`} onSubmit={data=>save({...data,type:'complete',incident:source.id,revision:source.revision,action:action.id})}><Field name="evidence" label={`Completion evidence for ${action.title}`} type="url" /></Form>
            {action.completionPolicy==='human-review'&&action.submission&&<Form busy={busy} label={`Accept completion of ${action.title}`} onSubmit={data=>save({...data,type:'accept-action',incident:source.id,revision:source.revision,action:action.id})}><Field name="reason" label={`Acceptance reason for ${action.title}`} type="textarea" /></Form>}
          </>}

        </li>)}</ul> : <p>No source follow-ups.</p>}
        <h4>Source evidence and decisions</h4>
        <ol className="events">{source.timeline.map(entry => <li className="event" key={entry.id}>
          <span className="event-symbol" aria-hidden />
          <div><div className="event-line"><strong>{entry.kind}</strong><time dateTime={entry.at}>{time(entry.at)}</time></div>
            <p>{entry.text}</p><small>{name(entry.actor)} · source {source.id}{entry.operationId && ` · operation ${entry.operationId}`}</small>
            {entry.lifecycle?.member !== undefined && <small>Named responder: {name(entry.lifecycle.member)}</small>}
          </div>
        </li>)}</ol>
      </details>)}
    </section>}
  </section>;
}
