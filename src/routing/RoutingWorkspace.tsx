import {AllowanceForm} from '../intake-rate/AllowanceForm';
import { useId, useState } from 'react';
import { Form } from '../forms';
import { request } from '../useWorkspace';
import type { State } from '../family/response-operations/domain';
import type { IntakeSource } from '../intake/model';
import type { IntakeRun } from '../intake/CompatibleTest';
import type { RoutingRule, RoutingExplanation } from './types';
import { RuleEditor } from './RuleEditor';
import { RoutingKeyForm } from './RoutingKeyForm';
import { RoutingDiagnostics } from './RoutingDiagnostics';
import './routing.css';

type Props={state:State;admin:boolean;busy:boolean;run:IntakeRun};
function OrchestrationDecision({label,value,state,source}:{label:string;value:RoutingExplanation;state:State;source:IntakeSource}) {
 const decision=value.serviceDecision,owner=decision?.owner??(value.service===null?source.routing?.owner:null);
 return <div style={{overflowWrap:'anywhere'}}><p><strong>{label}</strong>: routing v{value.version} · {decision?.version?'service rule v'+decision.version:'no service rule'} · {decision?.action??'unrouted'} · owner {state.members.find(member=>member.id===owner)?.name??'Unassigned'}.</p>{decision&&<p>{decision.reason}</p>}</div>;
}

export function RoutingWorkspace(props:Props) {
  const [selected,setSelected]=useState(''),uid=useId(),sources=(props.state.intakeSources??[]).filter(s=>s.routing&&!s.id.startsWith('native:'));
  const source=sources.find(s=>s.id===selected)??sources[0];
  return <div className="routing-workspace">
    {sources.length>0&&<label className="field"><span id={uid}>Routed integration</span><select aria-labelledby={uid} value={source?.id} onChange={e=>setSelected(e.target.value)}>{sources.map(s=><option key={s.id} value={s.id}>{s.name} · {s.active?'active':'inactive'}</option>)}</select></label>}
    {source?<RoutingKey key={source.id} {...props} source={source}/>:<section className="panel padded"><h2>Routed integration keys</h2><p>Send several services through one monitoring key. Ordered rules choose one allowed service for each event, before that service’s coordination policy runs.</p><p>No routed keys yet. An administrator can create the first key below. <a href="/docs/routed-intake">Read the routing guide</a>.</p></section>}
    {props.admin&&<RoutingKeyForm state={props.state} busy={props.busy} run={props.run}/>}
  </div>;
}

