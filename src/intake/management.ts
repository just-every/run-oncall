import { workspaceWrite } from '../workspace-store';
import { authority, fail, text, type State } from '../family/response-operations/domain.ts';
import { intakeProviders, type IntakeSource } from './model';
import { intakeHash } from './credentials';

type Dependencies={body:(c:any)=>Promise<any>;state:(c:any,admin?:boolean)=>Promise<State>;guard:(c:any)=>{sql:string;values:(string|number|null)[]}};
export function installIntakeManagement(api:any,deps:Dependencies) {
  api.post('/api/intake/sources',async(c:any)=>{
    const input=await deps.body(c),state=await deps.state(c,true),actor=c.get('actor');authority(state,actor,true);
    const id=text(input.id,'Integration ID',80),previous=state.intakeSources?.find(s=>s.id===id);
    if(!/^[a-zA-Z0-9_-]+$/.test(id))fail('Use letters, numbers, hyphens or underscores for the integration ID');
    if(input.revision!==(previous?.revision??0))fail('Integration changed; reload before saving',409);
    if(!intakeProviders.includes(input.provider)||!state.services.some(s=>s.id===input.service))fail('Choose a supported provider and service');
    if(previous?.routing)fail('Use routed key management to rotate this key');
    if(previous&&(previous.service!==input.service||previous.provider!==input.provider))fail('Service and provider bindings are immutable; create another integration');
    const key=text(input.key,'Integration key',200);if(key.length<32)fail('Integration key needs at least 32 characters');
    const source:IntakeSource={id,name:text(input.name,'Integration name',200),provider:input.provider,service:input.service,active:true,revision:(previous?.revision??0)+1,createdBy:previous?.createdBy??actor.id,updatedAt:new Date().toISOString()};
    if([id,source.name,source.service].some(v=>v.includes(key)))fail('Keep the key out of integration definitions');
    const digest=await intakeHash(key),other=await c.env.DB.prepare('SELECT source FROM oc_intake_credentials WHERE key_digest=? AND source<>?').bind(digest,id).first();
    if(other)fail('Use a distinct key for each integration',409);
    if(await c.env.DB.prepare('SELECT id FROM sources WHERE id=?').bind('intake:'+id).first())fail('A held native source occupies this integration identity; choose another ID',409);
    if(previous)state.intakeSources![state.intakeSources!.indexOf(previous)]=source;else(state.intakeSources??=[]).push(source);
    state.audit.push({id:crypto.randomUUID(),at:source.updatedAt,actor:actor.id,kind:'intake-source',text:`Configured ${source.provider} integration ${id}; revision ${source.revision}`});
    const token=crypto.randomUUID(),result=await c.env.DB.batch([...workspaceWrite(c.env.DB,state,state.revision,deps.guard(c),token),c.env.DB.prepare('INSERT INTO oc_intake_credentials(source,key_digest) SELECT ?,? WHERE EXISTS(SELECT 1 FROM workspace_control WHERE write_token=?) ON CONFLICT(source) DO UPDATE SET key_digest=excluded.key_digest').bind(id,digest,token)]);
    if(result[0].meta.changes!==1)fail('Workspace or authority changed; reload',409);
    return c.json(source,previous?200:201);
  });
  api.post('/api/intake/sources/:source/revoke',async(c:any)=>{
    const input=await deps.body(c),state=await deps.state(c,true),source=state.intakeSources?.find(s=>s.id===c.req.param('source'));
    if(!source)fail('Unknown integration',404);
    if(input.revision!==source.revision)fail('Integration changed; reload',409);
    source.active=false;source.revision++;source.updatedAt=new Date().toISOString();
    state.audit.push({id:crypto.randomUUID(),at:source.updatedAt,actor:c.get('actor').id,kind:'intake-source-revoked',text:`Revoked integration ${source.id}; revision ${source.revision}`});
    const token=crypto.randomUUID(),result=await c.env.DB.batch([...workspaceWrite(c.env.DB,state,state.revision,deps.guard(c),token),c.env.DB.prepare('DELETE FROM oc_intake_credentials WHERE source=? AND EXISTS(SELECT 1 FROM workspace_control WHERE write_token=?)').bind(source.id,token)]);
    if(result[0].meta.changes!==1)fail('Workspace or authority changed; reload',409);
    return c.json(source);
  });
}
