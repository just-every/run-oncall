import { fail, type State, type Incident, type Member } from '../family/response-operations/domain';
export const permissions = ['services:read','services:write','schedules:read','schedules:write','incidents:read','incidents:write','actions:read','actions:write','analytics:read','integrations:read'] as const;
export const eventTypes = ['trigger','acknowledgment','reassignment','resolution','role','follow-up'] as const;
export type EventType = typeof eventTypes[number];
export type Client = {id:string;name:string;owner:string;services:string[];permissions:string[];active:boolean;revision:number;createdAt:string;lastUsed:string|null};
export type Endpoint = {id:string;name:string;owner:string;client:string;services:string[];url:string;active:boolean;revision:number;createdAt:string};
export type Operation = {id:string;client:string;key:string;request:string;service:string;resource:string;entity:string;revision:number;at:string};
export type OutboxState = 'queued'|'sending'|'sent'|'failed'|'interrupted'|'uncertain'|'terminal';
export type Outbox = {clientRevision:number;receiverRevision:number;endpointRevision:number;id:string;endpoint:string;client:string;owner:string;service:string;incident:string;event:EventType;entry:string;revision:number;at:string;due:string;attempts:number;status:OutboxState;lease:string|null;leaseUntil:string|null;authorized:boolean;history:{at:string;status:OutboxState;reason:string}[];payload:{operationId:string;type:EventType;service:string;incident:string;revision:number;state:Incident['state'];at:string}};
export const activeOwner = (state:State,id:string) => state.members.some(m=>m.id===id&&m.active&&m.role==='admin');
export function machineAuthority(state:State,actor:Member) {
 const client=state.apiClients?.find(c=>c.id===actor.id&&c.active);
 if(!client||!activeOwner(state,client.owner))fail('Client authority revoked',401);
 return client;
}
// No DNS lookup, userinfo, query capabilities, redirects or private-network targets.
// Public IPv4 literals are deliberately the only supported delivery destinations.
export function endpointUrl(value:unknown) {
 if(typeof value!=='string'||value.length>1000)fail('A public HTTPS IPv4 endpoint is required');
 let u:URL;try{u=new URL(value);}catch{return fail('Invalid endpoint URL');}
 const parts=u.hostname.split('.').map(Number),[a,b,c]=parts;
 if(!/^\/[A-Za-z0-9/_-]{0,256}$/.test(u.pathname)||u.protocol!=='https:'||u.username||u.password||u.search||u.hash||u.port&&u.port!=='443'||parts.length!==4||parts.some(n=>!Number.isInteger(n)||n<0||n>255)||u.hostname!==parts.join('.')||a===0||a===10||a===127||a>=224||a===169&&b===254||a===172&&b>=16&&b<=31||a===192&&(b===168||b===0||b===2||b===88&&c===99)||a===100&&b>=64&&b<=127||a===198&&(b===18||b===19||b===51&&c===100)||a===203&&b===0&&c===113)fail('Endpoint must use a globally routable HTTPS IPv4 address, port 443, without credentials, query or fragment');
 return u.href;
}
export function enqueueEvents(state:State,incident:Incident,input:any,actor:Member) {
 const event:EventType|undefined=input.type==='declare'?'trigger':input.type==='reassign'?'reassignment':input.type==='assign-role'?'role':['action','complete','accept-action'].includes(input.type)?'follow-up':input.type==='bulk-acknowledge'||input.type==='transition'&&input.state==='acknowledged'?'acknowledgment':input.type==='bulk-resolve'||input.type==='transition'&&input.state==='resolved'?'resolution':undefined;
 if(!event)return;
 const entry=incident.timeline.at(-1)!;
 for(const endpoint of state.apiEndpoints??[]) {
  const client=state.apiClients?.find(c=>c.id===endpoint.client&&c.active);
  if(!endpoint.active||!client||!client.permissions.includes('incidents:read')||!activeOwner(state,client.owner)||!activeOwner(state,endpoint.owner)||!endpoint.services.includes(incident.service)||!client.services.includes(incident.service))continue;
  // Machine-originated work is also fenced by its own originating client at dispatch.
  const origin=actor.machine?actor.id:client.id;
  const id=crypto.randomUUID(),at=entry.at;
  (state.apiOutbox??=[]).push({clientRevision:state.apiClients!.find(c=>c.id===origin)!.revision,receiverRevision:client.revision,endpointRevision:endpoint.revision,id,endpoint:endpoint.id,client:origin,owner:endpoint.owner,service:incident.service,incident:incident.id,event,entry:entry.id,revision:1,at,due:at,attempts:0,status:'queued',lease:null,leaseUntil:null,authorized:true,history:[{at,status:'queued',reason:'domain-commit'}],payload:{operationId:id,type:event,service:incident.service,incident:incident.id,revision:incident.revision,state:incident.state,at}});
 }
 if((state.apiOutbox?.length??0)>1000)fail('Outbox capacity reached; no incident change accepted',429);
}
export function holdAutomation(state:State) {
 for(const client of state.apiClients??[])client.active=false;
 for(const endpoint of state.apiEndpoints??[])endpoint.active=false;
 for(const item of state.apiOutbox??[]) {
  item.authorized=false;
  if(['queued','sending','failed'].includes(item.status)) {
   item.status=item.status==='sending'?'uncertain':'interrupted';item.revision++;
   item.history.push({at:new Date().toISOString(),status:item.status,reason:'restore-requires-authorization'});
   item.lease=null;item.leaseUntil=null;
  }
 }
}
const exact=(v:any,keys:string[])=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
const stamp=(v:any)=>typeof v==='string'&&Number.isFinite(Date.parse(v));
const id=(v:any)=>typeof v==='string'&&v.length>0&&v.length<=100;
const revision=(v:any)=>Number.isSafeInteger(v)&&v>=1;
export function validateAutomation(state:State) {
 for(const key of ['apiClients','apiEndpoints','apiOperations','apiOutbox'] as const){const rows=state[key];if(rows!==undefined&&(!Array.isArray(rows)||rows.length>1000||rows.some(r=>!r||!id(r.id))||new Set(rows.map(r=>r.id)).size!==rows.length))fail('Invalid automation archive identities');}
 const services=(v:any)=>Array.isArray(v)&&v.length>0&&v.length<=64&&new Set(v).size===v.length&&v.every(s=>state.services.some(x=>x.id===s));
 const owner=(v:any)=>state.members.some(m=>m.id===v);
 for(const c of state.apiClients??[])if(!exact(c,['id','name','owner','services','permissions','active','revision','createdAt','lastUsed'])||!c.id.startsWith('api-')||!id(c.name)||!owner(c.owner)||!services(c.services)||!Array.isArray(c.permissions)||!c.permissions.length||new Set(c.permissions).size!==c.permissions.length||c.permissions.some(p=>!permissions.includes(p as any))||typeof c.active!=='boolean'||!revision(c.revision)||!stamp(c.createdAt)||c.lastUsed!==null&&!stamp(c.lastUsed))fail('Invalid API client archive');
 for(const e of state.apiEndpoints??[]){if(!exact(e,['id','name','owner','client','services','url','active','revision','createdAt'])||!id(e.name)||!owner(e.owner)||!services(e.services)||!state.apiClients?.some(c=>c.id===e.client&&e.services.every(s=>c.services.includes(s)))||typeof e.active!=='boolean'||!revision(e.revision)||!stamp(e.createdAt))fail('Invalid endpoint archive');endpointUrl(e.url);}
 if(new Set((state.apiOperations??[]).map(o=>JSON.stringify([o.client,o.key]))).size!==(state.apiOperations?.length??0))fail('Duplicate API operation key');
 for(const o of state.apiOperations??[])if(!exact(o,['id','client','key','request','service','resource','entity','revision','at'])||!state.apiClients?.some(c=>c.id===o.client)||!state.services.some(s=>s.id===o.service)||!['services','schedules','incidents','actions'].includes(o.resource)||!id(o.entity)||!revision(o.revision)||!stamp(o.at)||![/^[a-f0-9]{64}$/.test(o.key),/^[a-f0-9]{64}$/.test(o.request)].every(Boolean))fail('Invalid API operation history');
 for(const o of state.apiOutbox??[]) {
  const incident=state.incidents.find(i=>i.id===o.incident&&i.service===o.service);
  if(!exact(o,['clientRevision','receiverRevision','endpointRevision','id','endpoint','client','owner','service','incident','event','entry','revision','at','due','attempts','status','lease','leaseUntil','authorized','history','payload'])||!revision(o.clientRevision)||!revision(o.receiverRevision)||!revision(o.endpointRevision)||!state.apiEndpoints?.some(e=>e.id===o.endpoint)||!state.apiClients?.some(c=>c.id===o.client)||!owner(o.owner)||!incident?.timeline.some(e=>e.id===o.entry)||!eventTypes.includes(o.event)||!revision(o.revision)||!stamp(o.at)||!stamp(o.due)||!Number.isSafeInteger(o.attempts)||o.attempts<0||o.attempts>5||!['queued','sending','sent','failed','interrupted','uncertain','terminal'].includes(o.status)||typeof o.authorized!=='boolean'||(o.status==='sending'?(o.lease===null||o.leaseUntil===null):(o.lease!==null||o.leaseUntil!==null))||o.lease!==null&&!id(o.lease)||o.leaseUntil!==null&&!stamp(o.leaseUntil)||!Array.isArray(o.history)||!o.history.length||o.history.length>100||o.history.some(h=>!exact(h,['at','status','reason'])||!stamp(h.at)||!['queued','sending','sent','failed','interrupted','uncertain','terminal'].includes(h.status)||!['domain-commit','restore-requires-authorization','dispatch','accepted','receiver-refused','receiver-failed','network-ambiguous','lease-expired','authority-revoked','protected-replay','budget-exhausted','credential-unavailable'].includes(h.reason))||o.history.at(-1)?.status!==o.status)fail('Invalid outbox history');
  const p=o.payload;if(!exact(p,['operationId','type','service','incident','revision','state','at'])||p.operationId!==o.id||p.type!==o.event||p.service!==o.service||p.incident!==o.incident||p.at!==o.at||!revision(p.revision)||p.revision>incident.revision||!['declared','acknowledged','mitigating','recovered','resolved'].includes(p.state))fail('Invalid frozen outbound payload');
 }
}
