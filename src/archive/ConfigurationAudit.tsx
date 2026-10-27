import type {State} from "../family/response-operations/domain";
const time = (value: string) =>
  new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
export function ConfigurationAudit({state: s}: {state: State}) {
  const references = [...s.services, ...s.members, ...(s.intakeSources??[]), ...(s.changeSources??[]), ...(s.emailAddresses??[]), ...(s.apiClients??[]), ...(s.apiEndpoints??[])].filter(r=>r.id.length>=8&&r.id!==r.name).sort((a,b)=>b.id.length-a.id.length);
  const recordName = (id: string) => s.services.find(r=>r.id===id)?.name ?? s.members.find(r=>r.id===id)?.name ?? s.incidents.find(r=>r.id===id)?.title ?? s.events.find(r=>r.id===id)?.title ?? s.events.find(e=>s.alerts.find(a=>a.id===id)?.events.includes(e.id))?.title ?? 'Retained record';
  const description = (entry: State['audit'][number]) => {
    const event = entry.kind==='event' ? s.events.find(e=>entry.actor==='source:'+e.source&&entry.text.startsWith(e.intent+' '+e.eventId+':')) : undefined;
    const text = event ? `${event.intent==='recover'?'Recovered':'Received'} ${event.title}: ${event.decision.reason}` : entry.text;
    let display = text.replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, recordName);
    for(const record of references) {
      const escaped = record.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      display = display.replace(new RegExp('(?<![\\w-])'+escaped+'(?![\\w-])','g'),()=>record.name);
    }
    return display;
  };
  return (
          <section className="panel padded archive-audit">
            <h2>Configuration audit</h2>
            {s.audit.slice(-5).reverse().map(entry => <p key={entry.id}>{time(entry.at)} · {entry.kind.replaceAll('-', ' ')} · {description(entry)}</p>)}
            {s.audit.length>5&&<details><summary>Show all ({s.audit.length})</summary>{s.audit.slice(0,-5).reverse().map(entry=><p key={entry.id}>{time(entry.at)} · {entry.kind.replaceAll('-', ' ')} · {description(entry)}</p>)}</details>}
          </section>
  );
}
