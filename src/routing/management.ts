import { workspaceWrite } from '../workspace-store.ts';
import { authority, fail, text, type State } from '../family/response-operations/domain.ts';
import { intakeHash } from '../intake/credentials.ts';
import { intakeProviders, type IntakeSource } from '../intake/model.ts';
import { exact, routingRules, routingScope } from './definition.ts';
import { installRoutingOperations } from './operations.ts';

export type RoutingDependencies={body:(c:any)=>Promise<any>;state:(c:any,admin?:boolean)=>Promise<State>;guard:(c:any)=>{sql:string;values:(string|number|null)[]}};
export async function routingSave(c:any,deps:RoutingDependencies,state:State) {
  const result=await c.env.DB.batch(workspaceWrite(c.env.DB,state,state.revision,deps.guard(c)));
  if(result[0].meta.changes!==1)fail('Workspace or authority changed; reload',409);
}
export function routingSource(state:State,id:string) {
  const source=state.intakeSources?.find(s=>s.id===id&&s.routing);
  if(!source)fail('Unknown routed key',404);
  return source as IntakeSource & {routing:NonNullable<IntakeSource['routing']>};
}
export function installRoutingManagement(api:any,deps:RoutingDependencies) {
  api.post('/api/routing/keys',async(c:any)=>{
    const input=await deps.body(c),state=await deps.state(c,true),actor=c.get('actor');authority(state,actor,true);
    exact(input,['id','name','provider','scope','owner','key','revision'],['rules','catchAll']);
    const id=text(input.id,'Integration ID',80),previous=state.intakeSources?.find(s=>s.id===id);
    if(!/^[a-zA-Z0-9_-]+$/.test(id))fail('Use letters, numbers, hyphens or underscores for the integration ID');
    if(input.revision!==(previous?.revision??0))fail('Integration changed; reload before saving',409);
    const scope=routingScope(state,input.scope);
    if(!intakeProviders.includes(input.provider))fail('Choose a supported provider');
    if(!state.members.some(m=>m.id===input.owner&&m.active&&m.role!=='viewer'))fail('Integration owner must be an active responder');
    if(previous&&(!previous.routing||previous.provider!==input.provider||JSON.stringify(previous.routing.scope)!==JSON.stringify(scope)))fail('Provider and routing scope are immutable; create another integration');
    const key=text(input.key,'Integration key',200);if(key.length<32)fail('Integration key needs at least 32 characters');
    const at=new Date().toISOString(),definition=previous?.routing??{scope,owner:input.owner,versions:[{version:1,...routingRules(scope,input.rules??[],input.catchAll??null),publishedBy:actor.id,publishedAt:at}]};
    const source:IntakeSource={id,name:text(input.name,'Integration name',200),provider:input.provider,service:scope[0],active:true,revision:(previous?.revision??0)+1,createdBy:previous?.createdBy??actor.id,updatedAt:at,routing:{...definition,owner:input.owner}};
    if(JSON.stringify(source).includes(key))fail('Keep credentials out of routing definitions');
    const digest=await intakeHash(key),other=await c.env.DB.prepare('SELECT source FROM oc_intake_credentials WHERE key_digest=? AND source<>?').bind(digest,id).first();
    if(other)fail('Use a distinct key for each integration',409);
    if(await c.env.DB.prepare('SELECT id FROM sources WHERE id=?').bind('intake:'+id).first())fail('A held native source occupies this integration identity; choose another ID',409);
    if(previous)state.intakeSources![state.intakeSources!.indexOf(previous)]=source;else(state.intakeSources??=[]).push(source);
    state.audit.push({id:crypto.randomUUID(),at,actor:actor.id,kind:'routing-key',text:`Configured routed ${source.provider} key ${id}; revision ${source.revision}; rule version ${definition.versions.at(-1)!.version}`});
    const token=crypto.randomUUID(),result=await c.env.DB.batch([...workspaceWrite(c.env.DB,state,state.revision,deps.guard(c),token),c.env.DB.prepare('INSERT INTO oc_intake_credentials(source,key_digest) SELECT ?,? WHERE EXISTS(SELECT 1 FROM workspace_control WHERE write_token=?) ON CONFLICT(source) DO UPDATE SET key_digest=excluded.key_digest').bind(id,digest,token)]);
    if(result[0].meta.changes!==1)fail('Workspace or authority changed; reload',409);
    return c.json(source,previous?200:201);
  });
  installRoutingOperations(api,deps);
}
