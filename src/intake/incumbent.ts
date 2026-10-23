import {auditIdentity} from '../audit-store';
import {workspaceWrite} from '../workspace-store';
import {authority,fail,text,type State} from '../family/response-operations/domain';
import type {IntakeSource} from './model';
import {intakeHash} from './credentials';

type Dependencies={body:(c:any)=>Promise<any>;state:(c:any,admin?:boolean)=>Promise<State>;guard:(c:any)=>{sql:string;values:(string|number|null)[]}};
const gate='EXISTS(SELECT 1 FROM workspace_control WHERE id=1 AND write_token=?)';
const completed=`EXISTS(SELECT 1 FROM ik_provenance p JOIN ik_jobs j ON j.id=p.job_id WHERE p.destination='oncall' AND p.target_kind='integration' AND p.target_id=? AND p.reversed=0 AND j.state='completed')`;
const safeSource=(state:State,id:string)=>{const source=state.intakeSources?.find(s=>s.id===id);if(!source||source.routing||!['pagerduty','opsgenie','splunk'].includes(source.provider))fail('Unknown service-bound compatible integration',404);return source};
function audit(c:any,state:State,source:IntakeSource,kind:string) {
 state.audit.push({id:crypto.randomUUID(),at:source.updatedAt,actor:c.get('actor').id,kind,text:`${kind}: integration ${source.id}; revision ${source.revision}; paging OFF`});
 auditIdentity(c.env.DB,{source:{kind:'intake-source',id:source.id},subject:{kind:'intake-source',id:source.id}});
}
export function installIncumbentKeys(api:any,deps:Dependencies) {
 api.get('/api/intake/sources/:source/incumbent',async(c:any)=>{
  const state=await deps.state(c,true);authority(state,c.get('actor'),true);
  const source=safeSource(state,c.req.param('source'));
  const held=await c.env.DB.prepare('SELECT 1 AS supplied FROM oc_incumbent_credentials WHERE source=?').bind(source.id).first();
  return c.json({source,keySupplied:!!held,paging:'OFF'});
 });
 api.post('/api/intake/incumbent',async(c:any)=>{
  const input=await deps.body(c),state=await deps.state(c,true),actor=c.get('actor');authority(state,actor,true);
  if(!input||Object.keys(input).some(k=>!['importedId','importedRevision','id','service','name','revision','key'].includes(k)))fail('Unknown incumbent-key fields');
  const importedId=text(input.importedId,'Imported integration',200),row=await c.env.DB.prepare("SELECT revision,data FROM move_in_objects WHERE kind='integration' AND id=?").bind(importedId).first();
  if(!row||input.importedRevision!==row.revision)fail('Imported integration changed; reload',409);
  const imported=JSON.parse(row.data);
  if(!['pagerduty','opsgenie','splunk'].includes(imported.provider))fail('This exported integration kind has no compatible activation path');
  const id=text(input.id,'Integration ID',80),previous=state.intakeSources?.find(s=>s.id===id);
  if(!/^[a-zA-Z0-9_-]+$/.test(id))fail('Use letters, numbers, hyphens or underscores for the integration ID');
  if(input.revision!==(previous?.revision??0)||imported.intakeSource&&imported.intakeSource!==id||previous&&imported.intakeSource!==id)fail('Integration identity or revision changed; reload',409);
  if(!state.services.some(s=>s.id===input.service)||previous&&(previous.service!==input.service||previous.provider!==imported.provider||previous.routing))fail('Choose the same service-bound integration');
  if(await c.env.DB.prepare('SELECT id FROM sources WHERE id=?').bind('intake:'+id).first())fail('A native source occupies this identity',409);
  const key=input.key;
  if(typeof key!=='string'||key.length<32||key.length>200||!/^[\x21-\x7e]+$/.test(key))fail('Supply 32–200 printable ASCII key characters without whitespace');
  if(imported.provider==='pagerduty'&&!/^[0-9a-f]{32}$/i.test(key))fail('An incumbent PagerDuty integration key must be 32 hexadecimal characters');
  const source:IntakeSource={id,name:text(input.name,'Integration name',200),provider:imported.provider,service:input.service,active:false,revision:(previous?.revision??0)+1,createdBy:previous?.createdBy??actor.id,updatedAt:new Date().toISOString()};
  if(JSON.stringify({source,importedId,imported,state}).includes(key))fail('Keep the key out of visible definitions and source metadata');
  const digest=await intakeHash(key),importedDigest=await intakeHash(importedId);
  if(await c.env.DB.prepare('SELECT source FROM oc_intake_credentials WHERE key_digest=? AND source<>? UNION ALL SELECT source FROM oc_incumbent_credentials WHERE key_digest=? AND source<>?').bind(digest,id,digest,id).first())fail('Use a distinct key for each integration',409);
  if(previous)state.intakeSources![state.intakeSources!.indexOf(previous)]=source;else(state.intakeSources??=[]).push(source);
  audit(c,state,source,previous?'incumbent-key-rotated':'incumbent-key-supplied');
  const token=crypto.randomUUID(),guard=deps.guard(c),next={...imported,intakeSource:id};
  const bound={sql:`(${guard.sql}) AND EXISTS(SELECT 1 FROM move_in_objects WHERE kind='integration' AND id=? AND revision=? AND data=?) AND ${completed}`,values:[...guard.values,importedId,row.revision,row.data,importedId]};
  const result=await c.env.DB.batch([...workspaceWrite(c.env.DB,state,state.revision,bound,token),
   c.env.DB.prepare(`INSERT INTO oc_incumbent_credentials(source,key_digest,imported_digest,created_at) SELECT ?,?,?,? WHERE ${gate} ON CONFLICT(source) DO UPDATE SET key_digest=excluded.key_digest,created_at=excluded.created_at`).bind(id,digest,importedDigest,source.updatedAt,token),
   c.env.DB.prepare(`DELETE FROM oc_intake_credentials WHERE source=? AND ${gate}`).bind(id,token),
   c.env.DB.prepare(`UPDATE move_in_objects SET revision=?,data=? WHERE kind='integration' AND id=? AND ${gate}`).bind('intake-'+token,JSON.stringify(next),importedId,token)]);
  if(result[0].meta.changes!==1)fail('Import, workspace or authority changed; reload',409);
  return c.json({source,keySupplied:true,paging:'OFF'},previous?200:201);
 });
 api.post('/api/intake/sources/:source/activate-incumbent',async(c:any)=>{
  const input=await deps.body(c),state=await deps.state(c,true);authority(state,c.get('actor'),true);
  const source=safeSource(state,c.req.param('source'));
  if(input.confirmed!==true||input.revision!==source.revision||source.active)fail('Confirm the current inactive integration revision',409);
  const held=await c.env.DB.prepare('SELECT key_digest FROM oc_incumbent_credentials WHERE source=?').bind(source.id).first();
  if(!held)fail('Supply an incumbent key again before activation',409);
  const nativeKey=[...crypto.getRandomValues(new Uint8Array(32))].map(n=>n.toString(16).padStart(2,'0')).join(''),digest=await intakeHash(nativeKey);
  source.active=true;source.revision++;source.updatedAt=new Date().toISOString();audit(c,state,source,'incumbent-key-activated');
  const token=crypto.randomUUID(),guard=deps.guard(c),bound={sql:`(${guard.sql}) AND EXISTS(SELECT 1 FROM oc_incumbent_credentials WHERE source=? AND key_digest=?)`,values:[...guard.values,source.id,held.key_digest]};
  const result=await c.env.DB.batch([...workspaceWrite(c.env.DB,state,state.revision,bound,token),c.env.DB.prepare(`INSERT INTO oc_intake_credentials(source,key_digest) SELECT ?,? WHERE ${gate} ON CONFLICT(source) DO UPDATE SET key_digest=excluded.key_digest`).bind(source.id,digest,token)]);
  if(result[0].meta.changes!==1)fail('Integration or authority changed; reload',409);
  return c.json({source,keySupplied:true,nativeKey,paging:'OFF'});
 });
}
