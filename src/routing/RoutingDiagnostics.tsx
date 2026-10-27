import {DecisionExplanation} from './DecisionExplanation';
import {shortTime} from '../integrations/catalog';
import { useId, useRef, useState } from 'react';
import type { State } from '../family/response-operations/domain';
import type { IntakeSource } from '../intake/model';
import type { IntakeRun } from '../intake/CompatibleTest';

export function RoutingDiagnostics({state,source,admin,busy,run}:{state:State;source:IntakeSource;admin:boolean;busy:boolean;run:IntakeRun}) {
  const uid=useId(),[targets,setTargets]=useState<Record<string,string>>({}),[filter,setFilter]=useState('unrouted'),operations=useRef<Record<string,string>>({});
  const receipts=(state.intakeReceipts??[]).filter(r=>r.source===source.id),readmitted=new Set(receipts.map(r=>r.routing?.readmission?.receipt).filter(Boolean));
  const queue=receipts.filter(r=>r.outcome==='unrouted'&&!readmitted.has(r.id)),visible=(filter==='unrouted'?queue:receipts).slice(-30).reverse();
  return <section className="panel padded routing-diagnostics" aria-label="Routing diagnostics"><div className="routing-heading"><div><h2>Unrouted alerts and diagnostics</h2></div><span className="tag">{queue.length} unrouted</span></div>
    <label className="field"><span id={uid+'filter'}>Routing receipt filter</span><select aria-labelledby={uid+'filter'} value={filter} onChange={e=>setFilter(e.target.value)}><option value="unrouted">Unrouted queue</option><option value="all">All routing receipts</option></select></label>
    {!visible.length&&<p>{filter==='unrouted'?'No unresolved unrouted events.':'No retained routing receipts yet.'}</p>}
    {visible.map(r=><article key={r.id}><h4>{r.title||'Received event'}</h4><p>{r.action} · {r.outcome} · {r.service?state.services.find(s=>s.id===r.service)?.name:'Unrouted'}</p><p>Routing version {r.routing?.version} · <time dateTime={r.acceptedAt}>{shortTime(r.acceptedAt)}</time></p>{r.incomplete&&r.alert&&<p>High-urgency incomplete-intake alert · integration-owner page obligation recorded · paging OFF; non-automatic.</p>}
      <details><summary>Routing and service orchestration explanation</summary><p>{r.routing?.serviceDecision?.action??'No matching service rule'} · {state.members.find(m=>m.id===r.routing?.serviceDecision?.owner)?.name??'Unassigned'}</p><DecisionExplanation decision={r.routing?.serviceDecision} events={state.events}/></details>
      {admin&&r.outcome==='unrouted'&&!readmitted.has(r.id)&&<div><label className="field"><span id={uid+r.id}>Re-admit to service</span><select aria-labelledby={uid+r.id} value={targets[r.id]??source.routing!.scope[0]} onChange={e=>setTargets({...targets,[r.id]:e.target.value})}>{source.routing!.scope.map(id=><option key={id} value={id}>{state.services.find(s=>s.id===id)?.name??id}</option>)}</select></label><button disabled={busy} onClick={()=>{operations.current[r.id]??=crypto.randomUUID();return run('/api/routing/keys/'+encodeURIComponent(source.id)+'/readmit',{receipt:r.id,service:targets[r.id]??source.routing!.scope[0],operationId:operations.current[r.id]},'Event re-admitted; original receipt retained');}}>Re-admit retained event</button></div>}
      {readmitted.has(r.id)&&<p>Re-admitted as a separate, attributed admission.</p>}
    </article>)}

  </section>;
}
