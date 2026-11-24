import {stopOnCall} from './family/response-operations/on-call-notifications/model';
import {stopRecoveredDeadlines} from './incident-deadlines/model';
import { refreshBusinessStatus } from './business-status/model';
import { restoreErasureFences, erasureFencesQuery } from './erasure-fence'
import { storedReceipt, nativePrefixWrites } from './native-prefix-store'
import { authoredWorkspace } from './workspace-profile'
import { empty, fail, type State } from './family/response-operations/domain'
import { readTracked, type TrackedRead } from './read-cache'
import { workspaceTables as tables, type WorkspaceCollection } from './workspace-tables'

const collections = Object.keys(tables) as WorkspaceCollection[]
type StoredRecord = {collection:string;ordinal:number;data:string}
export const erasureFenceRead = `SELECT 'erasureFences' AS collection,0 AS ordinal,json_object('id',id,'epoch',epoch) AS data FROM (${erasureFencesQuery}) ORDER BY id`
/** Stored records for decodeWorkspace from one tracked read and its erasure-fence rows. */
export function workspaceRecords(read:TrackedRead,fences:D1Result<any>|undefined,keys:readonly WorkspaceCollection[]=collections):StoredRecord[] {
  const control=read.rows('workspace_control')[0]
  return [
    ...(fences?.results??[]),
    ...(control?[{collection:'control',ordinal:0,data:JSON.stringify({revision:control.revision})}]:[]),
    ...keys.flatMap(key=>read.rows(tables[key]).map(row=>({collection:key,ordinal:row.ordinal,data:row.data}))),
  ]
}
export type WorkspaceReadRevisions = {workspaceRevision: number | null; pagingRevision: number | null};

const pagingRevisionQuery = 'SELECT revision FROM paging_control WHERE id=1';

export function workspaceRevisionColumns(coverage: boolean) {
  return `(SELECT revision FROM workspace_control WHERE id=1) AS workspaceRevision,
    ${coverage ? `(${pagingRevisionQuery})` : 'NULL'} AS pagingRevision`;
}

