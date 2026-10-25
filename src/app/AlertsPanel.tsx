import {CorrelationExplanation} from '../orchestration/Explanation';
import { useState } from 'react';
import { AlertUrgency } from '../urgency/AlertUrgency';
import type { IntakeRun } from '../intake/CompatibleTest';
import { RecentChanges } from "../changes/RecentChanges";
import type { Alert, State } from '../family/response-operations/domain';

export function AlertsPanel({ state, canEdit, busy, run, name, onDeclare, onOpenIncident }: {
  state: State; canEdit: boolean; busy: boolean; run: IntakeRun; name: (id: string | null) => string;
  onDeclare: (data: unknown) => Promise<void>;
  onOpenIncident: (id: string) => void;
}) {
  const [incidentServices, setIncidentServices] = useState<Record<string, string>>({});
  const held=state.alerts.filter(alert=>alert.state==='active'&&alert.suppressed&&[...alert.events].reverse().map(id=>state.events.find(e=>e.id===id)).find(e=>e?.intent==='trigger')?.decision.correlation?.held);
  const heldGroups=new Map<string,Alert[]>();
  for(const alert of held){const key=JSON.stringify([alert.source,alert.service,alert.environment,alert.key]);const group=heldGroups.get(key)??[];group.push(alert);heldGroups.set(key,group);}
  return <section className="panel padded">
    <h2>Alerts</h2>
    <p>Signals remain separate from incidents. Recovery affects only its lifecycle generation.
      This list refreshes every 10 seconds while visible; use Refresh for an immediate update.</p>
    <p>Severity is the highest trigger severity recorded for the alert. Declaring an incident keeps that severity.</p>
    {[...heldGroups].map(([identity,alerts])=>{const events=alerts.flatMap(alert=>alert.events.map(id=>state.events.find(e=>e.id===id)!)),latest=events.filter(e=>e.intent==='trigger').sort((a,b)=>b.acceptedAt.localeCompare(a.acceptedAt))[0],severity=['critical','warning','info'].find(level=>events.some(e=>e.intent==='trigger'&&e.severity===level));return <article className="service-card" key={identity} style={{overflowWrap:'anywhere'}}><h3>Flapping signal: {latest.title}</h3><p><strong>{severity}</strong> · {alerts.length} held active {alerts.length===1?'generation':'generations'} · {latest.source} · {latest.service}</p><CorrelationExplanation decision={latest.decision}/><p>Held locally, paging OFF. Source recoveries still affect only their own generation.</p><details><summary>Retained generations and evidence</summary>{alerts.map(alert=><p key={alert.id} style={{overflowWrap:'anywhere'}}>Generation {alert.generation} · owner {name(alert.owner)} · alert {alert.id} · events {alert.events.join(', ')}</p>)}</details></article>})}
    {state.alerts.filter(alert=>!held.includes(alert)).map((alert: Alert) => {
      const events = alert.events.map(id => state.events.find(event => event.id === id)).filter(event => event !== undefined);
      const triggers = events.filter(event => event.intent === 'trigger');
      const ranked = ['critical', 'warning', 'info'] as const;
      const severity = alert.service === null ? 'critical' : ranked.find(level => (triggers.length ? triggers : events).some(event => event.severity === level));
      const title = events[0]?.title??state.intakeReceipts?.find(r=>r.alert===alert.id)?.title;
      const source = state.intakeSources?.find(source => alert.source === 'intake:' + source.id);
      const scopedServices = state.services.filter(service => source?.routing?.scope.includes(service.id));
      const incidentService = alert.service ?? incidentServices[alert.id] ?? '';
      const incidents = state.incidents.filter(incident => incident.alerts.includes(alert.id));
      return <article className="service-card" key={alert.id}>
        <h3>{title}</h3>
        {severity && <span className={`priority sev-${severity}`}>{severity}</span>}
        <p>{state.services.find(service => service.id === alert.service)?.name??'Integration unrouted queue'} · {alert.environment} · {alert.state}</p>
        {alert.coordination&&<><p>Coordination: {alert.coordination.state} · assignee {name(alert.coordination.assignee)}{alert.coordination.snoozeDue&&` · due ${alert.coordination.snoozeDue}, not sent (no timer)`}</p><details><summary>Coordination history</summary>{alert.coordination.history.map(entry=><p key={entry.id}>{entry.text} · {name(entry.actor)} · operation {entry.operationId}</p>)}</details></>}
        {alert.obligation&&<p>Paging obligation: {alert.obligation.state} · {alert.obligation.target.kind==='user'?'Integration owner: '+name(alert.obligation.target.id):'Service policy'} · {alert.obligation.urgency} urgency · paging OFF; non-automatic.</p>}
        {alert.obligation?.policy && <p>Response policy v{alert.obligation.policy.version} · {alert.obligation.policy.mode === 'incident' ? 'Automatic incident declaration' : 'Alert-only'} · {alert.obligation.policy.rule ? 'rule ' + alert.obligation.policy.rule : 'default response'}.</p>}
        {alert.obligation?.state === 'stopped' && <div className="urgency-preview">
          <strong>{alert.obligation.outcome}</strong>
          <p>Recovery receipt: <span style={{overflowWrap: 'anywhere'}}>{alert.obligation.receipt ?? 'No receipt recorded'}</span>{alert.obligation.stoppedAt && <> · {new Date(alert.obligation.stoppedAt).toLocaleString()}</>}</p>
          {alert.obligation.cancellation && <p>Attempt cancellation: {alert.obligation.cancellation}</p>}
          {alert.obligation.recoveryNotice && <>
            <p>Recovered notice: {alert.obligation.recoveryNotice.mode === 'silent' ? 'Stop silently' : 'Everyone already notified'} · {alert.obligation.recoveryNotice.state} · {alert.obligation.recoveryNotice.label} · non-automatic.</p>
            <p>Recorded recipients: {alert.obligation.recoveryNotice.recipients.length ? alert.obligation.recoveryNotice.recipients.map(id => name(id)).join(', ') : 'None; no notification has been sent.'}</p>
          </>}
        </div>}
        {alert.priority&&<p>Priority: {alert.priority}</p>}
        <p>{alert.source} / {alert.key} / {alert.generation}</p>
        <CorrelationExplanation decision={events.at(-1)?.decision}/>
        <p>{alert.suppressed ? 'Suppressed'+(alert.owner?' · Owner: '+name(alert.owner):'') : name(alert.owner)} · {alert.events.length} events</p>
        <AlertUrgency alert={alert} state={state} canEdit={canEdit&&alert.service!==null} busy={busy} run={run}/><details><summary>Service runbook</summary>{state.services.find(s=>s.id===alert.service)?.runbook.length ? <ol>{state.services.find(s=>s.id===alert.service)!.runbook.map((step,n)=><li key={n}>{step}</li>)}</ol> : <p>No service runbook is configured.</p>}</details>
        {alert.service!==null&&<RecentChanges service={alert.service} at={triggers[0]?.observedAt ?? events[0]?.observedAt} revision={state.revision} />}
        {incidents.map(incident => <p key={incident.id}><a href="#incidents" onClick={() => onOpenIncident(incident.id)}>Open incident: {incident.title}</a> · {incident.state}</p>)}
        {canEdit && incidents.length === 0 && alert.service === null && <label className="field">Incident service<select aria-label="Incident service" value={incidentServices[alert.id] ?? ''} onChange={event => setIncidentServices(previous => ({...previous, [alert.id]: event.target.value}))} required disabled={busy}>
          <option value="">Choose a service in this integration’s scope</option>
          {scopedServices.map(service => <option key={service.id} value={service.id}>{service.name} · {service.environment}</option>)}
        </select><small>The original alert stays in the integration owner queue.</small></label>}
        {canEdit && incidents.length === 0 && <button disabled={busy || !severity || !incidentService || alert.service === null && !scopedServices.some(service => service.id === incidentService)} onClick={() => onDeclare({
          type: 'declare', service: incidentService, title, severity,
          summary: 'Declared from alert; impact requires responder review', alerts: [alert.id],
        })}>Declare incident from alert</button>}
      </article>;
    })}
    {!state.alerts.length && <p>No admitted alerts. Configure a scoped source and send its first event.</p>}
    <details>
      <summary>Accepted event receipts ({state.events.length})</summary>
      {state.events.map(event => <article className="receipt" key={event.id}>
        <strong>{event.eventId} · {event.intent} · {event.severity}</strong>
        <p>{event.decision.action}: {event.decision.reason}</p><CorrelationExplanation decision={event.decision}/>
        <p>{new Date(event.acceptedAt).toLocaleString()} · {state.intakeReceipts?.some(r=>r.event===event.id&&r.observedAt===null)?'source time not supplied':`observed ${new Date(event.observedAt).toLocaleString()}`} · {event.generation}</p>
      </article>)}
    </details>
  </section>;
}
