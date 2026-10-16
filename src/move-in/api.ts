import { planD1Import,applyD1ImportBatches,resumeD1Import,undoD1Import,readD1ImportJob } from '../modules/import-kit/src/d1/index'
import type { D1ImportContext } from '../modules/import-kit/src/d1/types'
import { fileSource, type Vendor } from './source'
import { mapping } from './mapping'
import { installAdoption } from './adoption'
import { targets } from './target'
import { coverage } from '../family/response-operations/schedules'
import { fail } from '../family/response-operations/domain'
import { eraseImportedPerson } from './erasure'
import { mailbox } from './rotations'
import { duplicateTargets, alreadyImported, changedSinceImport, Refusal } from './refusals'
import { createMoveInJob } from './operation'
import { readMoveInJournal } from './journal'

export function installMoveIn(api:any,body:(c:any,max?:number)=>Promise<any>) {
 function context(c:any,vendor:Vendor):D1ImportContext {
  if(c.get('actor').role!=='admin')fail('Current admin required',403)
  if(!['opsgenie','pagerduty'].includes(vendor))fail('Choose Opsgenie or PagerDuty')
  return {destination:'oncall',namespace:vendor,mappingVersion:'oncall-move-in-1',batchSize:10,maxBatches:1,storage:{database:c.env.DB,targets},authorization:{principalId:c.get('actor').id,predicate(){return {sql:`EXISTS(SELECT 1 FROM oc_current_sessions s JOIN oc_members m ON m.id=s.member WHERE s.token=? AND s.member=? AND s.expires>? AND json_extract(m.data,'$.active')=1 AND json_extract(m.data,'$.role')='admin')`,params:[c.get('sessionDigest'),c.get('actor').id,Date.now()]}}}}
 }
 for(const action of ['preview','apply'])api.post(`/api/move-in/${action}`,async(c:any)=>{
  const input=await body(c,1024*1024),ctx=context(c,input.vendor)
  if(typeof input.source!=='string')fail('Supply the saved export file as text')
  const source=await fileSource(input.vendor,input.source,input.filename),map=mapping(input.vendor,source,Date.now())
  const plan=await planD1Import(source,map,ctx).catch(error=>{throw (error as Error).message==='DUPLICATE_TARGET'?duplicateTargets(source,map):error})
  if(action==='preview')return c.json({fingerprint:plan.fingerprint,counts:plan.counts,diagnostics:plan.diagnostics,items:plan.entries.map(e=>({kind:e.source.kind,id:e.source.sourceId,location:e.source.location,name:(e.source.payload as any).fullName??(e.source.payload as any).name??(e.source.payload as any).summary??(e.source.payload as any).username??(e.source.payload as any).email??e.source.sourceId,rejection:e.rejection,unmapped:e.unmapped,effects:e.effects})),paging:'OFF',writes:0})
  if(input.confirm!==true||input.fingerprint!==plan.fingerprint)fail('Review this exact preview and confirm before applying',409)
  const job=await createMoveInJob(plan,{...ctx,reviewedFingerprint:input.fingerprint},input.operationKey)
  try{return c.json(await applyD1ImportBatches(job.id,ctx))}
  catch(error){
   if((error as Error).message==='TARGET_REVISION_CONFLICT')throw await alreadyImported(c.env.DB,plan,input.vendor,job.id)
   if((error as Error).message==='IMPORT_ALREADY_REVERSING') {
    const current=await readD1ImportJob(job.id,ctx),done=['undone','rolled_back'].includes(current.state)
    throw new Refusal(409,done?'This import was undone while you confirmed it. Press Preview import, then Confirm paused import to import the same file again.':'This import is being undone or rolled back. Choose it in Saved import journal and continue the reversal until it finishes, then preview and confirm the file again.',done?'IMPORT_UNDONE':'IMPORT_REVERSAL_IN_PROGRESS')
   }
   throw error
  }
 })
 for(const action of ['resume','undo','status'])api.post(`/api/move-in/:id/${action}`,async(c:any)=>{
  const input=await body(c),ctx=context(c,input.vendor)
  if(action==='undo'&&input.confirm!==true)fail('Confirm import undo',409)
  try{return c.json(await (action==='resume'?resumeD1Import:action==='undo'?undoD1Import:readD1ImportJob)(c.req.param('id'),ctx))}
  catch(error){throw (error as Error).message==='NATIVE_EDIT_CONFLICT'?await changedSinceImport(c.env.DB,c.req.param('id')):error}
 })
 api.get('/api/move-in/jobs',async(c:any)=>{
  const ctx=context(c,c.req.query('vendor')??'opsgenie'),auth=ctx.authorization.predicate('read','oncall')
  const rows=await c.env.DB.prepare(`SELECT id FROM ik_jobs WHERE destination='oncall' AND namespace=? AND principal_id=? AND (${auth.sql}) ORDER BY rowid DESC`).bind(ctx.namespace,ctx.authorization.principalId,...auth.params!).all()
  return c.json(await Promise.all(rows.results.map((row:any)=>readMoveInJournal(row.id,ctx))))
 })
 api.get('/api/move-in/objects',async(c:any)=>{const ctx=context(c,'opsgenie');const auth=ctx.authorization.predicate('read','oncall');const row=await c.env.DB.prepare(`SELECT CASE WHEN (${auth.sql}) THEN 1 ELSE 0 END AS ok`).bind(...auth.params!).first();if(!row?.ok)fail('Current admin required',403);return c.json(await targets.list(c.env.DB,'oncall'))})
 api.post('/api/move-in/coverage',async(c:any)=>{
  const input=await body(c),ctx=context(c,input.vendor);const auth=ctx.authorization.predicate('read','oncall');const ok=await c.env.DB.prepare(`SELECT CASE WHEN (${auth.sql}) THEN 1 ELSE 0 END AS ok`).bind(...auth.params!).first();if(!ok?.ok)fail('Current admin required',403)
  const rows=await targets.list(c.env.DB,'oncall'),row=rows.find(r=>r.targetKind==='schedule'&&r.targetId===input.id);if(!row)fail('Unknown imported schedule',404)
  const users=rows.filter(r=>r.targetKind==='user').map(r=>({id:r.targetId,name:(r.value as any).name,active:true,role:'responder'}))
  return c.json({paused:true,paging:'OFF',coverage:coverage((row.value as any).schedule,users,Date.parse(input.at)),users})
 })
 installAdoption(api,body)
 // Erasing a person is destructive and final: administrator only, exact email, typed confirmation.
 api.post('/api/move-in/erase',async(c:any)=>{
  const input=await body(c),ctx=context(c,'opsgenie')
  let email:string;try{email=mailbox(input.email)}catch{fail('Supply the exact email of an imported person')}
  if(input.confirmation!==`erase ${email}`)fail(`Type "erase ${email}" to confirm`,409)
  return c.json(await eraseImportedPerson(ctx,email))
 })
}
