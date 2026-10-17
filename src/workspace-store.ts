import { empty, fail, type State } from './family/response-operations/domain'

const tables = {members:'oc_members', services:'oc_services', policies:'oc_policies', events:'oc_events', alerts:'oc_alerts', incidents:'oc_incidents', audit:'oc_audit', triage:'oc_triage', changes:'oc_changes', changeSources:'oc_change_sources', intakeSources:'oc_intake_sources', intakeReceipts:'oc_intake_receipts'} as const
const collections = Object.keys(tables) as (keyof typeof tables)[]
const optional = new Set(['triage', 'changes', 'changeSources', 'intakeSources', 'intakeReceipts'])
const rowsJson = (key: keyof typeof tables) => `json(COALESCE((SELECT json_group_array(json(data)) FROM (SELECT data FROM ${tables[key]} ORDER BY ordinal)),'[]'))`
const core = `json_object('schemaVersion',1,'revision',revision,${collections.filter(key => !optional.has(key)).map(key => `'${key}',${rowsJson(key)}`).join(',')})`
const document = collections.filter(key => optional.has(key)).reduce((result,key) => `json_patch(${result},CASE WHEN EXISTS(SELECT 1 FROM ${tables[key]}) THEN json_object('${key}',${rowsJson(key)}) ELSE '{}' END)`, core)
// One SQL snapshot keeps original entity and nested history order.
export const workspaceQuery = `SELECT id,revision,write_token,${document} AS data FROM workspace_control WHERE id=1`
export async function loadWorkspace(db:D1Database):Promise<State> {
  const row = await db.prepare(workspaceQuery).first<{data:string}>()
  return row ? JSON.parse(row.data) : empty()
}
export function workspaceRows(db:D1Database,state:State,token:string):D1PreparedStatement[] {
  const gate = 'EXISTS(SELECT 1 FROM workspace_control WHERE id=1 AND write_token=?)'
  return collections.flatMap(key => [
    db.prepare(`DELETE FROM ${tables[key]} WHERE ${gate}`).bind(token),
    db.prepare(`INSERT INTO ${tables[key]}(id,ordinal,data) SELECT json_extract(value,'$.id'),CAST(key AS INTEGER),value FROM json_each(?) WHERE ${gate}`).bind(JSON.stringify(state[key] ?? []),token),
  ])
}
export function workspaceWrite(db:D1Database,state:State,revision:number,authority:{sql:string;values:(string|number|null)[]},token=crypto.randomUUID()) {
  state.revision = revision + 1
  checkWorkspaceSize(state)
  return [db.prepare(`UPDATE workspace_control SET revision=?,write_token=? WHERE id=1 AND revision=? AND ${authority.sql}`).bind(state.revision,token,revision,...authority.values),...workspaceRows(db,state,token)]
}

export function checkWorkspaceSize(state: State) {
  if(new TextEncoder().encode(JSON.stringify(state)).length>1000000) fail('Workspace storage profile exceeded; export before extending it',429)
}
