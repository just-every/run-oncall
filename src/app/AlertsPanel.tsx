import { AlertUrgency } from '../urgency/AlertUrgency';
import type { IntakeRun } from '../intake/CompatibleTest';
import { RecentChanges } from "../changes/RecentChanges";
import type { Alert, State } from '../family/response-operations/domain';

export function AlertsPanel({ state, canEdit, busy, run, name, onDeclare, onOpenIncident }: {
  state: State; canEdit: boolean; busy: boolean; run: IntakeRun; name: (id: string | null) => string;
  onDeclare: (data: unknown) => Promise<void>;
  onOpenIncident: (id: string) => void;
}) {
  return <section className="panel padded">
    <h2>Alerts</h2>
    <p>Signals remain separate from incidents. Recovery affects only its lifecycle generation.
      This list refreshes every 10 seconds while visible; use Refresh for an immediate update.</p>
    <p>Severity is the highest trigger severity recorded for the alert. Declaring an incident keeps that severity.</p>
    {state.alerts.map((alert: Alert) => {
      const events = alert.events.map(id => state.events.find(event => event.id === id)).filter(event => event !== undefined);
      const triggers = events.filter(event => event.intent === 'trigger');
      const ranked = ['critical', 'warning', 'info'] as const;
      const severity = ranked.find(level => (triggers.length ? triggers : events).some(event => event.severity === level));
      const title = events[0]?.title??state.intakeReceipts?.find(r=>r.alert===alert.id)?.title;
      const incidents = state.incidents.filter(incident => incident.alerts.includes(alert.id));
      return <article className="service-card" key={alert.id}>
        <h3>{title}</h3>
        {severity && <span className={`priority sev-${severity}`}>{severity}</span>}
        <p>{state.services.find(service => service.id === alert.service)?.name??'Integration unrouted queue'} · {alert.environment} · {alert.state}</p>
        {alert.obligation&&<p>Paging obligation: {alert.obligation.state} · {alert.obligation.target.kind==='user'?'Integration owner: '+name(alert.obligation.target.id):'Service policy'} · {alert.obligation.urgency} urgency · paging OFF; non-automatic.</p>}
        {alert.priority&&<p>Priority: {alert.priority}</p>}
        <p>{alert.source} / {alert.key} / {alert.generation}</p>
        <p>{alert.suppressed ? 'Suppressed' : name(alert.owner)} · {alert.events.length} events</p>
        <AlertUrgency alert={alert} state={state} canEdit={canEdit&&alert.service!==null} busy={busy} run={run}/><details><summary>Service runbook</summary>{state.services.find(s=>s.id===alert.service)?.runbook.length ? <ol>{state.services.find(s=>s.id===alert.service)!.runbook.map((step,n)=><li key={n}>{step}</li>)}</ol> : <p>No service runbook is configured.</p>}</details>
        <RecentChanges service={alert.service!} at={triggers[0]?.observedAt ?? events[0]?.observedAt} revision={state.revision} />
        {incidents.map(incident => <p key={incident.id}><a href="#incidents" onClick={() => onOpenIncident(incident.id)}>Open incident: {incident.title}</a> · {incident.state}</p>)}
        {canEdit && incidents.length === 0 && <button disabled={busy || !severity} onClick={() => onDeclare({
          type: 'declare', service: alert.service, title, severity,
          summary: 'Declared from alert; impact requires responder review', alerts: [alert.id],
        })}>Declare incident from alert</button>}
      </article>;
    })}
    {!state.alerts.length && <p>No admitted alerts. Configure a scoped source and send its first event.</p>}
    <details>
      <summary>Accepted event receipts ({state.events.length})</summary>
      {state.events.map(event => <article className="receipt" key={event.id}>
        <strong>{event.eventId} · {event.intent} · {event.severity}</strong>
        <p>{event.decision.action}: {event.decision.reason}</p>
        <p>{new Date(event.acceptedAt).toLocaleString()} · {state.intakeReceipts?.some(r=>r.event===event.id&&r.observedAt===null)?'source time not supplied':`observed ${new Date(event.observedAt).toLocaleString()}`} · {event.generation}</p>
      </article>)}
    </details>
  </section>;
}
