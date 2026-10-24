import { requireNewSubjectIdentity } from '../subject-erasure-identity'
import { installChangeErasure, changeErasureIdentity } from './erasure'
import { auditIdentity } from '../audit-store'
import { workspaceWrite } from '../workspace-store';
import { authority, fail, Fault, text, type State } from '../family/response-operations/domain';
import { runtimeBindings } from '../auth.server';
import { changeProviders, recentChanges, retainChangeCapacity, type ChangeSource, type ChangeRecord } from './model';
import { changeHash, changeHmac, equalSignature, freshTimestamp, gitlabSigningKey, openCredential, sealCredential, changeCustody } from './credentials';
import { providerChange } from './providers';

type Dependencies = {body:(c:any,max?:number)=>Promise<any>; load:(db:D1Database)=>Promise<State>; state:(c:any,admin?:boolean)=>Promise<State>; save:(db:D1Database,state:State,revision:number,guard:{sql:string;values:(string|number|null)[]})=>Promise<void>; guard:(c:any)=>{sql:string;values:(string|number|null)[]}};
type Credential = {source:string; key_digest:string; ciphertext:string};
export function installChangeIntake(api:any, deps:Dependencies) {
  const receive = async (c:any, compatible=false) => {
    const raw = await c.req.text(), maximum = compatible ? 512*1024 : 2*1024*1024;
    const parse=()=>{let value:any;try {value=JSON.parse(raw);}catch{return fail('Invalid JSON');}if(!value||typeof value!=='object'||Array.isArray(value))fail('Change must be a JSON object');return value;};
    let payload:any=compatible?parse():undefined;
    let credential:Credential|null;
    if (compatible) credential=await c.env.DB.prepare('SELECT source,key_digest,ciphertext FROM oc_change_credentials WHERE key_digest=?').bind(await changeHash(text(payload.routing_key,'routing_key',200))).first();
    else credential=await c.env.DB.prepare('SELECT source,key_digest,ciphertext FROM oc_change_credentials WHERE source=?').bind(c.req.param('source')).first();
    if (!credential) fail('Invalid change credential',401);
    const state=await deps.load(c.env.DB), revision=state.revision, source=state.changeSources?.find(s=>s.id===credential!.source&&s.active);
    if (!source || compatible !== (source.provider==='pagerduty')) fail('Change source is inactive or uses another endpoint',401);
    const headers:Headers=c.req.raw.headers;
    let verificationKey = compatible ? text(payload.routing_key,'routing_key',200) : '';
    if (!compatible && source.provider==='native' && source.mode==='bearer') {
      const bearer=headers.get('authorization')?.replace(/^Bearer /,'') ?? ''; verificationKey=bearer;
      if (!equalSignature(await changeHash(bearer),credential.key_digest)) fail('Invalid change credential',401);
    } else if (!compatible) {
      const key=await openCredential(credential.ciphertext,runtimeBindings(c.env).SESSION_SECRET!,changeCustody);
      verificationKey=key;
      if (source.provider==='github') {
        if (!equalSignature(headers.get('x-hub-signature-256')??'', 'sha256='+await changeHmac(key,raw))) fail('Invalid GitHub signature',401);
      } else if (source.provider==='terraform') {
        if (!equalSignature((headers.get('x-tfe-notification-signature')??'').toLowerCase(),await changeHmac(key,raw,'hex','SHA-512'))) fail('Invalid Terraform Cloud signature',401);
      } else if (source.provider==='gitlab') {
        const id=headers.get('webhook-id')??'', timestamp=headers.get('webhook-timestamp')??'';freshTimestamp(timestamp);
        const signature=await changeHmac(gitlabSigningKey(key),id+'.'+timestamp+'.'+raw,'base64');
        if (!(headers.get('webhook-signature')??'').split(' ').some(value=>equalSignature(value,'v1,'+signature))) fail('Invalid GitLab signature',401);
      } else {
        const timestamp=headers.get('x-oncall-timestamp')??'';freshTimestamp(timestamp);
        if (!equalSignature(headers.get('x-oncall-signature')??'',await changeHmac(key,timestamp+'.'+raw))) fail('Invalid change signature',401);
      }
    }
    auditIdentity(c.env.DB,{actor:{kind:'change-source',id:source.id},source:{kind:'change-source',id:source.id}});
    if (new TextEncoder().encode(raw).length > maximum) fail('Change request too large',413);
    payload??=parse();
    const input=await providerChange(source,payload,headers,verificationKey);
    if (!input) return c.json({ignored:true,reason:'This signed event does not describe a supported change'},200);
    const awaitIdentity=await changeErasureIdentity(source.id,input.eventId);
    if(state.erasureFences?.some(f=>f.id===awaitIdentity))fail('Change identity was erased; it cannot be admitted again',410);
    const fingerprint=await changeHash(JSON.stringify(input)), existing=state.changes?.find(change=>change.source===source.id&&change.eventId===input.eventId);
    if (existing && existing.fingerprint!==fingerprint) fail('Change identity conflicts with different content',409);
    let record=existing;
    if (!record) {
      retainChangeCapacity(state);
      const at=new Date().toISOString();record={...input,id:crypto.randomUUID(),source:source.id,service:source.service,occurredAt:input.occurredAt??at,timeBasis:input.occurredAt?'source':'received',acceptedAt:at,fingerprint} satisfies ChangeRecord;
      (state.changes??=[]).push(record); source.lastAccepted={id:record.id,eventId:record.eventId,at};
      await deps.save(c.env.DB,state,revision,{sql:'EXISTS(SELECT 1 FROM oc_change_credentials WHERE source=? AND key_digest=? AND ciphertext=?)',values:[source.id,credential.key_digest,credential.ciphertext]});
    }
    return compatible ? c.json({status:'success',message:'Event processed',dedup_key:record.id},202) : c.json({id:record.id,eventId:record.eventId,service:record.service,acceptedAt:record.acceptedAt,duplicate:!!existing},existing?200:201);
  };
  api.post('/api/changes/ingress/:source',(c:any)=>receive(c));
  api.post('/v2/change/enqueue',async(c:any)=>{try{return await receive(c,true);}catch(error){if(error instanceof Fault && error.status<500)return c.json({status:'invalid event',message:'Event object is invalid',errors:[error.message]},error.status===429?429:400);throw error;}});
}
export function installChangeManagement(api:any,deps:Dependencies) {
  installChangeErasure(api,deps);
  api.get('/api/changes/recent',async(c:any)=>c.json(recentChanges(await deps.state(c),c.req.query('service'),c.req.query('at')??new Date().toISOString(),Number(c.req.query('hours')??24))));
  api.get('/api/changes/sources',async(c:any)=>c.json({sources:(await deps.state(c,true)).changeSources??[]}));
  api.post('/api/changes/sources',async(c:any)=>{
    const input=await deps.body(c), state=await deps.state(c,true), actor=c.get('actor');authority(state,actor,true);
    const id=text(input.id,'Change source ID',100), previous=state.changeSources?.find(s=>s.id===id);
    await requireNewSubjectIdentity(state,'change',id)
    if (input.revision !== (previous?.revision??0)) fail('Change source changed. Reload before saving.',409);
    if (!state.services.some(s=>s.id===input.service) || !changeProviders.includes(input.provider)) fail('Choose a service and supported change provider');
    const repository=['github','gitlab'].includes(input.provider)?text(input.repository,'Repository or project binding',200):'';
    if (previous && (previous.service!==input.service || previous.provider!==input.provider || previous.repository!==repository)) fail('Service, provider and repository bindings are immutable; create a new change source');
    const key=text(input.key,'Change verification key',200);if(key.length<32)fail('Use at least 32 key characters');
    if(input.provider==='gitlab')gitlabSigningKey(key);
    const mode=input.provider==='native'?input.mode:'provider';if(!['bearer','signed','provider'].includes(mode)||input.provider==='native'&&mode==='provider')fail('Invalid change authentication mode');
    const source:ChangeSource={id,name:text(input.name,'Change source name',200),service:input.service,provider:input.provider,mode,repository,active:true,revision:(previous?.revision??0)+1,createdBy:previous?.createdBy??actor.id,updatedAt:new Date().toISOString(),...(previous?.lastAccepted?{lastAccepted:previous.lastAccepted}:{})};
    if([source.id,source.name,source.service,source.repository].some(value=>value.includes(key)))fail('Keep the verification key out of source definitions');
    const digest=await changeHash(key),other=await c.env.DB.prepare('SELECT source FROM oc_change_credentials WHERE key_digest=? AND source<>?').bind(digest,id).first();if(other)fail('Use a different key for each change source',409);
    if(previous)state.changeSources![state.changeSources!.indexOf(previous)]=source;else(state.changeSources??=[]).push(source);
    const ciphertext=await sealCredential(key,runtimeBindings(c.env).SESSION_SECRET!,changeCustody),guard=deps.guard(c),revision=state.revision,token=crypto.randomUUID();
    state.audit.push({id:crypto.randomUUID(),at:source.updatedAt,actor:actor.id,kind:'change-source',text:`Configured ${source.provider} change source ${source.id} on ${source.service}; revision ${source.revision}`});
    auditIdentity(c.env.DB,{source:{kind:'change-source',id},subject:{kind:'change-source',id}});
    const result=await c.env.DB.batch([...workspaceWrite(c.env.DB,state,revision,guard,token),c.env.DB.prepare('INSERT INTO oc_change_credentials(source,key_digest,ciphertext) SELECT ?,?,? WHERE EXISTS(SELECT 1 FROM workspace_control WHERE write_token=?) ON CONFLICT(source) DO UPDATE SET key_digest=excluded.key_digest,ciphertext=excluded.ciphertext').bind(id,digest,ciphertext,token)]);
    if(result[0].meta.changes!==1)fail('Workspace or authority changed; reload and retry',409);
    return c.json(source,previous?200:201);
  });
  api.post('/api/changes/sources/:source/revoke',async(c:any)=>{
    const state=await deps.state(c,true),source=state.changeSources?.find(s=>s.id===c.req.param('source'));if(!source)fail('Unknown change source',404);
    const input=await deps.body(c);if(input.revision!==source.revision)fail('Change source changed; reload',409);
    source.active=false;source.revision++;source.updatedAt=new Date().toISOString();
    state.audit.push({id:crypto.randomUUID(),at:source.updatedAt,actor:c.get('actor').id,kind:'change-source-revoked',text:`Revoked change source ${source.id}; revision ${source.revision}`});
    const token=crypto.randomUUID();
    auditIdentity(c.env.DB,{source:{kind:'change-source',id:source.id},subject:{kind:'change-source',id:source.id}});
    const result=await c.env.DB.batch([...workspaceWrite(c.env.DB,state,state.revision,deps.guard(c),token),c.env.DB.prepare('DELETE FROM oc_change_credentials WHERE source=? AND EXISTS(SELECT 1 FROM workspace_control WHERE write_token=?)').bind(source.id,token)]);
    if(result[0].meta.changes!==1)fail('Workspace or authority changed; reload and retry',409);
    return c.json(source);
  });
}
