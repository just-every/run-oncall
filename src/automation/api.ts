import {scheduleChanges} from '../schedule-coordination/model';
import { resolveIncidentAlias } from '../incident-workflows/relations.ts';
import { incidentWithinServices } from '../incident-workflows/scope.ts';
import {responseContext} from '../manual-pages/context';
import { command, fail, Fault, text, type State, type Member } from '../family/response-operations/domain';
import { loadWorkspace, workspaceWrite } from '../workspace-store';
import { auditIdentity, auditKind, auditOutcome, setAuditSubject } from '../audit-store';
import { changeHash, changeHmac, sealCredential, openCredential, type Custody } from '../changes/credentials';
import { refuseKeyEcho } from '../native-sources';
import { runtimeBindings } from '../auth.server';
import { pagingSnapshot, putSchedule, bound } from '../paging-store';
import { validateSchedule } from '../family/response-operations/schedules';
import { activeOwner, endpointUrl, permissions, deliveryCapacity, unfinishedDeliveries, type Client, type Operation } from './model';
import { dispatchOutbox, expireLeases, updateOutcome } from './dispatch';
export const endpointCustody:Custody={label:'oncall-outbound-events-v1',unavailable:'Installation key unavailable',unreadable:'Endpoint key unavailable; configure it again'};
type Guard={sql:string;values:(string|number|null)[]};
type Deps={body:(c:any,max?:number)=>Promise<any>;state:(c:any,admin?:boolean)=>Promise<State>;guard:(c:any)=>Guard};
const gate='EXISTS(SELECT 1 FROM workspace_control WHERE write_token=?)';
export async function commitAutomation(c:any,state:State,guard:Guard,extra:(token:string)=>D1PreparedStatement[]=()=>[]) {
 const token=crypto.randomUUID(),result=await c.env.DB.batch([...workspaceWrite(c.env.DB,state,state.revision,guard,token),...extra(token)]);
 if(result[0].meta.changes!==1)fail('State or authority changed; retry the same operation',409);
}
const requireRevision=(actual:number,expected:any)=>{if(actual!==expected)fail('Revision conflict; reload before changing this record',409);};
const secret=(value:any)=>{const key=text(value,'Private key',200);if(key.length<32)fail('Use at least 32 random key characters');return key;};
function scopes(state:State,input:any) {
 if(!Array.isArray(input)||!input.length||input.length>64||new Set(input).size!==input.length||input.some(id=>!state.services.some(s=>s.id===id)))fail('Select 1–64 existing services');
 return input as string[];
}
export function installAutomationManagement(api:any,deps:Deps) {
 const owner=async(c:any)=>{const state=await deps.state(c,true);if(!activeOwner(state,c.get('actor').id))fail('Current administrator required',403);return state;};
 api.get('/api/automation',async(c:any)=>{const state=await owner(c);return c.json({clients:state.apiClients??[],endpoints:state.apiEndpoints??[],outbox:state.apiOutbox??[],paging:'OFF'});});
 api.post('/api/automation/clients',async(c:any)=>{
  const state=await owner(c),input=await deps.body(c),key=secret(input.key),allowed=scopes(state,input.services);
  if(!Array.isArray(input.permissions)||!input.permissions.length||new Set(input.permissions).size!==input.permissions.length||input.permissions.some((p:any)=>!permissions.includes(p)))fail('Choose documented API permissions');
  const client:Client={id:'api-'+crypto.randomUUID(),name:text(input.name,'Client name',100),owner:c.get('actor').id,services:allowed,permissions:input.permissions,active:true,revision:1,createdAt:new Date().toISOString(),lastUsed:null};
  refuseKeyEcho([JSON.stringify(client)],key);(state.apiClients??=[]).push(client);if(state.apiClients.length>100)fail('Client capacity reached',429);
  auditKind(c.env.DB,'automation.client-create');setAuditSubject(c.env.DB,'api-client',client.id);
  const digest=await changeHash(key);
  await commitAutomation(c,state,deps.guard(c),token=>[c.env.DB.prepare(`INSERT INTO oc_api_credentials(client,digest) SELECT ?,? WHERE ${gate}`).bind(client.id,digest,token)]);
  return c.json(client,201);
 });
 api.post('/api/automation/clients/:id/:action',async(c:any)=>{
  const state=await owner(c),input=await deps.body(c),client=state.apiClients?.find(v=>v.id===c.req.param('id')),action=c.req.param('action');
  if(!client)fail('Unknown client',404);requireRevision(client.revision,input.revision);
  if(!['rotate','revoke'].includes(action))fail('Unknown client action',404);
  const key=action==='rotate'?secret(input.key):null;if(key)refuseKeyEcho([JSON.stringify(state)],key);
  const digest=key?await changeHash(key):null;
  if(digest&&(await c.env.DB.prepare('SELECT digest FROM oc_api_credentials WHERE client=?').bind(client.id).first())?.digest===digest)fail('Rotation requires a different private key',409);
  client.active=!!digest;client.revision++;
  auditKind(c.env.DB,'automation.client-'+action);setAuditSubject(c.env.DB,'api-client',client.id);
  await commitAutomation(c,state,deps.guard(c),token=>[c.env.DB.prepare(`DELETE FROM oc_api_credentials WHERE client=? AND ${gate}`).bind(client.id,token),...(digest?[c.env.DB.prepare(`INSERT INTO oc_api_credentials(client,digest) SELECT ?,? WHERE ${gate}`).bind(client.id,digest,token)]:[])]);
  return c.json(client);
 });
 api.post('/api/automation/endpoints',async(c:any)=>{
  const state=await owner(c),input=await deps.body(c),key=secret(input.key),client=state.apiClients?.find(v=>v.id===input.client&&v.active);
  if(!client||!client.permissions.includes('incidents:read'))fail('An active incident-read client is required');
  const services=scopes(state,input.services);if(services.some(s=>!client.services.includes(s)))fail('Endpoint exceeds its receiving client scope',403);
  if(input.approve!==true)fail('Approve the exact recipient and minimal incident event categories');
  const endpoint={id:crypto.randomUUID(),name:text(input.name,'Endpoint name',100),owner:c.get('actor').id,client:client.id,services,url:endpointUrl(input.url),active:true,revision:1,createdAt:new Date().toISOString()};
  refuseKeyEcho([JSON.stringify(endpoint)],key);(state.apiEndpoints??=[]).push(endpoint);if(state.apiEndpoints.length>50)fail('Endpoint capacity reached',429);
  const custody=await sealCredential(key,runtimeBindings(c.env).SESSION_SECRET,endpointCustody);
  auditKind(c.env.DB,'automation.endpoint-create');setAuditSubject(c.env.DB,'endpoint',endpoint.id);
  await commitAutomation(c,state,deps.guard(c),token=>[c.env.DB.prepare(`INSERT INTO oc_endpoint_credentials(endpoint,custody) SELECT ?,? WHERE ${gate}`).bind(endpoint.id,custody,token)]);
  return c.json(endpoint,201);
 });
 api.post('/api/automation/endpoints/:id/:action',async(c:any)=>{
  const state=await owner(c),input=await deps.body(c),endpoint=state.apiEndpoints?.find(v=>v.id===c.req.param('id')),action=c.req.param('action');
  if(!endpoint)fail('Unknown endpoint',404);requireRevision(endpoint.revision,input.revision);
  if(!['rotate','revoke'].includes(action))fail('Unknown endpoint action',404);
  const key=action==='rotate'?secret(input.key):null;if(key&&input.approve!==true)fail('Renew recipient authorization explicitly');if(key)refuseKeyEcho([JSON.stringify(state)],key);
  if(key) {
   const current=await c.env.DB.prepare('SELECT custody FROM oc_endpoint_credentials WHERE endpoint=?').bind(endpoint.id).first();let previous:string|undefined;
   if(current)try{previous=await openCredential(current.custody,runtimeBindings(c.env).SESSION_SECRET,endpointCustody);}catch { /* Deliberate reprovisioning repairs unreadable local custody. */ }
   if(previous===key)fail('Rotation requires a different private key',409);
  }
  const custody=key?await sealCredential(key,runtimeBindings(c.env).SESSION_SECRET,endpointCustody):null;
  endpoint.active=!!custody;endpoint.revision++;auditKind(c.env.DB,'automation.endpoint-'+action);
  await commitAutomation(c,state,deps.guard(c),token=>[c.env.DB.prepare(`DELETE FROM oc_endpoint_credentials WHERE endpoint=? AND ${gate}`).bind(endpoint.id,token),...(custody?[c.env.DB.prepare(`INSERT INTO oc_endpoint_credentials(endpoint,custody) SELECT ?,? WHERE ${gate}`).bind(endpoint.id,custody,token)]:[])]);
  return c.json(endpoint);
 });
 api.post('/api/automation/dispatch',async(c:any)=>{await owner(c);return c.json(await dispatchOutbox(c.env,deps.guard(c)));});
 // Clearing an expired lease records an interrupted local send, never a remote deletion or delivery claim.
 api.post('/api/automation/outbox/:id/clear-expired',async(c:any)=>{
  const state=await owner(c),input=await deps.body(c),item=state.apiOutbox?.find(v=>v.id===c.req.param('id'));
  if(!item)fail('Unknown operation',404);
  requireRevision(item.revision,input.revision);
  const expired=item.status==='sending'&&item.leaseUntil!==null&&Date.parse(item.leaseUntil)<=Date.now();
  const uncertain=item.status==='uncertain'&&item.history.at(-1)?.reason==='lease-expired';
  if(input.approve!==true||!expired&&!uncertain)fail('Explicit approval and an expired lease are required; a live send cannot be cleared',409);
  item.authorized=false;updateOutcome(item,'interrupted','expired-lease-cleared');
  auditKind(c.env.DB,'automation.clear-expired');auditOutcome(c.env.DB,'interrupted');setAuditSubject(c.env.DB,'outbox',item.id);
  await commitAutomation(c,state,deps.guard(c));
  return c.json({operation:item,externalOutcome:'unknown',deletion:'not-requested',reason:'The local lease is cleared. In-flight bytes cannot be recalled; request recipient deletion separately with per-destination consent.'});
 });
 api.post('/api/automation/outbox/:id/replay',async(c:any)=>{
  const state=await owner(c),input=await deps.body(c);expireLeases(state);
  const item=state.apiOutbox?.find(v=>v.id===c.req.param('id'));if(!item)fail('Unknown operation',404);
  requireRevision(item.revision,input.revision);
  if(!['failed','uncertain','interrupted','terminal'].includes(item.status)||input.approve!==true||item.attempts>=5)fail('Replay needs explicit authorization, a stopped operation and remaining attempt budget',409);
  if(unfinishedDeliveries(state)-(item.status==='failed'?1:0)>=deliveryCapacity)fail('Delivery capacity reached; retained operation was not replayed',429);
  const endpoint=state.apiEndpoints?.find(e=>e.id===item.endpoint&&e.active),client=state.apiClients?.find(v=>v.id===item.client&&v.active);
  if(!endpoint||!client||!activeOwner(state,endpoint.owner)||!activeOwner(state,client.owner)||!client.services.includes(item.service))fail('Renew client and endpoint authority before replay',403);
  const receiver=state.apiClients?.find(v=>v.id===endpoint.client&&v.active);if(!receiver||!activeOwner(state,receiver.owner)||!receiver.permissions.includes('incidents:read')||!receiver.services.includes(item.service))fail('Receiving client access is unavailable',403);
  item.clientRevision=client.revision;item.receiverRevision=receiver.revision;item.endpointRevision=endpoint.revision;
  item.authorized=true;item.due=new Date().toISOString();updateOutcome(item,'queued','protected-replay');
  auditKind(c.env.DB,'automation.replay');setAuditSubject(c.env.DB,'outbox',item.id);
  await commitAutomation(c,state,deps.guard(c));return c.json(item);
 });
}
function clientGuard(client:Client,digest:string):Guard {
 return {sql:"EXISTS(SELECT 1 FROM oc_api_credentials WHERE client=? AND digest=?) AND EXISTS(SELECT 1 FROM oc_api_clients WHERE id=? AND json_extract(data,'$.active')=1 AND json_extract(data,'$.revision')=?) AND EXISTS(SELECT 1 FROM oc_members WHERE id=? AND json_extract(data,'$.active')=1 AND json_extract(data,'$.role')='admin')",values:[client.id,digest,client.id,client.revision,client.owner]};
}
const failureCode=(status:number)=>({400:'invalid_request',401:'invalid_token',403:'insufficient_scope',404:'not_found',409:'conflict',413:'request_too_large',429:'rate_or_capacity_limit',503:'storage_unavailable'}[status]??'request_refused');
export function installVersionedApi(api:any,deps:Deps) {
 api.use('/api/v1/*',async(c:any,next:any)=>{
  try {
   const header=c.req.header('authorization')??'';if(!/^Bearer [^\s]{32,200}$/.test(header))fail('A scoped service-account token is required',401);
   const key=header.slice(7),digest=await changeHash(key),credential=await c.env.DB.prepare('SELECT client FROM oc_api_credentials WHERE digest=?').bind(digest).first();
   if(!credential)fail('Invalid or revoked token',401);
   const state=await loadWorkspace(c.env.DB),client=state.apiClients?.find(v=>v.id===credential.client&&v.active);
   if(!client||!activeOwner(state,client.owner))fail('Invalid or revoked token',401);
   auditIdentity(c.env.DB,{actor:{kind:'api-client',id:client.id},source:{kind:'api-client',id:client.id}});auditKind(c.env.DB,'automation.request');
   const guard=clientGuard(client,digest),now=Date.now(),window=Math.floor(now/60000);
   const result=await c.env.DB.batch([
    c.env.DB.prepare(`UPDATE oc_api_credentials SET requests=CASE WHEN window=? THEN requests+1 ELSE 1 END,window=? WHERE client=? AND digest=? AND ${guard.sql} RETURNING requests`).bind(window,window,client.id,digest,...guard.values),
    c.env.DB.prepare(`UPDATE oc_api_clients SET data=json_set(data,'$.lastUsed',?) WHERE id=? AND ${guard.sql}`).bind(new Date(now).toISOString(),client.id,...guard.values),
    c.env.DB.prepare(`UPDATE workspace_control SET revision=revision+1 WHERE id=1 AND ${guard.sql}`).bind(...guard.values),
   ]);
   if(!result[0].results.length)fail('Invalid or revoked token',401);
   if(result[0].results[0].requests>60){c.header('Retry-After',String(60-Math.floor(now/1000)%60));fail('60 requests per minute per client; retry after the window',429);}
   c.set('apiClient',client);c.set('apiGuard',guard);c.set('apiKey',key);
   await next();
  } catch(error) {
   const status=error instanceof Fault?error.status:503;
   return c.json({error:{code:failureCode(status),message:error instanceof Fault?error.message:'Storage unavailable; no success confirmed'}},status);
  }
 });
 async function context(c:any,permission:string) {
  const state=await loadWorkspace(c.env.DB),original=c.get('apiClient') as Client;
  const client=state.apiClients?.find(v=>v.id===original.id&&v.active&&v.revision===original.revision);
  if(!client||!activeOwner(state,client.owner))fail('Invalid or revoked token',401);
  if(!client.permissions.includes(permission))fail('Token lacks the required permission',403);
  return {state,client};
 }
 async function readFence(c:any) {const guard=c.get('apiGuard') as Guard;if(!await c.env.DB.prepare(`SELECT 1 WHERE ${guard.sql}`).bind(...guard.values).first())fail('Invalid or revoked token',401);}
 const allowed=(client:Client,service:string)=>{if(!client.services.includes(service))fail('Record not found in this client scope',404);};
 const projectService=(s:any,c:Client)=>({...s,dependencies:(s.dependencies??[]).filter((id:string)=>c.services.includes(id))});
 async function records(c:any,family:string,state:State,client:Client) {
  const services=state.services.filter(s=>client.services.includes(s.id)),incidents=state.incidents.filter(i=>!i.mergedInto&&incidentWithinServices(state,i,client.services));
  if(family==='services')return services.map(s=>projectService(s,client));
  if(family==='incidents')return incidents;
  if(family==='actions')return state.incidents.filter(i=>client.services.includes(i.service)).flatMap(i=>i.actions.map(a=>({...a,incident:i.id,service:i.service,revision:i.revision})));
  if(family==='schedules')return (await pagingSnapshot(c.env.DB)).archive.schedules.filter(s=>client.services.includes(s.service));
  if(family==='analytics')return services.map(s=>({id:s.id,service:s.id,incidents:incidents.filter(i=>i.service===s.id).length,open:incidents.filter(i=>i.service===s.id&&i.state!=='resolved').length,followups:state.incidents.filter(i=>client.services.includes(i.service)&&i.service===s.id).flatMap(i=>i.actions).filter(a=>!a.done).length}));
  if(family==='integrations') {
   const native=(await c.env.DB.prepare('SELECT id,scopes FROM sources').all()).results;
   return [...(state.intakeSources??[]).filter(s=>client.services.includes(s.service)).map(s=>({id:'intake:'+s.id,active:s.active,service:s.service,provider:s.provider})),
    ...(state.changeSources??[]).filter(s=>client.services.includes(s.service)).map(s=>({id:'change:'+s.id,active:s.active,service:s.service,provider:s.provider})),
    ...(state.emailAddresses??[]).filter(s=>client.services.includes(s.service)).map(s=>({id:'email:'+s.id,active:s.active,service:s.service,provider:'email'})),
    ...native.filter((s:any)=>{const grants=JSON.parse(s.scopes);return grants.length>0&&grants.every((id:string)=>client.services.includes(id));}).map((s:any)=>({id:'native:'+s.id,active:true,services:JSON.parse(s.scopes),provider:'native'}))];
  }
  return fail('Unknown API family',404);
 }
 for(const family of ['services','schedules','incidents','actions','analytics','integrations']) {
  api.get('/api/v1/'+family,async(c:any)=>{
   const {state,client}=await context(c,family+':read');let rows=(await records(c,family,state,client)).sort((a:any,b:any)=>a.id.localeCompare(b.id));
   const service=c.req.query('service');if(service){allowed(client,service);rows=rows.filter((r:any)=>(family==='services'?r.id:r.service??(r.services?.includes(service)&&service))===service);}
   const limit=Number(c.req.query('limit')??25);if(!Number.isSafeInteger(limit)||limit<1||limit>100)fail('Page limit must be 1–100');
   const version=await changeHash(JSON.stringify(rows)),scope=await changeHash(JSON.stringify([client.id,client.revision,family,service??null]));let offset=0;
   const cursor=c.req.query('cursor');if(cursor){try{const value=JSON.parse(atob(cursor));const sig=await changeHmac(runtimeBindings(c.env).SESSION_SECRET,JSON.stringify(value.slice(0,3)));if(value.length!==4||value[0]!==scope||value[1]!==version||value[3]!==sig||!Number.isSafeInteger(value[2])||value[2]<0||value[2]>rows.length)fail('Cursor expired or belongs to another scope',409);offset=value[2];}catch(e){if(e instanceof Fault)throw e;fail('Invalid cursor');}}
   const page=rows.slice(offset,offset+limit),next=[scope,version,offset+page.length];
   const nextCursor=offset+page.length<rows.length?btoa(JSON.stringify([...next,await changeHmac(runtimeBindings(c.env).SESSION_SECRET,JSON.stringify(next))])):null;
   // Only the authorized rows contribute to the cursor or visible count.
   await readFence(c);return c.json({data:page,nextCursor});
  });
  api.get('/api/v1/'+family+'/:id',async(c:any)=>{
   const {state,client}=await context(c,family+':read');
   const requested=family==='incidents'?state.incidents.find(i=>i.id===c.req.param('id')):undefined;
   if(requested&&!incidentWithinServices(state,requested,client.services))fail('Record not found in this client scope',404);
   const canonical=requested?resolveIncidentAlias(state,requested.id):undefined;
   const row=(await records(c,family,state,client)).find((r:any)=>r.id===(canonical?.id??c.req.param('id')));
   if(requested?.mergedInto&&row)c.header('Content-Location','/api/v1/incidents/'+row.id);
   if(!row)fail('Record not found in this client scope',404);c.header('ETag','"'+await changeHash(JSON.stringify(row))+'"');await readFence(c);return c.json(row);
  });
 }
 for(const family of ['services','schedules','incidents','actions'])api.post('/api/v1/'+family,async(c:any)=>{
  const {state,client}=await context(c,family+':write'),input=await deps.body(c),key=text(c.req.header('idempotency-key'),'Idempotency-Key',100);
  if(!/^[A-Za-z0-9_-]+$/.test(key))fail('Use an opaque idempotency key');
  refuseKeyEcho([JSON.stringify(input),key],c.get('apiKey'));
  const request=await changeHash(JSON.stringify([family,input])),keyHash=await changeHash(key),prior=state.apiOperations?.find(o=>o.client===client.id&&o.key===keyHash);
  if(prior){allowed(client,prior.service);if(prior.request!==request)fail('Idempotency key already names different input',409);await readFence(c);return c.json(prior);}
  const incident=state.incidents.find(i=>i.id===input.incident),service=family==='services'?input.id:family==='incidents'&&['declare','manual-page'].includes(input.type)?input.service:family==='schedules'?input.service:incident?.service;
  allowed(client,service);if(!state.services.some(s=>s.id===service))fail('Record not found in this client scope',404);
  if(Array.isArray(input.dependencies)&&input.dependencies.some((s:string)=>!client.services.includes(s)))fail('Cross-service reference refused',404);
  const actor:Member={id:client.id,name:client.name,role:'responder',active:true,machine:true};
  let result:any,extra:(token:string)=>D1PreparedStatement[]=()=>[];
  if(family==='schedules') {
   const snapshot=await pagingSnapshot(c.env.DB),old=snapshot.archive.schedules.find(s=>s.id===input.id);if(old&&old.service!==service)fail('Record not found in this client scope',404);
   requireRevision(old?.revision??0,input.revision);result=validateSchedule({...input,revision:input.revision+1},state);
   bound({...snapshot.archive,schedules:[...snapshot.archive.schedules.filter(s=>s.id!==result.id),result]});
   scheduleChanges(state,old?[old]:[],[result],client.id);
   extra=token=>[c.env.DB.prepare(`UPDATE paging_control SET revision=revision+1,write_token=? WHERE id=1 AND revision=? AND ${gate}`).bind(token,snapshot.revision,token),putSchedule(c.env.DB,result,token)];
   const guard=c.get('apiGuard') as Guard;c.set('apiGuard',{sql:guard.sql+' AND EXISTS(SELECT 1 FROM paging_control WHERE id=1 AND revision=?)',values:[...guard.values,snapshot.revision]});
  } else {
   if(family==='services') {const current=state.services.find(s=>s.id===service)!;if(input.etag!==await changeHash(JSON.stringify(projectService(current,client))))fail('Service changed; supply its current etag',409);}
   const permitted=family==='services'?['service']:family==='actions'?['action','complete']:['declare','manual-page','snooze','cancel-deadline','transition','reassign','assign-role'];
   if(!permitted.includes(input.type))fail('Action is not available in this API family',403);
   if(['manual-page','snooze'].includes(input.type)){
    const snapshot=await pagingSnapshot(c.env.DB);if(input.policy)allowed(client,input.policy);
    const guard=c.get('apiGuard') as Guard;c.set('apiGuard',{sql:guard.sql+' AND EXISTS(SELECT 1 FROM paging_control WHERE id=1 AND revision=?)',values:[...guard.values,snapshot.revision]});
    result=command(state,actor,input.type==='manual-page'?{...input,operationId:keyHash}:input,new Date(Date.now()).toISOString(),responseContext(snapshot,Date.now()));
   }else result=command(state,actor,input,new Date(Date.now()).toISOString());
  }
  const operation:Operation={id:crypto.randomUUID(),client:client.id,key:keyHash,request,service,resource:family,entity:result.id,revision:result.revision??1,at:new Date().toISOString()};
  (state.apiOperations??=[]).push(operation);if(state.apiOperations.length>1000)fail('API operation history capacity reached',429);
  auditKind(c.env.DB,'automation.'+family);setAuditSubject(c.env.DB,'entity',result.id);
  if(family==='incidents'&&input.type==='transition'&&input.state==='acknowledged')auditIdentity(c.env.DB,{namedMember:{kind:'member',id:input.member}});
  await commitAutomation(c,state,c.get('apiGuard'),extra);return c.json(operation,201);
 });
 api.all('/api/v1/*',(c:any)=>c.json({error:{code:'not_found',message:'Unknown versioned API route'}},404));
}
