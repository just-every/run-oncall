import { workspaceQuery } from './workspace-store'
import { parseHandoffRow } from './handoff-store'
import { fail, type State } from './family/response-operations/domain'
import { pause, type EscalationJob, type SyntheticReceipt } from './family/response-operations/escalation'
import type { Schedule } from './family/response-operations/schedules'
import type { EscalationPolicy } from './family/response-operations/escalation'
import type { PagingArchive, PagingCallback } from './family/response-operations/paging-archive'

export type PagingSnapshot = { revision:number, workspace:State, archive:PagingArchive }
export async function pagingSnapshot(db:D1Database):Promise<PagingSnapshot> {
  const tables=['paging_control','workspace','paging_schedules','paging_policies','paging_jobs','paging_receipts','paging_callbacks']
  const rows=await db.batch(tables.map(table=>db.prepare(table==='workspace'?workspaceQuery:`SELECT * FROM ${table} ORDER BY rowid`)))
  return decodePagingRows(rows)
}
function decodePagingRows(rows:D1Result<unknown>[]):PagingSnapshot {
  const control:any=rows[0].results[0]
  if(!control) fail('Critical scheduling storage missing',503)
  const workspace:any=rows[1].results[0]
  if(!workspace) fail('Create the local workspace first',409)
  const state:State=JSON.parse(workspace.data)
  if(!Number.isSafeInteger(control.revision)||control.revision<0||state.revision!==workspace.revision)
    fail('Stored scheduling/workspace revisions are inconsistent',503)
  const values=(index:number)=>rows[index].results.map((r:any)=>JSON.parse(r.data))
  return { revision:control.revision,workspace:state,archive:{schemaVersion:1,mode:'synthetic-only',schedules:values(2),policies:values(3),jobs:values(4),receipts:values(5),callbacks:values(6)} }
}
/** Recovery alone joins communications; paging dispatch never depends on it. */
export async function recoverySnapshot(db:D1Database) {
  const tables=['paging_control','workspace','paging_schedules','paging_policies','paging_jobs','paging_receipts','paging_callbacks','handoff_state']
  const rows=await db.batch(tables.map(table=>db.prepare(table==='workspace'?workspaceQuery:`SELECT * FROM ${table} ORDER BY rowid`)))
  return {...decodePagingRows(rows),handoffs:await parseHandoffRow(rows[7].results[0])}
}
export function bound(archive:PagingArchive) {
  for(const [key,max] of Object.entries({schedules:64,policies:64,jobs:256,receipts:512,callbacks:2048}))
    if((archive as any)[key].length>max) fail(`Local ${key} limit reached; export and extend the profile`,429)
  if(new TextEncoder().encode(JSON.stringify(archive)).length>4*1024*1024) fail('Local scheduling archive limit (4 MiB) reached',429)
  for(const job of archive.jobs) if(new TextEncoder().encode(JSON.stringify(job)).length>128*1024) fail('Local job evidence limit (128 KiB) reached',429)
}
const gate='EXISTS(SELECT 1 FROM paging_control WHERE id=1 AND write_token=?)'
export type Mutation = (token:string)=>D1PreparedStatement[]
export type PagingAuthority = {digest:string;member:string}
export async function commitPaging(db:D1Database,s:PagingSnapshot,archive:PagingArchive,mutation:Mutation,authority?:PagingAuthority) {
  bound(archive)
  const token=crypto.randomUUID()
  const result=await db.batch([
    db.prepare('UPDATE paging_control SET revision=revision+1,write_token=? WHERE id=1 AND revision=? AND EXISTS(SELECT 1 FROM workspace_control WHERE id=1 AND revision=?)'+(authority?' AND EXISTS(SELECT 1 FROM oc_current_sessions WHERE token=? AND member=? AND expires>?)':''))
      .bind(token,s.revision,s.workspace.revision,...(authority?[authority.digest,authority.member,Date.now()]:[])),
    ...mutation(token),
  ])
  if(result[0].meta.changes!==1) fail('Workspace or scheduling state changed; reload and retry',409)
  return result
}
export function putSchedule(db:D1Database,s:Schedule,token:string) {
  return db.prepare(`INSERT INTO paging_schedules(id,revision,data) SELECT ?,?,? WHERE ${gate} ON CONFLICT(id) DO UPDATE SET revision=excluded.revision,data=excluded.data`).bind(s.id,s.revision,JSON.stringify(s),token)
}
export function putPolicy(db:D1Database,p:EscalationPolicy,token:string) {
  return db.prepare(`INSERT INTO paging_policies(service,revision,data) SELECT ?,?,? WHERE ${gate} ON CONFLICT(service) DO UPDATE SET revision=excluded.revision,data=excluded.data`).bind(p.service,p.revision,JSON.stringify(p),token)
}
export function putJob(db:D1Database,j:EscalationJob,token:string) {
  return db.prepare(`INSERT INTO paging_jobs(id,incident,service,revision,status,next_due,write_token,data) SELECT ?,?,?,?,?,?,?,? WHERE ${gate} ON CONFLICT(id) DO UPDATE SET revision=excluded.revision,status=excluded.status,next_due=excluded.next_due,write_token=excluded.write_token,data=excluded.data`).bind(j.id,j.incident,j.service,j.revision,j.status,j.nextDue,token,JSON.stringify(j),token)
}
export function putReceipt(db:D1Database,r:SyntheticReceipt,token:string) {
  return db.prepare(`INSERT INTO paging_receipts(id,job_id,data) SELECT ?,?,? WHERE ${gate} ON CONFLICT(id) DO NOTHING`).bind(r.id,r.jobId,JSON.stringify(r),token)
}
export function putCallback(db:D1Database,r:PagingCallback,token:string) {
  return db.prepare(`INSERT INTO paging_callbacks(id,key,data) SELECT ?,?,? WHERE ${gate}`).bind(r.id,r.key,JSON.stringify(r),token)
}
export function replaceArchive(db:D1Database,a:PagingArchive,token:string):D1PreparedStatement[] {
  const statements=['paging_callbacks','paging_receipts','paging_jobs','paging_policies','paging_schedules'].map(t=>db.prepare(`DELETE FROM ${t} WHERE ${gate}`).bind(token))
  const inserts:[string,string,string[],unknown[]][]=[
    ['paging_schedules','id,revision,data',["json_extract(value,'$.id')","json_extract(value,'$.revision')",'value'],a.schedules],
    ['paging_policies','service,revision,data',["json_extract(value,'$.service')","json_extract(value,'$.revision')",'value'],a.policies],
    ['paging_jobs','id,incident,service,revision,status,next_due,write_token,data',["json_extract(value,'$.id')","json_extract(value,'$.incident')","json_extract(value,'$.service')","json_extract(value,'$.revision')","json_extract(value,'$.status')","json_extract(value,'$.nextDue')",'?', 'value'],a.jobs],
    ['paging_receipts','id,job_id,data',["json_extract(value,'$.id')","json_extract(value,'$.jobId')",'value'],a.receipts],
    ['paging_callbacks','id,key,data',["json_extract(value,'$.id')","json_extract(value,'$.key')",'value'],a.callbacks],
  ]
  for(const [table,columns,expressions,values] of inserts) {
    const binds=table==='paging_jobs'?[token,JSON.stringify(values),token]:[JSON.stringify(values),token]
    statements.push(db.prepare(`INSERT INTO ${table}(${columns}) SELECT ${expressions.join(',')} FROM json_each(?) WHERE ${gate}`).bind(...binds))
  }
  return statements
}
/** Called BEFORE coordination restore; its revision becomes part of that restore's CAS. */
export async function prepareCoordinationRestore(db:D1Database,at:number,supplied?:PagingSnapshot) {
  const s=supplied??await pagingSnapshot(db)
  const jobs=s.archive.jobs.filter(j=>j.status==='pending').map(j=>pause(j,'Coordination archive restore; explicit resume required',Math.max(at,j.lastEvaluatedAt)))
  const paused=new Map(jobs.map(job=>[job.id,job]))
  // Restore must not bypass the same storage profile enforced by module writes.
  // A capacity refusal occurs before the coordination transaction is assembled.
  bound({...s.archive,jobs:s.archive.jobs.map(job=>paused.get(job.id)??job)})
  return {revision:s.revision, statements:(token:string)=>[
    db.prepare('UPDATE paging_control SET revision=revision+1,write_token=? WHERE id=1 AND revision=? AND EXISTS(SELECT 1 FROM workspace_control WHERE id=1 AND write_token=?)').bind(token,s.revision,token),
    ...jobs.map(j=>putJob(db,j,token)),
  ]}
}
/** Paired restore shares the coordination transaction and its unique write token. */
export function prepareCheckpointReplacement(db:D1Database,s:PagingSnapshot,archive:PagingArchive) {
  bound(archive)
  return {revision:s.revision,statements:(token:string)=>[
    db.prepare('UPDATE paging_control SET revision=revision+1,write_token=? WHERE id=1 AND revision=? AND EXISTS(SELECT 1 FROM workspace_control WHERE id=1 AND write_token=?)').bind(token,s.revision,token),
    ...replaceArchive(db,archive,token),
  ]}
}
export function canonical(value:unknown):string {
  if(Array.isArray(value)) return '['+value.map(canonical).join(',')+']'
  if(value&&typeof value==='object') return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical((value as any)[k])).join(',')+'}'
  return JSON.stringify(value)
}
