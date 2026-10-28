import { fail, type State } from '../family/response-operations/domain';
import { loadWorkspace, workspaceWrite } from '../workspace-store';
import { changeHmac, equalSignature, openCredential } from '../changes/credentials';
import { runtimeBindings } from '../auth.server';
import { auditIdentity, auditKind, auditOutcome } from '../audit-store';
import { activeOwner, endpointUrl, type Outbox, type OutboxState } from './model';
import { endpointCustody } from './api';
type Guard={sql:string;values:(string|number|null)[]};
const now=()=>new Date().toISOString();
export function updateOutcome(item:Outbox,status:OutboxState,reason:string) {
 item.status=status;item.revision++;item.history.push({at:now(),status,reason});
 if(status!=='sending'){item.lease=null;item.leaseUntil=null;}
 if(item.history.length>100)fail('Operation history capacity reached',429);
}
export function expireLeases(state:State) {
 let changed=false;
 for(const item of state.apiOutbox??[])if(item.status==='sending'&&Date.parse(item.leaseUntil!)<=Date.now()){updateOutcome(item,'uncertain','lease-expired');changed=true;}
 return changed;
}
function authorized(state:State,item:Outbox) {
 const endpoint=state.apiEndpoints?.find(e=>e.id===item.endpoint&&e.active),origin=state.apiClients?.find(c=>c.id===item.client&&c.active),receiver=state.apiClients?.find(c=>c.id===endpoint?.client&&c.active);
 return item.authorized&&endpoint&&origin&&receiver&&endpoint.revision===item.endpointRevision&&origin.revision===item.clientRevision&&receiver.revision===item.receiverRevision&&activeOwner(state,item.owner)&&activeOwner(state,endpoint.owner)&&activeOwner(state,origin.owner)&&activeOwner(state,receiver.owner)&&origin.services.includes(item.service)&&receiver.services.includes(item.service)&&receiver.permissions.includes('incidents:read')&&endpoint.services.includes(item.service)&&state.incidents.some(i=>i.id===item.incident&&i.service===item.service)?{endpoint,origin,receiver}:null;
}
async function persist(env:any,state:State,guard:Guard) {
 const result=await env.DB.batch(workspaceWrite(env.DB,state,state.revision,guard));
 if(result[0].meta.changes!==1)fail('Outbox state or authority changed; retry',409);
}
/** A bounded dispatch step. Only queued or explicitly retryable work runs; uncertainty never retries itself. */
export async function dispatchOutbox(env:any,guard:Guard={sql:'1',values:[]},admission:{id?:string;agent?:{id:string;label:string}}={}) {
 const state=await loadWorkspace(env.DB);
 auditKind(env.DB,'automation.dispatch');
 const expired=expireLeases(state);
 const candidates=(state.apiOutbox??[]).filter(o=>(!admission.id||o.id===admission.id)&&['queued','failed'].includes(o.status)&&o.authorized&&Date.parse(o.due)<=Date.now());
 let item:typeof candidates[number]|undefined;
 for(const candidate of candidates){
  const custody=await env.DB.prepare('SELECT principal FROM oc_agent_outbox WHERE outbox=?').bind(candidate.id).first();
  // Agent work can leave only through typed invocation with its retained actor.
  if(custody&&!admission.agent){
    const who=JSON.parse(custody.principal)
    const result=await (await import('../agent-door/index.server')).oncallAgentDoor(runtimeBindings(env)).invoke('oncall.automation.dispatch',{id:candidate.id,revision:candidate.revision,idempotency_key:`outbox-${candidate.id}-${candidate.revision}`},who)
    const operation=(result.result as {operation?:{status:string}}|undefined)?.operation
    return {processed:operation?1:0,id:candidate.id,...(operation?{status:operation.status}:{held:result.code??result.outcome,approval:result.approval})}
  }
  if(custody&&JSON.parse(custody.principal).agent.id!==admission.agent?.id)continue;
  item=candidate;break;
 }
 if(!item){if(expired){auditOutcome(env.DB,'uncertain');await persist(env,state,guard);}return {processed:0,expired};}
 auditIdentity(env.DB,{subject:{kind:'outbox',id:item.id},source:{kind:'endpoint',id:item.endpoint}});
 const access=authorized(state,item),credential=await env.DB.prepare('SELECT custody FROM oc_endpoint_credentials WHERE endpoint=?').bind(item.endpoint).first();
 const live=access?await env.DB.prepare('SELECT COUNT(*) AS n FROM oc_api_credentials WHERE client IN (?,?)').bind(access.origin.id,access.receiver.id).first():null;
 if(!access||!credential||live?.n!==(access.origin.id===access.receiver.id?1:2)) {updateOutcome(item,'terminal','authority-revoked');await persist(env,state,guard);return {processed:1,id:item.id,status:item.status};}
 if(item.attempts>=5){updateOutcome(item,'terminal','budget-exhausted');await persist(env,state,guard);return {processed:1,id:item.id,status:item.status};}
 const url=endpointUrl(access.endpoint.url);let key:string;
 try {key=await openCredential(credential.custody,runtimeBindings(env).SESSION_SECRET,endpointCustody);}catch {
  updateOutcome(item,'terminal','credential-unavailable');auditOutcome(env.DB,'failed');await persist(env,state,guard);return {processed:1,id:item.id,status:item.status};
 }
 const lease=crypto.randomUUID();item.lease=lease;item.leaseUntil=new Date(Date.now()+30000).toISOString();item.attempts++;updateOutcome(item,'sending','dispatch');
 await persist(env,state,guard);
 // No network effect precedes the durable lease/audit commit. Re-read all authority after custody work.
 const beforeSend=await loadWorkspace(env.DB),held=beforeSend.apiOutbox?.find(o=>o.id===item.id&&o.lease===lease&&o.status==='sending'),current=held&&authorized(beforeSend,held);
 const keys=await env.DB.prepare('SELECT custody FROM oc_endpoint_credentials WHERE endpoint=? AND custody=? AND EXISTS(SELECT 1 FROM oc_api_credentials WHERE client=?) AND EXISTS(SELECT 1 FROM oc_api_credentials WHERE client=?)').bind(item.endpoint,credential.custody,access.origin.id,access.receiver.id).first();
 const finalAuthority=await env.DB.prepare(`SELECT 1 WHERE ${guard.sql}`).bind(...guard.values).first();
 if(!held||!current||!finalAuthority||current.endpoint.revision!==access.endpoint.revision||current.origin.revision!==access.origin.revision||current.receiver.revision!==access.receiver.revision||!keys) {
  if(held){updateOutcome(held,'terminal','authority-revoked');await persist(env,beforeSend,guard);}
  return {processed:1,id:item.id,status:'terminal'};
 }
 const body=JSON.stringify(held.payload),timestamp=String(Math.floor(Date.now()/1000)),signature=await changeHmac(key,timestamp+'.'+body);
 let status:OutboxState='uncertain',reason='network-ambiguous';
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
 try {
  const actor=admission.agent?.label;
  const response=await fetch(url,{method:'POST',redirect:'manual',signal:controller.signal,headers:{'content-type':'application/json','x-oncall-operation':item.id,'x-oncall-timestamp':timestamp,'x-oncall-signature':signature,...(actor?{'x-oncall-prepared-by':encodeURIComponent(actor),'x-oncall-actor-signature':await changeHmac(key,timestamp+'.'+body+'.'+actor)}:{})},body});
  const disposition=response.headers.get('x-oncall-result')??'',receipt=response.headers.get('x-oncall-receipt')??'';
  const verified=equalSignature(receipt,await changeHmac(key,item.id+'.'+timestamp+'.'+disposition));
  if(verified&&disposition==='accepted'&&response.status>=200&&response.status<300){status='sent';reason='accepted';}
  else if(verified&&disposition==='retry'&&[429,503].includes(response.status)){status=item.attempts>=5?'terminal':'failed';reason=item.attempts>=5?'budget-exhausted':'receiver-failed';}
  else if(response.status>=300&&response.status<400||[401,403,404,410].includes(response.status)){status='terminal';reason='receiver-refused';}
  await response.body?.cancel();
 } catch { /* A timeout, lost acknowledgment or disconnect may follow a receiver commit. */ }
 finally {clearTimeout(timer);}
 const after=await loadWorkspace(env.DB),pending=after.apiOutbox?.find(o=>o.id===item.id&&o.lease===lease&&o.status==='sending');
 if(!pending)return {processed:1,id:item.id,status:'uncertain'};
 // A revocation during flight cannot retract bytes. Keep the ambiguous boundary visible.
 if(!authorized(after,pending)){status='uncertain';reason='network-ambiguous';}
 if(status==='failed')pending.due=new Date(Date.now()+Math.min(3600000,30000*2**pending.attempts)).toISOString();
 updateOutcome(pending,status,reason);if(status==='uncertain')auditOutcome(env.DB,'uncertain');
 await persist(env,after,{sql:'1',values:[]});
 return {processed:1,id:item.id,status};
}
