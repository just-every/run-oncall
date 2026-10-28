import {useState} from 'react';
import type {Alert, State} from '../family/response-operations/domain';
import type {IntakeRun} from '../intake/CompatibleTest';
import {AlertUrgency} from '../urgency/AlertUrgency';
import {CorrelationExplanation} from '../orchestration/Explanation';
import {RecentChanges} from '../changes/RecentChanges';
import {EvidenceLink} from '../reviews/display';
import {shortTime} from '../reviews/time';
import {alertDisplay} from './alert-display';
export function AlertPage({alert, state, canEdit, busy, run, name, onDeclare, onOpenIncident,onSaved,draftScope}: {alert: Alert; state: State; canEdit: boolean; busy: boolean; run: IntakeRun; name: (id: string | null) => string; onDeclare: (data: unknown) => Promise<void>; onOpenIncident: (id: string) => void;onSaved:(alert:Alert)=>void;draftScope:string}) {
  const {events, triggers, severity, title, service, incidents} = alertDisplay(alert, state);
  const [chosenService, setChosenService] = useState('');
  const source = state.intakeSources?.find(source => alert.source === 'intake:' + source.id);
  const scopedServices = state.services.filter(service => source?.routing?.scope.includes(service.id));
  const incidentService = alert.service ?? chosenService;
  const held=state.alerts.filter(a=>a.state==='active'&&a.source===alert.source&&a.service===alert.service&&a.environment===alert.environment&&a.key===alert.key&&[...a.events].reverse().map(id=>state.events.find(e=>e.id===id)).find(e=>e?.intent==='trigger')?.decision.correlation?.held);
  return <article className="panel padded alert-page" aria-label="Alert details">
    <a className="alert-back" href="/alerts">‹ Alerts</a>
    <h2>{title}</h2><p className="alert-meta"><span className={'priority sev-' + severity}>{severity}</span> · {service?.name ?? 'Integration unrouted queue'} · {alert.environment} · {alert.state}</p>
    {incidents.map(incident => <p key={incident.id}><a href={'/incidents/' + encodeURIComponent(incident.id)} onClick={event => {event.preventDefault(); onOpenIncident(incident.id);}}>In incident {incident.title}</a></p>)}
    <AlertUrgency storageKey={'alert-urgency:'+draftScope+':'+alert.id} onSaved={onSaved} alert={alert} state={state} canEdit={canEdit && alert.service !== null} busy={busy} run={run} />
    <section className="alert-runbook"><h3>Runbook</h3>{service?.runbook.length ? <ol>{service.runbook.map((step, index) => <li key={index}>{step}</li>)}</ol> : <p>No service runbook is configured.</p>}</section>
    {canEdit && !incidents.length && <>
      {alert.service === null && <label className="field">Incident service<select aria-label="Incident service" value={chosenService} onChange={event => setChosenService(event.target.value)}><option value="">Choose a service</option>{scopedServices.map(service => <option key={service.id} value={service.id}>{service.name}</option>)}</select></label>}
      <button disabled={busy || !severity || !incidentService || alert.service === null && !scopedServices.some(service => service.id === incidentService)} onClick={() => onDeclare({type: 'declare', service: incidentService, title, severity, summary: 'Declared from alert; impact requires responder review', alerts: [alert.id]})}>Declare incident from alert</button>
    </>}
    {alert.service !== null && <RecentChanges service={alert.service} at={triggers[0]?.observedAt ?? events[0]?.observedAt} revision={state.revision} windowChoices />}
    <details><summary>Event context</summary><p>{events.length} retained events · {alert.suppressed ? 'Suppressed · Owner: '+name(alert.owner) : name(alert.owner)}{alert.priority ? ' · Priority: ' + alert.priority : ''}</p>
      <CorrelationExplanation decision={events.at(-1)?.decision} ownerView />
      {!!held.length&&<><p>{held.length} held active {held.length===1?'generation':'generations'} · paging OFF.</p><details><summary>Retained generations and evidence</summary>{held.flatMap(a=>a.events.map(id=>state.events.find(e=>e.id===id))).filter(e=>e!==undefined).map(event=><article key={event.id}><strong>{event.title}</strong><p>{event.intent==='trigger'?'Triggered':'Recovered'} · {shortTime(event.observedAt)}</p><EvidenceLink url={event.evidence}>Source evidence</EvidenceLink></article>)}</details></>}

      {alert.obligation && <p>Paging obligation: {alert.obligation.state} · {alert.obligation.target.kind === 'user' ? 'Integration owner: ' + name(alert.obligation.target.id) : 'Service policy'} · {alert.obligation.urgency} urgency · paging OFF; non-automatic.</p>}
      {alert.obligation?.state === 'stopped' && <><p>{alert.obligation.outcome}</p><p>Recovery recorded{alert.obligation.stoppedAt?' · '+shortTime(alert.obligation.stoppedAt):''}</p>{alert.obligation.cancellation&&<p>Attempt cancellation: {alert.obligation.cancellation}</p>}{alert.obligation.recoveryNotice && <p>Recovered notice: {alert.obligation.recoveryNotice.mode === 'silent' ? 'Stop silently' : 'Everyone already notified'} · {alert.obligation.recoveryNotice.state} · non-automatic.</p>}</>}
      {alert.coordination && <><p>Coordination: {alert.coordination.state} · {name(alert.coordination.assignee)}</p><details><summary>Coordination history</summary>{alert.coordination.history.map(entry => <p key={entry.id}>{entry.text} · {name(entry.actor)}</p>)}</details></>}
    </details>
  </article>;
}
