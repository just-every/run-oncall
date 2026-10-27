import {DecisionExplanation} from './DecisionExplanation';
import {AllowanceForm} from '../intake-rate/AllowanceForm';
import { useId, useState } from 'react';
import { Form } from '../forms';
import {failureMessage} from '../app/FailureLine';
import { compareRequest, request } from '../useWorkspace';
import type { State } from '../family/response-operations/domain';
import type { IntakeSource } from '../intake/model';
import type { IntakeRun } from '../intake/CompatibleTest';
import type { RoutingRule, RoutingExplanation } from './types';
import { RuleEditor } from './RuleEditor';
import { RoutingKeyForm } from './RoutingKeyForm';
import {useVersionDraft} from '../integrations/useVersionDraft';
import {InlineConfirm} from '../app/autosave/InlineConfirm';
import {OneTimeSecret} from '../integrations/OneTimeSecret';
import {privateKey,shortTime} from '../integrations/catalog';
import { RoutingDiagnostics } from './RoutingDiagnostics';
import './routing.css';

type Props={state:State;admin:boolean;busy:boolean;run:IntakeRun};
function OrchestrationDecision({label,value,state,source}:{label:string;value:RoutingExplanation;state:State;source:IntakeSource}) {
 const decision=value.serviceDecision,owner=decision?.owner??(value.service===null?source.routing?.owner:null);
 return <div style={{overflowWrap:'anywhere'}}><p><strong>{label}</strong>: routing v{value.version} · {decision?.version?'service rule v'+decision.version:'no service rule'} · {decision?.action??'unrouted'} · owner {state.members.find(member=>member.id===owner)?.name??'Unassigned'}.</p>{decision&&<><p>{decision.reason}</p><DecisionExplanation decision={decision} events={state.events}/></>}</div>;
}

export function RoutingWorkspace(props:Props) {
  const [selected,setSelected]=useState(''),uid=useId(),sources=(props.state.intakeSources??[]).filter(s=>s.routing&&!s.id.startsWith('native:'));
  const source=sources.find(s=>s.id===selected)??sources[0];
  return <div className="routing-workspace">
    {sources.length>0&&<label className="field"><span id={uid}>Routed integration</span><select aria-labelledby={uid} value={source?.id} onChange={e=>setSelected(e.target.value)}>{sources.map(s=><option key={s.id} value={s.id}>{s.name} · {s.active?'active':'inactive'}</option>)}</select></label>}
    {source?<RoutingKey key={source.id} {...props} source={source}/>:<section className="panel padded"><h2>Routed integration keys</h2><p>Send several services through one monitoring key. Ordered rules choose one allowed service for each event, before that service’s coordination policy runs.</p></section>}
    {props.admin&&<RoutingKeyForm state={props.state} busy={props.busy} run={props.run} defaultOpen={!sources.length} onCreated={setSelected}/>}
  </div>;
}

