import { auditIdentity, auditKind, forgetAuditIdentities } from '../audit-store'
import { fail, type State } from '../family/response-operations/domain'
import { syncErasureFences } from '../erasure-fence'
import { createPortability } from '../modules/portability/index.mjs'
import { portabilityPolicy } from '../portability-policy.mjs'
import { workspaceWrite } from '../workspace-store'
import { changeErasureIdentity } from './identity'
export { changeErasureIdentity } from './identity'

type Dependencies = {body:(c:any)=>Promise<any>;state:(c:any,admin?:boolean)=>Promise<State>;guard:(c:any)=>{sql:string;values:(string|number|null)[]}}
export function installChangeErasure(api:any,deps:Dependencies) {
 api.post('/api/changes/:id/erase',async(c:any)=>{
  const state=await deps.state(c,true),input=await deps.body(c),change=state.changes?.find(row=>row.id===c.req.param('id'))
  if(!change)fail('Unknown retained change',404)
  if(input.confirmation!==`erase ${change.id}`)fail('Type erase followed by the exact change ID',409)
  if(input.workspaceRevision!==state.revision)fail('Workspace changed; reload before erasing',409)
  const db=c.env.DB as D1Database,portability=await createPortability({db,policy:portabilityPolicy})
  const identity=await changeErasureIdentity(change.source,change.eventId)
  state.changes=state.changes!.filter(row=>row.id!==change.id)
  const source=state.changeSources!.find(row=>row.id===change.source)!
  const clearLast=source.lastAccepted?.id===change.id
  if(clearLast)delete source.lastAccepted
  ;(state.erasureFences??=[]).push({id:identity,epoch:0})
  const checkpoint=await portability.redactionStatements()
  // Transfer snapshots can contain any local category. Count the rows inside the
  // erasure transaction, then invalidate all copies rather than guessing which
  // chunks carry this event. The receipt contains counts only, after commit.
  const copies=(await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND (name GLOB 'rer_portability_snap_*' OR name GLOB 'rer_portability_stage_*') ORDER BY name").all<{name:string}>()).results.map(row=>row.name)
  const transfers=await portability.invalidateTransfersStatements()
  const tables=['oc_changes','oc_change_sources','oc_audit_identities','rer_portability_segments','rer_portability_parts','rer_portability_jobs',...copies]
  const counts=tables.map(name=>db.prepare(`SELECT COUNT(*) AS n FROM "${name.replaceAll('"','""')}"`))
  auditKind(db,'change.erase');auditIdentity(db,{subject:{kind:'change',id:change.id},source:{kind:'change-source',id:change.source}})
  const token=crypto.randomUUID(),writes=workspaceWrite(db,state,state.revision,deps.guard(c),token)
  const result=await db.batch([...counts,...writes,
   db.prepare(`INSERT INTO rer_erasure_guard(value) SELECT CASE WHEN
    (SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND (name GLOB 'rer_portability_snap_*' OR name GLOB 'rer_portability_stage_*'))=?
    AND NOT EXISTS(SELECT 1 FROM sqlite_master WHERE type='table' AND (name GLOB 'rer_portability_snap_*' OR name GLOB 'rer_portability_stage_*') AND name NOT IN (SELECT value FROM json_each(?)))
    THEN 1 ELSE 0 END`).bind(copies.length,JSON.stringify(copies)),
   // A lost workspace/authority race must abort the entire batch, including
   // journals, transfer invalidation and identity unlinking.
   db.prepare('INSERT INTO rer_erasure_guard(value) SELECT CASE WHEN EXISTS(SELECT 1 FROM workspace_control WHERE id=1 AND write_token=?) THEN 1 ELSE 0 END').bind(token),
   ...checkpoint,db.prepare(syncErasureFences),...transfers,...forgetAuditIdentities(db,[change.id]),
   db.prepare('DELETE FROM rer_erasure_guard'),
   ...tables.filter(name=>!copies.includes(name)).map(name=>db.prepare(`SELECT COUNT(*) AS n FROM "${name}"`))]).catch((error:unknown)=>{
   if(/CHECK constraint failed: value=1/.test(String(error)))fail('Workspace, authority or transfer custody changed; nothing was erased. Reload and retry.',409)
   throw error
  })
  const after=result.slice(result.length-(tables.length-copies.length))
  const stores=Object.fromEntries(tables.map((name,index)=>[name,{deleted:copies.includes(name)?Number((result[index].results[0] as any).n):Math.max(0,Number((result[index].results[0] as any).n)-Number((after[index].results[0] as any).n)),updated:name==='oc_change_sources'&&clearLast?1:0}]))
  return c.json({state:'complete',stores,standby:'not-reconciled'})
 })
}