function RoutingKey({state,admin,busy,run,source}:Props&{source:IntakeSource}) {
  const initial=source.routing!.versions.at(-1)!,[base,setBase]=useState(initial.version),[rules,setRules]=useState<RoutingRule[]>(structuredClone(initial.rules)),[catchAll,setCatchAll]=useState<string|null>(initial.catchAll),[preview,setPreview]=useState<any>(null),[previewing,setPreviewing]=useState(false),[error,setError]=useState(''),[newKey,setNewKey]=useState(''),uid=useId();
  const services=state.services.filter(s=>source.routing!.scope.includes(s.id)),current=source.routing!.versions.at(-1)!;
  const changed=()=>{setPreview(null);setError('');};
  const edit=(index:number,value:RoutingRule)=>{setRules(rules.map((r,i)=>i===index?value:r));changed();};
  return <>
    <section className="panel padded" aria-label="Routing rules">
      <div className="routing-heading"><div><h2>{source.name}</h2><p>Route events to the right service using ordered rules and a clear catch-all.</p></div><span className="tag">Published v{current.version} · {source.active?'active':'inactive'}</span></div>
      <div className="routing-overview"><div><strong>Key name</strong><p><code>{source.id}</code></p><small>{source.provider} · {state.members.find(m=>m.id===source.routing!.owner)?.name??'Owner unavailable'}</small></div><div><strong>Allowed services</strong><p>{services.map(s=><span className="tag" key={s.id}>{s.name}</span>)}</p></div><div><strong>Routing order</strong><p>Top to bottom. First matching rule wins.</p><small>Service orchestration runs second. Paging is OFF.</small></div></div>
      {error&&<p role="alert" className="error">{error}</p>}
      {base!==current.version&&<p role="alert">This draft is based on v{base}; v{current.version} is now published. Publishing this stale draft will be refused. <button type="button" onClick={()=>{setBase(current.version);setRules(structuredClone(current.rules));setCatchAll(current.catchAll);changed();}}>Reload published rules</button></p>}
      {source.provider==='native'&&<p>Native Events API · {source.authentication==='signed'?'HMAC signature':'Bearer token'} · <code>/api/ingress/intake:{source.id}</code>. The credential is never returned. <a href="/docs/routed-intake">Native sender instructions</a></p>}
      <AllowanceForm state={state} id={'intake:'+source.id} admin={admin} busy={busy} run={run}/><ul aria-label="Throttle notices">{state.audit.filter(a=>a.kind==='intake-throttled'&&a.actor==='source:intake:'+source.id).slice(-5).map(a=><li key={a.id}>{a.text}</li>)}</ul>
      <h3>Routing rules</h3><p>Draft based on version {base}. Changes below take effect only after publication.</p>
      {!rules.length&&<p>No rules. Every event takes the catch-all decision.</p>}
      {rules.map((rule,i)=>admin?<RuleEditor key={i} rule={rule} index={i} services={services} disabled={busy} first={i===0} last={i===rules.length-1} onChange={value=>edit(i,value)} onRemove={()=>{setRules(rules.filter((_,n)=>n!==i));changed();}} onMove={delta=>{const next=[...rules];[next[i],next[i+delta]]=[next[i+delta],next[i]];setRules(next);changed();}}/>:<article className="routing-rule" key={i}><h4>{i+1}. {rule.id}</h4><p>{rule.match} conditions · {'service' in rule.target?services.find(s=>'service' in rule.target&&s.id===rule.target.service)?.name:'Dynamic service field '+rule.target.field}</p><pre tabIndex={0}>{JSON.stringify(rule.conditions,null,2)}</pre></article>)}
      {admin&&<button type="button" disabled={busy||rules.length>=100} onClick={()=>{setRules([...rules,{id:'rule-'+crypto.randomUUID().slice(0,8),match:'all',conditions:[{field:'payload.custom_details.team',op:'equals',value:''}],target:{service:services[0]?.id??''}}]);changed();}}>Add routing rule</button>}
      <div className="routing-catchall"><label className="field"><span id={uid+'catch'}>Catch-all for unmatched events</span><select aria-labelledby={uid+'catch'} disabled={!admin||busy} value={catchAll??''} onChange={e=>{setCatchAll(e.target.value||null);changed();}}><option value="">Record unrouted · integration owner queue</option>{services.map(s=><option key={s.id} value={s.id}>Route to {s.name}</option>)}</select><small>Applies to later events. Existing receipts keep their original decisions.</small></label></div>
      <div className="routing-actions"><button disabled={busy||previewing} onClick={async()=>{
        setPreviewing(true);setError('');setPreview(null);try{setPreview(await request('/api/routing/keys/'+encodeURIComponent(source.id)+'/preview',{baseVersion:base,rules,catchAll,receiptIds:(state.intakeReceipts??[]).filter(r=>r.source===source.id).map(r=>r.id)}));}catch(e){setError((e as Error).message);}finally{setPreviewing(false);}
      }}>{previewing?'Comparing…':'Preview routing changes'}</button>{admin&&<button className="primary" disabled={busy} onClick={async()=>{const result=await run('/api/routing/keys/'+encodeURIComponent(source.id)+'/publish',{baseVersion:base,rules,catchAll},'Routing rules published');if(result){setBase(result.version);setPreview(null);}}}>Publish routing rules</button>}</div>
      {preview&&<div className="routing-replay" role="region" aria-label="Routing preview"><h3>Read-only routing comparison</h3><p role="status">{preview.decisions.length} retained events compared. No records changed.</p>{preview.warnings?.map((warning:string,i:number)=><p key={i} role="status">{warning}</p>)}<ol>{preview.decisions.map((row:any)=><li key={row.receipt}><h4 style={{overflowWrap:'anywhere'}}>{state.intakeReceipts?.find(receipt=>receipt.id===row.receipt)?.title??row.receipt}</h4><code>{row.receipt}</code><p>{row.changed?'Decision changes':'Decision unchanged'} · {row.historical?.service??'Unrouted'} → {row.proposed?.service??'Unrouted'}</p><OrchestrationDecision label="Historical" value={row.historical} state={state} source={source}/><OrchestrationDecision label="Proposed" value={row.proposed} state={state} source={source}/>{row.warning&&<p>{row.warning}</p>}<details><summary>Ordered routing decisions</summary><pre tabIndex={0}>{JSON.stringify({historical:row.historical,proposed:row.proposed},null,2)}</pre></details></li>)}</ol>{!preview.decisions.length&&<p>No retained events yet. Send events through this key to compare real routing decisions.</p>}</div>}
      <details><summary>Published version history ({source.routing!.versions.length})</summary>{source.routing!.versions.slice().reverse().map(v=><article className="service-card" key={v.version}><strong>Version {v.version}</strong><p>{new Date(v.publishedAt).toLocaleString()} · {state.members.find(m=>m.id===v.publishedBy)?.name??v.publishedBy} · {v.rules.length} rules</p><details><summary>Retained rules and catch-all</summary><pre tabIndex={0}>{JSON.stringify({rules:v.rules,catchAll:v.catchAll},null,2)}</pre></details></article>)}</details>
      {admin&&<details><summary>Rotate or revoke this key</summary><Form busy={busy} label="Rotate routed key" onSubmit={async()=>{const result=await run('/api/routing/keys',{id:source.id,name:source.name,provider:source.provider,scope:source.routing!.scope,owner:source.routing!.owner,key:newKey,revision:source.revision},'Routed key rotated; old credential refused');if(result)setNewKey('');return false;}}><label className="field">Replacement private key<input type="password" autoComplete="new-password" required minLength={32} maxLength={200} value={newKey} onChange={e=>setNewKey(e.target.value)}/><small>Store the replacement privately in your sender before saving. Rotation activates a restored or revoked definition.</small></label></Form><button disabled={busy||!source.active} onClick={()=>run('/api/intake/sources/'+encodeURIComponent(source.id)+'/revoke',{revision:source.revision},'Routed key revoked')}>Revoke routed key</button></details>}
    </section>
    <RoutingDiagnostics state={state} source={source} admin={admin} busy={busy} run={run}/>
  </>;
}
