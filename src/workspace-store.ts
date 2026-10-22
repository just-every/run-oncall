import { restoreErasureFences, erasureFencesQuery } from './erasure-fence'
import { storedReceipt, nativePrefixWrites } from './native-prefix-store'
import { authoredWorkspace } from './workspace-profile'
import { empty, fail, type State } from './family/response-operations/domain'

const tables = {keyAllowances:'oc_key_allowances',apiClients:'oc_api_clients',apiEndpoints:'oc_api_endpoints',apiOperations:'oc_api_operations',apiOutbox:'oc_api_outbox',members:'oc_members', services:'oc_services', policies:'oc_policies', events:'oc_events', alerts:'oc_alerts', incidents:'oc_incidents', audit:'oc_audit', triage:'oc_triage', changes:'oc_changes', changeSources:'oc_change_sources', intakeSources:'oc_intake_sources', intakeReceipts:'oc_intake_receipts', emailAddresses:'oc_email_addresses', emailRules:'oc_email_rules', emailSamples:'oc_email_samples', emailReceipts:'oc_email_receipts', emailQuarantine:'oc_email_quarantine'} as const
const collections = Object.keys(tables) as (keyof typeof tables)[]
// D1 batch reads share one transaction. Individual records avoid a whole-
// workspace SQL cell and do not depend on SQLite's compound-SELECT limit.
export const workspaceQueries = [`SELECT 'erasureFences' AS collection,0 AS ordinal,json_object('id',id,'epoch',epoch) AS data FROM (${erasureFencesQuery}) ORDER BY id`,"SELECT 'control' AS collection,0 AS ordinal,json_object('revision',revision) AS data FROM workspace_control WHERE id=1",...collections.map(key=>`SELECT '${key}' AS collection,ordinal,data AS data FROM ${tables[key]} ORDER BY ordinal`)]
type Snapshot=Map<string,{ordinal:number;data:string}>
const snapshots=new WeakMap<State,Map<string,Snapshot>>()
export function decodeWorkspace(rows:{collection:string;ordinal:number;data:string}[]):State {
  const control=rows.find(row=>row.collection==='control')
  const state=empty(),previous=new Map<string,Snapshot>(collections.map(key=>[key,new Map()]))
  if(control)state.revision=JSON.parse(control.data).revision
  if(!Number.isSafeInteger(state.revision)||state.revision<0)fail('Stored workspace revision is inconsistent',503)
  for(const row of rows) {
    if(row.collection==='control')continue
    if(row.collection==='erasureFences'){(state.erasureFences??=[]).push(JSON.parse(row.data));continue}
    const key=row.collection as keyof typeof tables,value=JSON.parse(row.data)
    ;((state as any)[key]??=[]).push(value)
    previous.get(key)!.set(value.id,{ordinal:row.ordinal,data:row.data})
  }
  snapshots.set(state,previous)
  return state
}
export async function loadWorkspace(db:D1Database):Promise<State> {
  return decodeWorkspace((await db.batch<{collection:string;ordinal:number;data:string}>(workspaceQueries.map(query=>db.prepare(query)))).flatMap(result=>result.results))
}
export function workspaceRows(db:D1Database,state:State,token:string):D1PreparedStatement[] {
  const gate = 'EXISTS(SELECT 1 FROM workspace_control WHERE id=1 AND write_token=?)'
  const previous=snapshots.get(state)
  const statements=collections.flatMap(key => {
    const rows=(state[key]??[]).map((row,ordinal)=>({id:row.id,ordinal,data:JSON.stringify(key==='intakeReceipts'?storedReceipt(row as import('./intake/model').IntakeReceipt):row)}))
    const old=previous?.get(key),ids=new Set(rows.map(row=>row.id)),removed=old?[...old.keys()].filter(id=>!ids.has(id)):undefined
    const writes:D1PreparedStatement[]=[]
    if(removed?.length)writes.push(db.prepare(`DELETE FROM ${tables[key]} WHERE id IN (SELECT value FROM json_each(?)) AND ${gate}`).bind(JSON.stringify(removed),token))
    if(!old)writes.push(db.prepare(`DELETE FROM ${tables[key]} WHERE id NOT IN (SELECT value FROM json_each(?)) AND ${gate}`).bind(JSON.stringify([...ids]),token))
    const changed=rows.filter(row=>!old||old.get(row.id)?.data!==row.data||old.get(row.id)?.ordinal!==row.ordinal)
    // Bounded parameters and by-id updates preserve unchanged rows and their custody.
    for(let i=0;i<changed.length;i+=32)writes.push(db.prepare(`INSERT INTO ${tables[key]}(id,ordinal,data) SELECT json_extract(value,'$.id'),json_extract(value,'$.ordinal'),json_extract(value,'$.data') FROM json_each(?) WHERE ${gate} ON CONFLICT(id) DO UPDATE SET ordinal=excluded.ordinal,data=excluded.data WHERE ordinal<>excluded.ordinal OR data<>excluded.data`).bind(JSON.stringify(changed.slice(i,i+32)),token))
    return writes
  })
  return [...statements,restoreErasureFences(db,state,token),...nativePrefixWrites(db,state.intakeReceipts??[],token,previous&&new Set(previous.get('intakeReceipts')?.keys()))]
}
export function workspaceWrite(db:D1Database,state:State,revision:number,authority:{sql:string;values:(string|number|null)[]},token=crypto.randomUUID()) {
  state.revision = revision + 1
  checkWorkspaceSize(state)
  return [db.prepare(`UPDATE workspace_control SET revision=?,write_token=? WHERE id=1 AND revision=? AND ${authority.sql}`).bind(state.revision,token,revision,...authority.values),...workspaceRows(db,state,token)]
}

export function checkWorkspaceSize(state: State) {
  // Outbox history has its own provenance/field bounds. Charging it to the
  // authored workspace would let delivery backlog refuse human coordination.
  if(new TextEncoder().encode(JSON.stringify(authoredWorkspace(state))).length>1000000) fail('Workspace storage profile exceeded; export before extending it',429)
}
