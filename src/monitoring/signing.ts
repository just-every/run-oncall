import {fail,text,type State} from '../family/response-operations/domain';
import {workspaceWrite} from '../workspace-store';
import {auditIdentity} from '../audit-store';
import {runtimeBindings} from '../auth.server';
import {sealCredential} from '../changes/credentials';
import {grafanaCustody} from './credentials';
type Guard={sql:string;values:(string|number|null)[]};
type Dependencies={body:(c:any)=>Promise<any>;state:(c:any,admin?:boolean)=>Promise<State>;guard:(c:any)=>Guard};
export function installMonitoringSigning(api:any,deps:Dependencies){
  api.get('/api/monitoring/:source/signing',async(c:any)=>{
    const state=await deps.state(c,true),source=state.intakeSources?.find(s=>s.id===c.req.param('source')&&s.provider==='grafana');
    if(!source)fail('Choose a Grafana integration',404);
    const credential=await c.env.DB.prepare('SELECT signing_custody FROM oc_intake_credentials WHERE source=?').bind(source.id).first();
    return c.json({source:source.id,revision:source.revision,configured:!!credential?.signing_custody});
  });
  api.post('/api/monitoring/:source/signing',async(c:any)=>{
    const input=await deps.body(c),state=await deps.state(c,true),source=state.intakeSources?.find(s=>s.id===c.req.param('source')&&s.provider==='grafana');
    if(!source)fail('Choose a Grafana integration',404);
    if(input.revision!==source.revision)fail('Grafana integration changed; reload before changing signing',409);
    const credential=await c.env.DB.prepare('SELECT key_digest,signing_custody FROM oc_intake_credentials WHERE source=?').bind(source.id).first();
    if(!source.active||!credential)fail('Configure a local bearer credential before signing',409);
    const secret=input.secret===null?null:text(input.secret,'Grafana signing secret',200);
    if(secret!==null&&secret.length<32)fail('Grafana signing secret needs at least 32 characters');
    const ciphertext=secret===null?null:await sealCredential(secret,runtimeBindings(c.env).SESSION_SECRET!,grafanaCustody);
    source.revision++;source.updatedAt=new Date().toISOString();
    state.audit.push({id:crypto.randomUUID(),at:source.updatedAt,actor:c.get('actor').id,kind:'grafana-signing',text:`Grafana signature ${secret===null?'disabled':'required'}; integration revision ${source.revision}`});
    auditIdentity(c.env.DB,{source:{kind:'intake-source',id:source.id},subject:{kind:'intake-source',id:source.id}});
    const guard=deps.guard(c),token=crypto.randomUUID();
    guard.sql+=' AND EXISTS(SELECT 1 FROM oc_intake_credentials WHERE source=? AND key_digest=? AND signing_custody IS ?)';guard.values.push(source.id,credential.key_digest,credential.signing_custody??null);
    const result=await c.env.DB.batch([...workspaceWrite(c.env.DB,state,state.revision,guard,token),c.env.DB.prepare('UPDATE oc_intake_credentials SET signing_custody=? WHERE source=? AND EXISTS(SELECT 1 FROM workspace_control WHERE write_token=?)').bind(ciphertext,source.id,token)]);
    if(result[0].meta.changes!==1)fail('Credential or authority changed; reload before changing signing',409);
    return c.json({source:source.id,revision:source.revision,configured:secret!==null});
  });
}
