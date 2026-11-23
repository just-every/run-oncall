import { fail, type State } from '../family/response-operations/domain';
import type { Bindings } from '../auth.server';
import { changeHmac, equalSignature, openCredential } from '../changes/credentials';
import { runtimeBindings } from '../auth.server';
import { auditIdentity, auditKind, auditOutcome } from '../audit-store';
import { endpointUrl, type Outbox, type OutboxState } from './model';
import { endpointCustody } from './api';
import { dispatchAuthority, dispatchWork, persistDispatch, type DispatchGuard } from './dispatch-store';
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
/** A bounded dispatch step. Only queued or explicitly retryable work runs; uncertainty never retries itself. */
export async function dispatchOutbox(env:Bindings,guard:DispatchGuard={sql:'1',values:[]},admission:{id?:string;agent?:{id:string;label:string}}={}) {
 const work=await dispatchWork(env.DB,now(),admission.id);
 const {revision,expired}=work;
 const persist=(item?:Outbox)=>persistDispatch(env.DB,revision,item?[...expired,item]:expired,guard);
 auditKind(env.DB,'automation.dispatch');
 for(const item of expired)updateOutcome(item,'uncertain','lease-expired');
 const held=work.item&&await dispatchAuthority(env.DB,work.item.id);
 if(work.item&&(!held||held.revision!==revision))fail('Outbox state or authority changed; retry',409);
 let item=work.item;
 const access=held?.access;
 if(item&&held?.principal){
  const who=JSON.parse(held.principal);
  // Agent work can leave only through typed invocation with its retained actor.
  if(!admission.agent){
    const live=access?await env.DB.prepare('SELECT COUNT(*) AS n FROM oc_api_credentials WHERE client IN (?,?)').bind(access.origin.id,access.receiver.id).first<{n:number}>():null
    // Revocation cleanup is the current person's/system's restrictive action;
    // it never executes the former agent or sends anything on its behalf.
    if(!access||!held.sponsorActive||live?.n!==(access.origin.id===access.receiver.id?1:2)){
      auditKind(env.DB,'automation.cancel-revoked');auditIdentity(env.DB,{subject:{kind:'outbox',id:item.id}})
      updateOutcome(item,'terminal','authority-revoked');await persist(item)
      return {processed:1,id:item.id,status:item.status}
    }
    const result=await (await import('../agent-door/index.server')).oncallAgentDoor(runtimeBindings(env)).invoke('oncall.automation.dispatch',{id:item.id,revision:item.revision,idempotency_key:`outbox-${item.id}-${item.revision}`},who)
    if(['execution_failed','output_invalid','policy_unavailable','storage_unavailable'].includes(result.code??''))fail('Agent dispatch failed; no send confirmed',503)
    const operation=(result.result as {operation?:{status:string}}|undefined)?.operation
    return {processed:operation?1:0,id:item.id,...(operation?{status:operation.status}:{held:result.code??result.outcome,approval:result.approval})}
  }
  if(who.agent.id!==admission.agent.id)item=undefined;
 }
 if(!item){if(expired.length){auditOutcome(env.DB,'uncertain');await persist();}return {processed:0,expired:expired.length>0};}
 auditIdentity(env.DB,{subject:{kind:'outbox',id:item.id},source:{kind:'endpoint',id:item.endpoint}});
 const credential=await env.DB.prepare('SELECT custody FROM oc_endpoint_credentials WHERE endpoint=?').bind(item.endpoint).first<{custody:string}>();
 const live=access?await env.DB.prepare('SELECT COUNT(*) AS n FROM oc_api_credentials WHERE client IN (?,?)').bind(access.origin.id,access.receiver.id).first<{n:number}>():null;
 if(!access||!credential||live?.n!==(access.origin.id===access.receiver.id?1:2)) {updateOutcome(item,'terminal','authority-revoked');await persist(item);return {processed:1,id:item.id,status:item.status};}
 if(item.attempts>=5){updateOutcome(item,'terminal','budget-exhausted');await persist(item);return {processed:1,id:item.id,status:item.status};}
 const url=endpointUrl(access.endpoint.url);let key:string;
 try {key=await openCredential(credential.custody,runtimeBindings(env).SESSION_SECRET,endpointCustody);}catch {
  updateOutcome(item,'terminal','credential-unavailable');auditOutcome(env.DB,'failed');await persist(item);return {processed:1,id:item.id,status:item.status};
 }
 const lease=crypto.randomUUID();item.lease=lease;item.leaseUntil=new Date(Date.now()+30000).toISOString();item.attempts++;updateOutcome(item,'sending','dispatch');
 await persist(item);
 // No network effect precedes the durable lease/audit commit. Re-read all authority after custody work.
 const beforeSend=await dispatchAuthority(env.DB,item.id);
 const sending=beforeSend?.item.lease===lease&&beforeSend.item.status==='sending'?beforeSend.item:null,current=beforeSend?.access;
 const keys=await env.DB.prepare('SELECT custody FROM oc_endpoint_credentials WHERE endpoint=? AND custody=? AND EXISTS(SELECT 1 FROM oc_api_credentials WHERE client=?) AND EXISTS(SELECT 1 FROM oc_api_credentials WHERE client=?)').bind(item.endpoint,credential.custody,access.origin.id,access.receiver.id).first();
 const finalAuthority=await env.DB.prepare(`SELECT 1 WHERE ${guard.sql}`).bind(...guard.values).first();
 if(!sending||!current||!finalAuthority||current.endpoint.revision!==access.endpoint.revision||current.origin.revision!==access.origin.revision||current.receiver.revision!==access.receiver.revision||!keys) {
  if(sending&&beforeSend){updateOutcome(sending,'terminal','authority-revoked');await persistDispatch(env.DB,beforeSend.revision,[sending],guard);}
  return {processed:1,id:item.id,status:'terminal'};
 }
 const body=JSON.stringify(sending.payload),timestamp=String(Math.floor(Date.now()/1000)),signature=await changeHmac(key,timestamp+'.'+body);
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
 const after=await dispatchAuthority(env.DB,item.id),pending=after?.item;
 if(!after||pending?.lease!==lease||pending.status!=='sending')return {processed:1,id:item.id,status:'uncertain'};
 // A revocation during flight cannot retract bytes. Keep the ambiguous boundary visible.
 if(!after.access){status='uncertain';reason='network-ambiguous';}
 if(status==='failed')pending.due=new Date(Date.now()+Math.min(3600000,30000*2**pending.attempts)).toISOString();
 updateOutcome(pending,status,reason);if(status==='uncertain')auditOutcome(env.DB,'uncertain');
 await persistDispatch(env.DB,after.revision,[pending],{sql:'1',values:[]});
 return {processed:1,id:item.id,status};
}
