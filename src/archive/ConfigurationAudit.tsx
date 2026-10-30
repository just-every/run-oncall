import type {State} from "../family/response-operations/domain";
import {shortTime} from '../reviews/time';
import {urgencyLabel} from '../reviews/display';
export function ConfigurationAudit({state: s}: {state: State}) {
  const references = [...s.services, ...s.members, ...(s.intakeSources??[]), ...(s.changeSources??[]), ...(s.emailAddresses??[]), ...(s.apiClients??[]), ...(s.apiEndpoints??[])].filter(r=>r.id.length>=8&&r.id!==r.name).sort((a,b)=>b.id.length-a.id.length);
  const recordName = (id: string) => {
    const policy = s.policies.find(row => row.id === id);
    return s.services.find(r=>r.id===id)?.name ?? s.members.find(r=>r.id===id)?.name ?? s.incidents.find(r=>r.id===id)?.title ?? s.events.find(r=>r.id===id)?.title ?? s.events.find(e=>s.alerts.find(a=>a.id===id)?.events.includes(e.id))?.title ?? (policy ? `${s.services.find(service=>service.id===policy.service)?.name ?? 'Service'} · ${policy.severity==='*'?'All severities':policy.severity}` : 'Retained record');
  };
  const kindLabel = (kind: string) => kind === 'policy' ? 'coordination rule' : kind.replaceAll('-', ' ');
  const description = (entry: State['audit'][number]) => {
    const event = entry.kind==='event' ? s.events.find(e=>entry.actor==='source:'+e.source&&entry.text.startsWith(e.intent+' '+e.eventId+':')) : undefined;
    const text = event ? `${event.intent==='recover'?'Recovered':'Received'} ${event.title}: ${event.decision.reason}` : entry.text;
    let display = text.replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, recordName);
    for(const record of references) {
      const escaped = record.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      display = display.replace(new RegExp('(?<![\\w-])'+escaped+'(?![\\w-])','g'),()=>record.name);
    }
    if (entry.kind === 'change-source' || entry.kind === 'change-source-revoked') display = display.replace(/; revision \d+$/, '');
    if (entry.kind === 'alert-urgency') display = display.replace(/^(Alert [\s\S]*?): (unset|high|low) → (high|low); rule (human|\d+)/, (_, alert, from, to, rule) => `${alert}: ${from === 'unset' ? 'New' : urgencyLabel(from)} → ${urgencyLabel(to)} · ${rule === '0' ? 'Service default' : rule === 'human' ? 'Recorded decision' : 'Urgency policy version ' + rule}`);
    return display;
  };
  return (
          <section className="panel padded archive-audit">
            <h2>Configuration audit</h2>
            {s.audit.slice(-5).reverse().map(entry => <p key={entry.id}>{shortTime(entry.at)} · {kindLabel(entry.kind)} · {description(entry)}</p>)}
            {s.audit.length>5&&<details><summary>Show all ({s.audit.length})</summary>{s.audit.slice(0,-5).reverse().map(entry=><p key={entry.id}>{shortTime(entry.at)} · {kindLabel(entry.kind)} · {description(entry)}</p>)}</details>}
          </section>
  );
}
