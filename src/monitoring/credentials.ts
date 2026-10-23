import { auditIdentity, auditOutcome } from '../audit-store'
import { fail, type State } from '../family/response-operations/domain.ts';
import { intakeHash } from '../intake/credentials.ts';
import {equalSignature,freshTimestamp,openCredential,type Custody} from '../changes/credentials.ts';
import {runtimeBindings} from '../auth.server';
import type { IntakeSource } from '../intake/model.ts';

export type IntakeDependencies={load:(db:D1Database)=>Promise<State>;save:(db:D1Database,state:State,revision:number,guard:{sql:string;values:(string|number|null)[]})=>Promise<void>};
const rejectionWindowMs=60000;
/** Each receiver and reason keeps one rejection diagnostic. A refusal within a minute of it
 * persists nothing, so unauthenticated senders cannot grow the workspace or advance its revision. */
export async function rejectIntake(c:any,deps:IntakeDependencies,state:State,source:IntakeSource|undefined,endpoint:string,reason:string) {
  const at=Date.now(),text=`Rejected ${endpoint} intake${source?' for integration '+source.id+'; owner '+(source.routing?.owner??source.createdBy):''}: ${reason}`;
  const same=(row:State['audit'][number])=>row.kind==='intake-rejected'&&row.text===text;
  if(state.audit.some(row=>same(row)&&Date.parse(row.at)>at-rejectionWindowMs))return;
  state.audit=state.audit.filter(row=>!same(row));
  state.audit.push({id:crypto.randomUUID(),at:new Date(at).toISOString(),actor:'source:intake',kind:'intake-rejected',text});
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

export const grafanaCustody:Custody={label:'oncall-grafana-signing-v1',unavailable:'Installation key unavailable for Grafana signing',unreadable:'Grafana signing secret cannot be opened; configure it again'};
export async function grafanaSigning(c:any,source:IntakeSource) {
  const row=await c.env.DB.prepare('SELECT signing_custody FROM oc_intake_credentials WHERE source=?').bind(source.id).first();
  const ciphertext=source.provider==='grafana'?row?.signing_custody??null:null;
  return {ciphertext,key:ciphertext?await openCredential(ciphertext,runtimeBindings(c.env).SESSION_SECRET!,grafanaCustody):null};
}
export async function verifyGrafana(c:any,deps:IntakeDependencies,state:State,source:IntakeSource,signature:string,expected:string,timestamp:string|null) {
  let reason='';
  if(timestamp!==null){try{freshTimestamp(timestamp);}catch{reason='Grafana signature timestamp is stale or invalid';}}
  if(!reason&&!equalSignature(signature.toLowerCase(),expected))reason='Grafana signature is required and must match';
  if(reason){await rejectIntake(c,deps,state,source,'grafana',reason);fail(reason,401);}
}
