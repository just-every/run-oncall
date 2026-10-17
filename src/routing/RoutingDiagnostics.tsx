import { useId, useRef, useState } from 'react';
import type { State } from '../family/response-operations/domain';
import type { IntakeSource } from '../intake/model';
import type { IntakeRun } from '../intake/CompatibleTest';

export function RoutingDiagnostics({state,source,admin,busy,run}:{state:State;source:IntakeSource;admin:boolean;busy:boolean;run:IntakeRun}) {
  const uid=useId(),[targets,setTargets]=useState<Record<string,string>>({}),[filter,setFilter]=useState('unrouted'),operations=useRef<Record<string,string>>({});
  const receipts=(state.intakeReceipts??[]).filter(r=>r.source===source.id),readmitted=new Set(receipts.map(r=>r.routing?.readmission?.receipt).filter(Boolean));
  const queue=receipts.filter(r=>r.outcome==='unrouted'&&!readmitted.has(r.id)),visible=(filter==='unrouted'?queue:receipts).slice(-30).reverse();
  return <section className="panel padded routing-diagnostics" aria-label="Routing diagnostics"><div className="routing-heading"><div><h2>Unrouted alerts and diagnostics</h2><p>Inspect why each event took its route. Original receipts remain immutable.</p></div><span className="tag">{queue.length} unrouted</span></div>
    <label className="field"><span id={uid+'filter'}>Routing receipt filter</span><select aria-labelledby={uid+'filter'} value={filter} onChange={e=>setFilter(e.target.value)}><option value="unrouted">Unrouted queue</option><option value="all">All routing receipts</option></select></label>
    {!visible.length&&<p>{filter==='unrouted'?'No unresolved unrouted events.':'No retained routing receipts yet.'}</p>}
    {visible.map(r=><article key={r.id}><h4>{r.title||r.key}</h4><p>{r.action} · {r.outcome} · {r.service?state.services.find(s=>s.id===r.service)?.name:'Unrouted'}</p><p>Key <code>{r.key}</code> · routing v{r.routing?.version} · {r.routing?.rule??'catch-all'}</p>{r.routing?.diagnostics.map((d,i)=><p key={i}>{d}</p>)}<p><time dateTime={r.acceptedAt}>{new Date(r.acceptedAt).toLocaleString()}</time></p>
      <details><summary>Routing and service orchestration explanation</summary><pre tabIndex={0}>{JSON.stringify(r.routing,null,2)}</pre></details>
      {admin&&r.outcome==='unrouted'&&!readmitted.has(r.id)&&<div><label className="field"><span id={uid+r.id}>Re-admit to service</span><select aria-labelledby={uid+r.id} value={targets[r.id]??source.routing!.scope[0]} onChange={e=>setTargets({...targets,[r.id]:e.target.value})}>{source.routing!.scope.map(id=><option key={id} value={id}>{state.services.find(s=>s.id===id)?.name??id}</option>)}</select></label><button disabled={busy} onClick={()=>{operations.current[r.id]??=crypto.randomUUID();return run('/api/routing/keys/'+encodeURIComponent(source.id)+'/readmit',{receipt:r.id,service:targets[r.id]??source.routing!.scope[0],operationId:operations.current[r.id]},'Event re-admitted; original receipt retained');}}>Re-admit retained event</button></div>}
      {readmitted.has(r.id)&&<p>Re-admitted as a separate, attributed admission.</p>}
    </article>)}
    <p className="muted">Showing up to 30 receipts. Export includes the complete retained history. <a href="/docs/routed-intake">Routing guide</a></p>
  </section>;
}
