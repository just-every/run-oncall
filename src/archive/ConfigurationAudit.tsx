import {nativeName} from '../integrations/native-name';
import type {State} from "../family/response-operations/domain";
import {shortTime} from '../reviews/time';
import {urgencyLabel} from '../reviews/display';
export function ConfigurationAudit({state: s}: {state: State}) {
  // Native source display names are encoded in their established identity.
  // The audit and allowance records keep that identity for exports and erasure.
  const nativeIds = new Set([
    ...(s.keyAllowances??[]).filter(row=>row.id.startsWith('source:')).map(row=>row.id.slice(7)),
    ...s.audit.filter(row=>row.actor.startsWith('source:source:')).map(row=>row.actor.slice(14)),
  ]);
  const sourceReferences = [
    ...(s.intakeSources??[]).flatMap(row=>[
      {id:'intake:'+row.id,name:row.name},
      ...(row.id.startsWith('native:')?[{id:'source:'+row.id.slice(7),name:nativeName(row.id.slice(7))}]:[]),
    ]),
    ...[...nativeIds].flatMap(id=>[{id:'source:'+id,name:nativeName(id)},{id,name:nativeName(id)}]),
  ];
  const references = [...sourceReferences, ...s.services, ...s.members, ...(s.intakeSources??[]), ...(s.changeSources??[]), ...(s.emailAddresses??[]), ...(s.apiClients??[]), ...(s.apiEndpoints??[])].filter(r=>r.id.length>=8&&r.id!==r.name).sort((a,b)=>b.id.length-a.id.length);
  const recordName = (id: string) => {
    const policy = s.policies.find(row => row.id === id);
    return s.services.find(r=>r.id===id)?.name ?? s.members.find(r=>r.id===id)?.name ?? s.incidents.find(r=>r.id===id)?.title ?? s.events.find(r=>r.id===id)?.title ?? s.events.find(e=>s.alerts.find(a=>a.id===id)?.events.includes(e.id))?.title ?? (policy ? `${s.services.find(service=>service.id===policy.service)?.name ?? 'Service'} · ${policy.severity==='*'?'All severities':policy.severity}` : 'Retained record');
  };
  const kindLabel = (kind: string) => kind === 'policy' ? 'coordination rule' : kind.replaceAll('-', ' ');
  const description = (entry: State['audit'][number]) => {
    const event = entry.kind==='event' ? s.events.find(e=>entry.actor==='source:'+e.source&&entry.text.startsWith(e.intent+' '+e.eventId+':')) : undefined;
    let text = event ? `${event.intent==='recover'?'Recovered':'Received'} ${event.title}: ${event.decision.reason}` : entry.text;
    if (entry.kind === 'key-allowance') text = text.replace(/^(Configured allowance for )source:(.+)(: \d+ requests and \d+ new events per rolling minute)$/, (_, before, id, after) => before + nativeName(id) + after);
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
