import { installMoveInRead } from './read-api'
import {isVendor} from './vendor-formats'
import { resumeD1Import,undoD1Import,readD1ImportJob } from '../modules/import-kit/src/d1/index'
import type { D1ImportContext } from '../modules/import-kit/src/d1/types'
import type { Vendor } from './source'
import { installAdoption } from './adoption'
import { targets } from './target'
import { coverage } from '../family/response-operations/schedules'
import { fail } from '../family/response-operations/domain'
import { eraseImportedPerson } from './erasure'
import { mailbox } from './rotations'
import { changedSinceImport, Refusal } from './refusals'
import { readMoveInJournal } from './journal'
import { readImportDoorHistory } from '../modules/import-kit/src/door/index'
import { IMPORT_DOOR_KEY } from './door-key'
import { adminSession, ownerImport } from './owner-door'
import { expireInterruptedImports, importAttempt } from './import-lifecycle'

export function installMoveIn(api:any,body:(c:any,max?:number)=>Promise<any>) {
 function context(c:any,vendor:Vendor):D1ImportContext {
  if(c.get('actor').role!=='admin')fail('Current admin required',403)
  if(!isVendor(vendor))fail('Choose a supported saved-export source')
  return {destination:'oncall',namespace:vendor,mappingVersion:'oncall-move-in-1',batchSize:10,maxBatches:1,storage:{database:c.env.DB,targets},authorization:{principalId:c.get('actor').id,predicate(){return adminSession(c.get('sessionDigest'),c.get('actor').id)}}}
 }
 // The move-in screen's one import path: Base's owner-session door, under the allow-list Business uses.
 api.all('/api/operator/import/*',(c:any)=>ownerImport(c))
 // Imports made before the import door keep their journal routes: read, resume and undo.
 // A door import, the owner's or Business's, continues and undoes only through the door.
 for(const action of ['resume','undo','status'])api.post(`/api/move-in/:id/${action}`,async(c:any)=>{
  const input=await body(c),ctx=context(c,input.vendor)
  await expireInterruptedImports(c.env.DB)
  const door=await c.env.DB.prepare(`SELECT j.namespace FROM ik_jobs j JOIN ik_door_plans p ON p.job_id=j.id
   WHERE j.id=? AND j.principal_id=? AND p.namespace=? AND p.installation_id=?`).bind(c.req.param('id'),ctx.authorization.principalId,input.vendor,IMPORT_DOOR_KEY).first()
  if(door&&action!=='status')throw new Refusal(409,'This import runs through the import door. Choose it in Saved import journal to undo it; a failed import needs a new preview and confirmation.','IMPORT_DOOR_JOB')
  if(door)ctx.namespace=door.namespace
  if(action==='undo'&&input.confirm!==true)fail('Confirm import undo',409)
  const attempt=action==='resume'?importAttempt(c.env.DB,{jobId:c.req.param('id')}):undefined
  if(attempt)ctx.storage={...ctx.storage,database:attempt.database}
  try{const result=await (action==='resume'?resumeD1Import:action==='undo'?undoD1Import:readD1ImportJob)(c.req.param('id'),ctx);await attempt?.finish(true);return c.json(result)}
  catch(error){throw (error as Error).message==='NATIVE_EDIT_CONFLICT'?await changedSinceImport(c.env.DB,c.req.param('id'))??error:error}
 })
 api.get('/api/move-in/jobs',async(c:any)=>{
  const ctx=context(c,c.req.query('vendor')??'opsgenie'),auth=ctx.authorization.predicate('read','oncall')
  await expireInterruptedImports(c.env.DB)
  const history=await readImportDoorHistory(c.env.DB,IMPORT_DOOR_KEY,auth)
  const rows=await c.env.DB.prepare(`SELECT j.id,j.namespace FROM ik_jobs j WHERE destination='oncall' AND principal_id=?
   AND (namespace=? OR EXISTS(SELECT 1 FROM ik_door_plans p WHERE p.job_id=j.id AND p.namespace=? AND p.installation_id=?))
   AND (${auth.sql}) ORDER BY j.rowid DESC`).bind(ctx.authorization.principalId,ctx.namespace,ctx.namespace,IMPORT_DOOR_KEY,...auth.params!).all()
  // Owner and Business door imports list together, each with its approval: "approved by" or "approved via Business by".
  return c.json(await Promise.all(rows.results.map(async(row:any)=>{
   const approved=history.find(item=>item.jobId===row.id)
   return {...await readMoveInJournal(row.id,{...ctx,namespace:row.namespace}),vendor:ctx.namespace,approval:approved?.caption,
    door:approved?{planId:approved.planId,fingerprint:approved.fingerprint,business:approved.reviewer===approved.approvalRecordId}:undefined}
  })))
 })
 api.get('/api/move-in/objects',async(c:any)=>{const ctx=context(c,'opsgenie');const auth=ctx.authorization.predicate('read','oncall');const row=await c.env.DB.prepare(`SELECT CASE WHEN (${auth.sql}) THEN 1 ELSE 0 END AS ok`).bind(...auth.params!).first();if(!row?.ok)fail('Current admin required',403);return c.json(await targets.list(c.env.DB,'oncall'))})
 api.post('/api/move-in/coverage',async(c:any)=>{
  const input=await body(c),ctx=context(c,input.vendor);const auth=ctx.authorization.predicate('read','oncall');const ok=await c.env.DB.prepare(`SELECT CASE WHEN (${auth.sql}) THEN 1 ELSE 0 END AS ok`).bind(...auth.params!).first();if(!ok?.ok)fail('Current admin required',403)
  const rows=await targets.list(c.env.DB,'oncall'),row=rows.find(r=>r.targetKind==='schedule'&&r.targetId===input.id);if(!row)fail('Unknown imported schedule',404)
  const users=rows.filter(r=>r.targetKind==='user').map(r=>({id:r.targetId,name:(r.value as any).name,active:true,role:'responder'}))
  return c.json({paused:true,paging:'OFF',coverage:coverage((row.value as any).schedule,users,Date.parse(input.at)),users})
 })
 installMoveInRead(api)
 installAdoption(api,body)
 // Erasing a person is destructive and final: administrator only, exact email, typed confirmation.
 api.post('/api/move-in/erase',async(c:any)=>{
  const input=await body(c),ctx=context(c,'opsgenie')
  let email:string;try{email=mailbox(input.email)}catch{fail('Supply the exact email of an imported person')}
  if(input.confirmation!==`erase ${email}`)fail(`Type "erase ${email}" to confirm`,409)
  return c.json(await eraseImportedPerson(ctx,email))
 })
}