function RoutingKey({state,admin,busy,run,source}:Props&{source:IntakeSource}) {
  const initial=source.routing!.versions.at(-1)!,draft=useVersionDraft('routed-key',source.id,initial.version,{rules:initial.rules,catchAll:initial.catchAll});
  const base=draft.baseVersion,rules=draft.value.rules,catchAll=draft.value.catchAll,setRules=(rules:RoutingRule[])=>draft.edit({...draft.value,rules}),setCatchAll=(catchAll:string|null)=>draft.edit({...draft.value,catchAll});
  const [preview,setPreview]=useState<any>(null),[previewing,setPreviewing]=useState(false),[error,setError]=useState(''),[newKey,setNewKey]=useState(''),[confirm,setConfirm]=useState<'publish'|'rotate'|'revoke'>(),uid=useId();
  const services=state.services.filter(s=>source.routing!.scope.includes(s.id)),current=source.routing!.versions.at(-1)!;
  const changed=()=>{setPreview(null);setError('');};
  const edit=(index:number,value:RoutingRule)=>{setRules(rules.map((r,i)=>i===index?value:r));changed();};
  return <>
    <section className="panel padded" aria-label="Routing rules">
      <div className="routing-heading"><div><h2>{source.name}</h2><p>Route events to the right service using ordered rules and a clear catch-all.</p></div><span className="tag">Published v{current.version} · {!source.active?'Inactive':''}</span></div>
      <p>{state.members.find(m=>m.id===source.routing!.owner)?.name??'Owner unavailable'} · {services.map(s=>s.name).join(', ')}{!source.active?' · Inactive':''}</p>
      {error&&<p role="alert" className="error">{error}</p>}
      {base!==current.version&&<p role="alert">This draft is based on v{base}; v{current.version} is now published. Publishing this stale draft will be refused. <button type="button" onClick={()=>{draft.useMine();changed();}}>Use mine</button></p>}

      <AllowanceForm state={state} id={'intake:'+source.id} admin={admin} busy={busy} run={run}/><ul aria-label="Throttle notices">{state.audit.filter(a=>a.kind==='intake-throttled'&&a.actor==='source:intake:'+source.id).slice(-5).map(a=><li key={a.id}>{a.text}</li>)}</ul>
      <h3>Routing rules</h3><p>Draft based on version {base}. Changes below take effect only after publication.</p>
      {!rules.length&&<p>No rules. Every event takes the catch-all decision.</p>}
      {rules.map((rule,i)=>admin?<RuleEditor key={i} rule={rule} index={i} services={services} disabled={busy} first={i===0} last={i===rules.length-1} onChange={value=>edit(i,value)} onRemove={()=>{setRules(rules.filter((_,n)=>n!==i));changed();}} onMove={delta=>{const next=[...rules];[next[i],next[i+delta]]=[next[i+delta],next[i]];setRules(next);changed();}}/>:<article className="routing-rule" key={i}><h4>Rule {i+1}</h4><p>{rule.match} conditions · {'service' in rule.target?services.find(s=>'service' in rule.target&&s.id===rule.target.service)?.name:'Extracted service'}</p><pre tabIndex={0}>{JSON.stringify(rule.conditions,null,2)}</pre></article>)}
      {admin&&<button type="button" disabled={busy||rules.length>=100} onClick={()=>{setRules([...rules,{id:'rule-'+crypto.randomUUID().slice(0,8),match:'all',conditions:[{field:'payload.custom_details.team',op:'equals',value:''}],target:{service:services[0]?.id??''}}]);changed();}}>Add routing rule</button>}
      <div className="routing-catchall"><label className="field"><span id={uid+'catch'}>Catch-all for unmatched events</span><select aria-labelledby={uid+'catch'} disabled={!admin||busy} value={catchAll??''} onChange={e=>{setCatchAll(e.target.value||null);changed();}}><option value="">Record unrouted · integration owner queue</option>{services.map(s=><option key={s.id} value={s.id}>Route to {s.name}</option>)}</select><small>Applies to later events. Existing receipts keep their original decisions.</small></label></div>
      <div className="routing-actions"><button disabled={busy||previewing} onClick={async()=>{
        setPreviewing(true);setError('');setPreview(null);try{setPreview(await compareRequest(`/api/routing/keys/${encodeURIComponent(source.id)}/preview`,{baseVersion:base,rules,catchAll,receiptIds:(state.intakeReceipts??[]).filter(r=>r.source===source.id).map(r=>r.id)}));}catch(e){setError(failureMessage(e,true));}finally{setPreviewing(false);}
      }}>{previewing?'Comparing…':'Preview routing changes'}</button>{admin&&draft.changed&&<button className="primary" disabled={busy||draft.stale} onClick={()=>setConfirm('publish')}>Publish version {current.version+1}</button>}</div>
      {preview&&<div className="routing-replay" role="region" aria-label="Routing preview"><h3>Read-only routing comparison</h3><p role="status">{preview.decisions.length} retained events compared. No records changed.</p>{preview.warnings?.map((warning:string,i:number)=><p key={i} role="status">{warning}</p>)}<ol>{preview.decisions.map((row:any)=><li key={row.receipt}><h4 style={{overflowWrap:'anywhere'}}>{state.intakeReceipts?.find(receipt=>receipt.id===row.receipt)?.title??'Retained event'}</h4><p>{row.changed?'Decision changes':'Decision unchanged'} · {state.services.find(s=>s.id===row.historical?.service)?.name??'Unrouted'} → {state.services.find(s=>s.id===row.proposed?.service)?.name??'Unrouted'}</p><OrchestrationDecision label="Historical" value={row.historical} state={state} source={source}/><OrchestrationDecision label="Proposed" value={row.proposed} state={state} source={source}/>{row.historicalUrgency&&<p>Historical urgency: {row.historicalUrgency.urgency} · rule v{row.historicalUrgency.version} · {row.historicalUrgency.reason}</p>}{row.proposedUrgency&&<p>Proposed urgency: {row.proposedUrgency.urgency} · rule v{row.proposedUrgency.version} · {row.proposedUrgency.reason}</p>}{row.warning&&<p>{row.warning}</p>}</li>)}</ol>{!preview.decisions.length&&<p>No retained events yet. Send events through this key to compare real routing decisions.</p>}</div>}
      <details><summary>Published version history ({source.routing!.versions.length})</summary>{source.routing!.versions.slice().reverse().map(v=><article className="service-card" key={v.version}><strong>Version {v.version}</strong><p>{shortTime(v.publishedAt)} · {state.members.find(m=>m.id===v.publishedBy)?.name??'Unavailable member'} · {v.rules.length} rules</p><details><summary>Retained rules and catch-all</summary><ol>{v.rules.map((rule,i)=><li key={rule.id}>Rule {i+1} · {rule.conditions.map(c=>c.op.replaceAll('-',' ')+(c.value?' '+c.value:'')).join(rule.match==='all'?' and ':' or ')} · {'service' in rule.target?services.find(s=>'service' in rule.target&&s.id===rule.target.service)?.name:'Extracted service'}</li>)}</ol><p>Unmatched: {services.find(s=>s.id===v.catchAll)?.name??'Keep for review'}</p></details></article>)}</details>
      {confirm==='publish'&&<InlineConfirm action={'Publish version '+(current.version+1)} keep="Keep draft" busy={busy} onCancel={()=>setConfirm(undefined)} onConfirm={async()=>{const result=await run('/api/routing/keys/'+encodeURIComponent(source.id)+'/publish',{baseVersion:base,rules,catchAll},'Routing rules published');if(result){draft.accepted(result.version,{rules,catchAll});setPreview(null);setConfirm(undefined);}}}>Apply this routing draft to new events? Retained decisions stay unchanged.</InlineConfirm>}
      {admin&&<details><summary>Rotate or revoke this key</summary><button disabled={busy} onClick={()=>setConfirm('rotate')}>Rotate routed key</button><button disabled={busy||!source.active} onClick={()=>setConfirm('revoke')}>Revoke routed key</button>
       {confirm&&confirm!=='publish'&&<InlineConfirm action={confirm==='rotate'?'Rotate key now':'Revoke key now'} keep="Cancel" busy={busy} onCancel={()=>setConfirm(undefined)} onConfirm={async()=>{const key=privateKey();const result=await run(confirm==='rotate'?'/api/routing/keys':'/api/intake/sources/'+encodeURIComponent(source.id)+'/revoke',confirm==='rotate'?{id:source.id,name:source.name,provider:source.provider,scope:source.routing!.scope,owner:source.routing!.owner,key,revision:source.revision,...(source.authentication?{authentication:source.authentication}:{})}:{revision:source.revision},confirm==='rotate'?'Routed key rotated':'Routed key revoked');if(result){if(confirm==='rotate')setNewKey(key);setConfirm(undefined);}}}>Stop the current key from accepting new events? Accepted history stays.</InlineConfirm>}
      </details>}{newKey&&<OneTimeSecret value={newKey} onDone={()=>setNewKey('')}/>}

    </section>
    <RoutingDiagnostics state={state} source={source} admin={admin} busy={busy} run={run}/>
  </>;
}
