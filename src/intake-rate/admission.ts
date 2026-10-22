import {BatchAllowanceFault} from './fault';
import {fail,type State} from '../family/response-operations/domain';
import {workspaceWrite} from '../workspace-store';
import {defaultAllowance,type KeyAllowance} from './model';
import type {IntakeDependencies} from '../monitoring/credentials';

type Guard={sql:string;values:(string|number|null)[]};
export type RateKey={id:string;name:string;owner:string};
type Sample={at:number;requests:number;events:number};
export type RateAdmission={key:RateKey;at:number;policy:Omit<KeyAllowance,'id'>;guard:Guard};
const windowMs=60000;
async function samples(db:D1Database,rate:RateAdmission) {
 return (await db.prepare('SELECT at,requests,events FROM oc_key_rate_usage WHERE key_id=? AND at>? ORDER BY at').bind(rate.key.id,rate.at-windowMs).all<Sample>()).results;
}
function retryAfter(rows:Sample[],field:'requests'|'events',required:number,limit:number,at:number) {
 let excess=rows.reduce((n,r)=>n+r[field],0)+required-limit;
 for(const row of rows){excess-=row[field];if(excess<=0)return Math.max(1,Math.ceil((row.at+windowMs-at)/1000));}
 // An atomic batch larger than the configured allowance cannot fit in any window.
 // The response explains that the sender must split it or the owner raise the allowance.
 return undefined;
}
async function throttle(c:any,deps:IntakeDependencies,rate:RateAdmission,rows:Sample[],field:'requests'|'events',required:number):Promise<never> {
 const retry=retryAfter(rows,field,required,rate.policy[field],rate.at);
 if(retry!==undefined)c.header('Retry-After',String(retry));
 const current=await deps.load(c.env.DB),last=await c.env.DB.prepare('SELECT at FROM oc_key_rate_notified WHERE key_id=?').bind(rate.key.id).first() as {at:number}|null;
 if(!last||last.at<=rate.at-windowMs){
  const count=rows.reduce((n,r)=>n+r[field],0);
  current.audit.push({id:crypto.randomUUID(),at:new Date(rate.at).toISOString(),actor:'source:'+rate.key.id,kind:'intake-throttled',text:`Integration owner ${rate.key.owner}: key ${rate.key.name} throttled at ${count} ${field} in the rolling minute; ${required} requested; coordination notice recorded; paging remains OFF`});
  const token=crypto.randomUUID(),guard={sql:`(${rate.guard.sql}) AND NOT EXISTS(SELECT 1 FROM oc_key_rate_notified WHERE key_id=? AND at>?)`,values:[...rate.guard.values,rate.key.id,rate.at-windowMs]};
  await c.env.DB.batch([...workspaceWrite(c.env.DB,current,current.revision,guard,token),c.env.DB.prepare('INSERT INTO oc_key_rate_notified(key_id,at) SELECT ?,? WHERE EXISTS(SELECT 1 FROM workspace_control WHERE write_token=?) ON CONFLICT(key_id) DO UPDATE SET at=excluded.at').bind(rate.key.id,rate.at,token)]);
 }
 if(retry===undefined)throw new BatchAllowanceFault(required,rate.policy.events);
 fail(`Key ${field} allowance exceeded; retry after ${retry} seconds`,429);
}
/** Called only after authentication; rejected payloads and duplicates count too. */
export async function beginRate(c:any,deps:IntakeDependencies,state:State,key:RateKey,guard:Guard):Promise<RateAdmission> {
 const at=Date.now(),policy=state.keyAllowances?.find(v=>v.id===key.id)??defaultAllowance,rate={key,at,policy,guard};
 const result=await c.env.DB.batch([
  c.env.DB.prepare('DELETE FROM oc_key_rate_usage WHERE key_id=? AND at<=?').bind(key.id,at-windowMs),
  c.env.DB.prepare(`INSERT INTO oc_key_rate_usage(key_id,at,requests,events) SELECT ?,?,1,0 WHERE ${guard.sql} ON CONFLICT(key_id,at) DO UPDATE SET requests=requests+1`).bind(key.id,at,...guard.values),
 ]);
 if(result[1].meta.changes!==1)fail('Credential changed; retry with a current key',401);
 const rows=await samples(c.env.DB,rate);
 if(rows.reduce((n,r)=>n+r.requests,0)>policy.requests)await throttle(c,deps,rate,rows,'requests',1);
 return rate;
}
/** The event debit, coordination records and permanent audit commit together. */
export async function saveRate(c:any,deps:IntakeDependencies,state:State,revision:number,rate:RateAdmission,newEvents:number) {
 const rows=await samples(c.env.DB,rate);
 if(rows.reduce((n,r)=>n+r.events,0)+newEvents>rate.policy.events)await throttle(c,deps,rate,rows,'events',newEvents);
 const token=crypto.randomUUID(),guard={sql:`(${rate.guard.sql}) AND COALESCE((SELECT SUM(events) FROM oc_key_rate_usage WHERE key_id=? AND at>?),0)+?<=?`,values:[...rate.guard.values,rate.key.id,rate.at-windowMs,newEvents,rate.policy.events]};
 const result=await c.env.DB.batch([...workspaceWrite(c.env.DB,state,revision,guard,token),c.env.DB.prepare('INSERT INTO oc_key_rate_usage(key_id,at,requests,events) SELECT ?,?,0,? WHERE EXISTS(SELECT 1 FROM workspace_control WHERE write_token=?) ON CONFLICT(key_id,at) DO UPDATE SET events=events+excluded.events').bind(rate.key.id,rate.at,newEvents,token)]);
 if(result[0].meta.changes!==1)fail('Admission changed; retry the request',409);
}
/** Further observations grouped into an existing generation consume no new-event slot. */
export function admittedCount(before:State,after:State) {
 const oldReceipts=new Set((before.intakeReceipts??[]).map(r=>r.id)),oldEvents=new Set(before.events.map(e=>e.id)),oldAlerts=new Set(before.alerts.map(a=>a.id));
 const receipts=(after.intakeReceipts??[]).filter(r=>!oldReceipts.has(r.id));
 const eventsInReceipts=new Set(receipts.map(r=>r.event));
 return receipts.filter(r=>r.action!=='trigger'||r.alert===null||!oldAlerts.has(r.alert)).length+after.events.filter(e=>!oldEvents.has(e.id)&&!eventsInReceipts.has(e.id)&&(e.intent!=='trigger'||!before.alerts.some(a=>a.source===e.source&&a.service===e.service&&a.key===e.key&&a.generation===e.generation))).length;
}
