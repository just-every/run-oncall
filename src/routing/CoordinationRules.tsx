import {useState} from 'react';
import {InlineConfirm} from '../app/autosave/InlineConfirm';
import {useVersionDraft} from '../integrations/useVersionDraft';
import type {IntegrationProps} from '../integrations/catalog';
type Rule={service:string;severity:string;action:'route'|'suppress';owner:string};
export function CoordinationRules({state,admin,busy,run}:IntegrationProps) {
 const [editing,setEditing]=useState<string>(),[confirm,setConfirm]=useState(false);
 const key=editing??'new',published=state.policies.find(p=>p.id===key);
 return <section className="panel padded integrations coordination-rules"><h2>Coordination rules</h2>
  {state.policies.map(p=><article className="coordination-row" key={p.id}><strong>{state.services.find(s=>s.id===p.service)?.name} · {p.severity==='*'?'All severities':p.severity}</strong><p>{p.action==='route'?'Route to '+(state.members.find(m=>m.id===p.owner)?.name??'Unassigned'):'Suppress'} · version {p.version}</p>{admin&&<button onClick={()=>{setEditing(p.id);setConfirm(false);}}>Edit rule</button>}</article>)}
  {admin&&state.services.length>0&&<>{editing===undefined?<button onClick={()=>setEditing('new')}>Add rule</button>:<CoordinationDraft key={key} state={state} busy={busy} run={run} id={key} version={published?.version??0} initial={{service:published?.service??state.services[0].id,severity:published?.severity??'*',action:published?.action??'route',owner:published?.owner??state.members.find(m=>m.active&&['admin','responder'].includes(m.role))?.id??''}} confirm={confirm} setConfirm={setConfirm} onPublished={()=>{setEditing(undefined);setConfirm(false);}}/>}</>}
 </section>;
}
function CoordinationDraft({state,busy,run,id,version,initial,confirm,setConfirm,onPublished}:Pick<IntegrationProps,'state'|'busy'|'run'>&{id:string;version:number;initial:Rule;confirm:boolean;setConfirm:(v:boolean)=>void;onPublished:()=>void}) {
 const draft=useVersionDraft('coordination',id,version,initial),value=draft.value;
 const current=state.policies.find(p=>p.service===value.service&&p.severity===value.severity),next=(current?.version??0)+1;
 const change=(field:keyof Rule,to:string)=>draft.edit({...value,[field]:to});
 return <div className="coordination-draft"><h3>Draft rule</h3><div className="routing-fields">
  <label className="field">Service<select value={value.service} onChange={e=>change('service',e.target.value)}>{state.services.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
  <label className="field">Severity<select value={value.severity} onChange={e=>change('severity',e.target.value)}><option value="*">All severities</option><option value="critical">Critical</option><option value="warning">Warning</option><option value="info">Information</option></select></label>
  <label className="field">Decision<select value={value.action} onChange={e=>change('action',e.target.value)}><option value="route">Route to owner</option><option value="suppress">Suppress</option></select></label>
  <label className="field">Owner<select value={value.owner} onChange={e=>change('owner',e.target.value)}>{state.members.filter(m=>m.active&&['admin','responder'].includes(m.role)).map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
 </div>
 {draft.stale&&<p role="alert">A newer rule is published. Your draft is still here. <button onClick={draft.useMine}>Use mine</button></p>}
 {(id==='new'||draft.changed)&&<button disabled={busy||draft.stale} onClick={()=>setConfirm(true)}>Publish version {next}</button>}
 {confirm&&<InlineConfirm action={'Publish version '+next} reasonRequired busy={busy} onCancel={()=>setConfirm(false)} onConfirm={async reason=>{
  if(await run('/api/command',{type:'policy',...value,baseVersion:current?.version??0,reason},'Coordination rule published')){draft.accepted(next,value);onPublished();}
 }}>Use this rule for new events? Retained events keep their original decisions.</InlineConfirm>}
 </div>;
}
