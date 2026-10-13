import { empty, fail, type State } from './family/response-operations/domain'

const collections = ['members', 'services', 'policies', 'events', 'alerts', 'incidents', 'audit'] as const
// A single SQL snapshot retains array order while storage is one row per entity.
export const workspaceQuery = `SELECT id,revision,write_token,json_object('schemaVersion',1,'revision',revision,${collections.map(key => `'${key}',json(COALESCE((SELECT json_group_array(json(data)) FROM (SELECT data FROM oc_${key} ORDER BY ordinal)),'[]'))`).join(',')}) AS data FROM workspace_control WHERE id=1`
export async function loadWorkspace(db:D1Database):Promise<State> {
  const row = await db.prepare(workspaceQuery).first<{data:string}>()
  return row ? JSON.parse(row.data) : empty()
}
export function workspaceRows(db:D1Database,state:State,token:string):D1PreparedStatement[] {
  const gate = 'EXISTS(SELECT 1 FROM workspace_control WHERE id=1 AND write_token=?)'
  return collections.flatMap(key => [
    db.prepare(`DELETE FROM oc_${key} WHERE ${gate}`).bind(token),
    db.prepare(`INSERT INTO oc_${key}(id,ordinal,data) SELECT json_extract(value,'$.id'),CAST(key AS INTEGER),value FROM json_each(?) WHERE ${gate}`).bind(JSON.stringify(state[key]),token),
  ])
}
export function workspaceWrite(db:D1Database,state:State,revision:number,authority:{sql:string;values:(string|number|null)[]},token=crypto.randomUUID()) {
  state.revision = revision + 1
  if(new TextEncoder().encode(JSON.stringify(state)).length>1000000) fail('Workspace storage profile exceeded; export before extending it',429)
  return [db.prepare(`UPDATE workspace_control SET revision=?,write_token=? WHERE id=1 AND revision=? AND ${authority.sql}`).bind(state.revision,token,revision,...authority.values),...workspaceRows(db,state,token)]
}