type Snapshot=Map<string,{ordinal:number;data:string}>
const snapshots=new WeakMap<State,Map<string,Snapshot>>()
type MutationCounts=Record<string,{deleted:number;updated:number;inserted:number}>
const mutationCounts=new WeakMap<State,MutationCounts>()
export const workspaceMutationCounts=(state:State)=>mutationCounts.get(state)??{}
export function decodeWorkspace(rows:StoredRecord[]):State {
  const control=rows.find(row=>row.collection==='control')
  const state=empty(),previous=new Map<string,Snapshot>(collections.map(key=>[key,new Map()]))
  if(control)state.revision=JSON.parse(control.data).revision
  if(!Number.isSafeInteger(state.revision)||state.revision<0)fail('Stored workspace revision is inconsistent',503)
  for(const row of rows) {
    if(row.collection==='control')continue
    if(row.collection==='erasureFences'){(state.erasureFences??=[]).push(JSON.parse(row.data));continue}
    const key=row.collection as WorkspaceCollection,parsed=JSON.parse(row.data)
    // Legacy embedded evidence stays in storage, never in ordinary API/UI reads.
    const value=key==='intakeReceipts'?storedReceipt(parsed):parsed
    ;((state as any)[key]??=[]).push(value)
    previous.get(key)!.set(value.id,{ordinal:row.ordinal,data:row.data})
  }
  snapshots.set(state,previous)
  return state
}
export async function loadWorkspace(db:D1Database):Promise<State> {
  const read=await readTracked(db,[db.prepare(erasureFenceRead)])
  return decodeWorkspace(workspaceRecords(read,read.extras[0]))
}
export function inheritWorkspaceSnapshot(next:State,previous:State):State {const snapshot=snapshots.get(previous);if(snapshot)snapshots.set(next,snapshot);return next}
export function workspaceRows(db:D1Database,state:State,token:string):D1PreparedStatement[] {
  const gate = 'EXISTS(SELECT 1 FROM workspace_control WHERE id=1 AND write_token=?)'
  const previous=snapshots.get(state),counts:MutationCounts={}
  for(const alert of state.alerts){
    const old=previous?.get('alerts')?.get(alert.id),prior=old?JSON.parse(old.data):undefined;
    const withoutRevision=({revision,...row}:typeof alert)=>JSON.stringify(row);
    if(prior&&withoutRevision(prior)!==withoutRevision(alert))alert.revision=Math.max(alert.revision??1,(prior.revision??1)+1);
    else if(prior?.revision!==undefined)alert.revision??=prior.revision;
  }
  const statements=collections.flatMap(key => {
    const rows=(state[key]??[]).map((row,ordinal)=>({id:row.id,ordinal,data:JSON.stringify(key==='intakeReceipts'?storedReceipt(row as import('./intake/model').IntakeReceipt):row)}))
    const old=previous?.get(key),ids=new Set(rows.map(row=>row.id)),removed=old?[...old.keys()].filter(id=>!ids.has(id)):undefined
    const writes:D1PreparedStatement[]=[]
    if(removed?.length)writes.push(db.prepare(`DELETE FROM ${tables[key]} WHERE id IN (SELECT value FROM json_each(?)) AND ${gate}`).bind(JSON.stringify(removed),token))
    if(!old)writes.push(db.prepare(`DELETE FROM ${tables[key]} WHERE id NOT IN (SELECT value FROM json_each(?)) AND ${gate}`).bind(JSON.stringify([...ids]),token))
    const inserted=rows.filter(row=>!old?.has(row.id)).length,updated=rows.filter(row=>old?.has(row.id)&&old.get(row.id)!.data!==row.data).length
    if(removed?.length||inserted||updated)counts[tables[key]]={deleted:removed?.length??0,inserted,updated}
    const changed=rows.filter(row=>!old||old.get(row.id)?.data!==row.data||old.get(row.id)?.ordinal!==row.ordinal)
    // Bounded parameters and by-id updates preserve unchanged rows and their custody.
    for(let i=0;i<changed.length;i+=32)writes.push(db.prepare(`INSERT INTO ${tables[key]}(id,ordinal,data) SELECT json_extract(value,'$.id'),json_extract(value,'$.ordinal'),json_extract(value,'$.data') FROM json_each(?) WHERE ${gate} ON CONFLICT(id) DO UPDATE SET ordinal=excluded.ordinal,data=excluded.data WHERE ordinal<>excluded.ordinal OR data<>excluded.data`).bind(JSON.stringify(changed.slice(i,i+32)),token))
    return writes
  })
  mutationCounts.set(state,counts)
  return [...statements,restoreErasureFences(db,state,token),...nativePrefixWrites(db,state.intakeReceipts??[],token,previous&&new Set(previous.get('intakeReceipts')?.keys()))]
}
export function workspaceWrite(db:D1Database,state:State,revision:number,authority:{sql:string;values:(string|number|null)[]},token=crypto.randomUUID()) {
  stopOnCall(state,Date.now())
  stopRecoveredDeadlines(state,new Date(Date.now()).toISOString())
  refreshBusinessStatus(state)
  state.revision = revision + 1
  checkWorkspaceSize(state)
  return [db.prepare(`UPDATE workspace_control SET revision=?,write_token=? WHERE id=1 AND revision=? AND ${authority.sql}`).bind(state.revision,token,revision,...authority.values),...workspaceRows(db,state,token)]
}

export function checkWorkspaceSize(state: State) {
  // Outbox history has its own provenance/field bounds. Charging it to the
  // authored workspace would let delivery backlog refuse human coordination.
  if(new TextEncoder().encode(JSON.stringify(authoredWorkspace(state))).length>1000000) fail('Workspace storage profile exceeded; export before extending it',429)
}
