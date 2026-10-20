import { auditIdentity, auditOutcome } from '../audit-store'
import { fail, type State } from '../family/response-operations/domain.ts';
import { intakeHash } from '../intake/credentials.ts';
import type { IntakeSource } from '../intake/model.ts';

export type IntakeDependencies={load:(db:D1Database)=>Promise<State>;save:(db:D1Database,state:State,revision:number,guard:{sql:string;values:(string|number|null)[]})=>Promise<void>};
export async function rejectIntake(c:any,deps:IntakeDependencies,state:State,source:IntakeSource|undefined,endpoint:string,reason:string) {
  const at=new Date().toISOString();
  state.audit.push({id:crypto.randomUUID(),at,actor:'source:intake',kind:'intake-rejected',text:`Rejected ${endpoint} intake${source?' for integration '+source.id+'; owner '+(source.routing?.owner??source.createdBy):''}: ${reason}`});
  auditOutcome(c.env.DB,'refused');
  try { await deps.save(c.env.DB,state,state.revision,{sql:'1=1',values:[]}); } finally { auditOutcome(c.env.DB); }
}
export async function intakeCredential(c:any,deps:IntakeDependencies,key:unknown,provider:string,sourceId?:string) {
  const state=await deps.load(c.env.DB),known=sourceId?state.intakeSources?.find(s=>s.id===sourceId):undefined;
  let digest='';
  if(typeof key==='string'&&key.length>0&&key.length<=200)digest=await intakeHash(key);
  const row=digest?await c.env.DB.prepare('SELECT source,key_digest FROM oc_intake_credentials WHERE key_digest=?').bind(digest).first():null;
  const source=state.intakeSources?.find(s=>s.id===row?.source);
  if(source)auditIdentity(c.env.DB,{actor:{kind:'intake-source',id:source.id},source:{kind:'intake-source',id:source.id}});
  if(!source||!source.active||source.provider!==provider||sourceId!==undefined&&source.id!==sourceId) {
    await rejectIntake(c,deps,state,known??source,provider,'Invalid, revoked or wrong-provider credential');
    fail('Invalid integration credential',401);
  }
  return {state,source,digest,key:key as string};
}
export const credentialGuard=(source:IntakeSource,digest:string)=>({sql:'EXISTS(SELECT 1 FROM oc_intake_credentials WHERE source=? AND key_digest=?)',values:[source.id,digest]});
