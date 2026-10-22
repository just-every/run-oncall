import { useState } from 'react';
import { AlertUrgency } from '../urgency/AlertUrgency';
import type { IntakeRun } from '../intake/CompatibleTest';
import { RecentChanges } from '../changes/RecentChanges';
import type { State } from '../family/response-operations/domain';
import { useRecordPage } from '../useRecordPage';
import { RecordPager } from './RecordPager';

function EventReceipts({ revision }: { revision: number }) {
  const [open, setOpen] = useState(false);
  const pager = useRecordPage('events', revision, {}, open);
  const sourceTimeMissing = new Set(pager.data?.sourceTimeMissing);
  return <details open={open} onToggle={event => setOpen(event.currentTarget.open)}>
    <summary>Accepted event receipts{pager.data ? ` (${pager.data.total})` : ''}</summary>
    {open && <>
      <RecordPager pager={pager} label="accepted event receipts" />
      {pager.data?.total === 0 && <p>No accepted event receipts.</p>}
      {pager.data?.items.map(event => <article className="receipt" key={event.id}>
        <strong>{event.eventId} · {event.intent} · {event.severity}</strong>
        <p>{event.decision.action}: {event.decision.reason}</p>
        <p>{new Date(event.acceptedAt).toLocaleString()} · {sourceTimeMissing.has(event.id) ? 'source time not supplied' : `observed ${new Date(event.observedAt).toLocaleString()}`} · {event.generation}</p>
      </article>)}
    </>}
  </details>;
}

export function AlertsPanel({ state, canEdit, busy, run, name, onDeclare, onOpenIncident }: {
  state: State; canEdit: boolean; busy: boolean; run: IntakeRun; name: (id: string | null) => string;
  onDeclare: (data: unknown) => Promise<void>;
  onOpenIncident: (id: string) => void;
}) {
  const pager = useRecordPage('alerts', state.revision);
  return <section className="panel padded">
    <h2>Alerts</h2>
    <p>Signals remain separate from incidents. Recovery affects only its lifecycle generation.
      This list refreshes every 10 seconds while visible; use Refresh for an immediate update.</p>
    <p>Severity is the highest trigger severity recorded for the alert. Declaring an incident keeps that severity.</p>
    <RecordPager pager={pager} label="alerts" />
    {pager.data?.items.map(alert => {
      const summary = pager.data?.summaries?.[alert.id];
      const severity = summary?.severity;
      const title = summary?.title;
      const incidents = state.incidents.filter(incident => incident.alerts.includes(alert.id));
      return <article className="service-card" key={alert.id}>
        <h3>{title}</h3>
        {severity && <span className={`priority sev-${severity}`}>{severity}</span>}
        <p>{state.services.find(service => service.id === alert.service)?.name} · {alert.environment} · {alert.state}</p>
        {alert.priority&&<p>Priority: {alert.priority}</p>}
        <p>{alert.source} / {alert.key} / {alert.generation}</p>
        <p>{alert.suppressed ? 'Suppressed' : name(alert.owner)} · {alert.events.length} events</p>
        <AlertUrgency alert={alert} state={state} canEdit={canEdit} busy={busy} run={run}/><details><summary>Service runbook</summary>{state.services.find(s=>s.id===alert.service)?.runbook.length ? <ol>{state.services.find(s=>s.id===alert.service)!.runbook.map((step,n)=><li key={n}>{step}</li>)}</ol> : <p>No service runbook is configured.</p>}</details>
        <RecentChanges service={alert.service} at={summary?.observedAt ?? undefined} revision={state.revision} />
        {incidents.map(incident => <p key={incident.id}><a href="#incidents" onClick={() => onOpenIncident(incident.id)}>Open incident: {incident.title}</a> · {incident.state}</p>)}
        {canEdit && incidents.length === 0 && <button disabled={busy || !severity} onClick={() => onDeclare({
          type: 'declare', service: alert.service, title, severity,
          summary: 'Declared from alert; impact requires responder review', alerts: [alert.id],
        })}>Declare incident from alert</button>}
      </article>;
    })}
    {pager.data?.total === 0 && <p>No admitted alerts. Configure a scoped source and send its first event.</p>}
    <EventReceipts revision={state.revision} />
  </section>;
}
