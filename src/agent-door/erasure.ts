import { agentErasureStatements, type AgentArtifactMap } from '../modules/agent-door/index.ts'

// Adapted from default-seed/src/agent-door/erasure.ts at Base
// 8b925fa5ffaa577df9f2e4ebab6ede8af5155baa to Oncall's native subjects.
// Native ids and exact email addresses select linked custody. Display names
// use token boundaries, so a short name cannot erase an unrelated peer.
export type AgentSubjectValue = string | { name: string }
const mentions = (table: string, columns: string[]) => `EXISTS(SELECT 1 FROM json_each(?1) subject WHERE ` + columns.map(name => {
  const column = `${table}.${name}`
  return `(subject.type='text' AND instr(CAST(${column} AS TEXT),subject.value)>0) OR
    (subject.type='object' AND EXISTS(
      WITH RECURSIVE hits(text,source,pos) AS (
        SELECT content.value,json_extract(subject.value,'$.name'),instr(content.value,json_extract(subject.value,'$.name'))
        FROM json_tree(CASE WHEN json_valid(${column}) THEN ${column} ELSE json_quote(${column}) END) content WHERE content.type='text'
        UNION ALL SELECT text,source,pos+instr(substr(text,pos+1),source) FROM hits
          WHERE pos>0 AND instr(substr(text,pos+1),source)>0
      ) SELECT 1 FROM hits WHERE pos>0
        AND (pos=1 OR substr(text,pos-1,1) NOT GLOB '[A-Za-z0-9_@/+-]')
        AND (pos+length(source)>length(text) OR substr(text,pos+length(source),1) NOT GLOB '[A-Za-z0-9_@/+-]')
    ))`
}).join(' OR ') + ')'
const calls = mentions('agent_door_calls', ['key','outcome'])
const approvals = mentions('agent_door_approvals', ['saved','approvals','result'])
const reviews = mentions('agent_door_reviews', ['saved','marked_by'])
const audits = mentions('agent_door_audit', ['row','evidence'])
const agents = mentions('agent_door_agents', ['id','name','sponsor','sponsor_name'])
const decisions = `SELECT decision_id FROM agent_door_calls WHERE ${calls}
 UNION SELECT json_extract(saved,'$.decision_id') FROM agent_door_approvals WHERE ${approvals}
 UNION SELECT json_extract(saved,'$.decision_id') FROM agent_door_reviews WHERE ${reviews}
 UNION SELECT id FROM agent_door_audit WHERE ${audits}
 UNION SELECT decision_id FROM agent_door_calls WHERE agent IN (SELECT id FROM agent_door_agents WHERE ${agents})`
const match = (sql: string) => ({ sql, params: ['values'] })
export const oncallAgentArtifacts: AgentArtifactMap = { artifacts: [
  { table: 'agent_door_relay', columns: ['sequence','decision_id','business'], unrelated: 'Installation-private decision ids and Business id only. External Business projections are purged by tombstone pulls, stop and unreachable rules; remote deletion is not claimed.' },
  { table: 'agent_door_replay_aliases', columns: ['agent','alias','call_id','tombstone'], unrelated: 'Installation-private HMAC replay associations, excluded from exports and removed with the original call horizon.' },
  { table: 'agent_door_state', columns: ['id','envelope','local_document','local_revision','local_paused','decision_lock','decision_until'], unrelated: 'Retained installation policy and admission custody. Opaque policy principal refs are authority history, not personal payload; no export of relay or replay custody.' },
  { table: 'agent_door_agents', columns: ['id','name','specialist','sponsor','sponsor_name','revoked','window','requests','tombstone'], match: match(agents) },
  { table: 'agent_door_calls', columns: ['agent','key','digest','decision_id','created_at','state','outcome','expires_at'], match: match(`decision_id IN (${decisions})`) },
  { table: 'agent_door_audit', columns: ['sequence','id','at','agent','classes','row','evidence'], match: match(`id IN (${decisions}) OR json_extract(row,'$.decision_id') IN (${decisions}) OR json_extract(row,'$.replay_of') IN (${decisions}) OR agent IN (SELECT id FROM agent_door_agents WHERE ${agents})`) },
  { table: 'agent_door_approvals', columns: ['id','state','saved','approvals','result','version'], match: match(`json_extract(saved,'$.decision_id') IN (${decisions}) OR ${approvals}`) },
  { table: 'agent_door_reviews', columns: ['id','state','saved','marked_by','marked_at'], match: match(`json_extract(saved,'$.decision_id') IN (${decisions}) OR ${reviews}`) },
  { table: 'agent_door_events', columns: ['sequence','id','uri','event'], match: match(`${mentions('agent_door_events', ['uri','event'])} OR json_extract(event,'$.decision_id') IN (${decisions})`) },
  { table: 'agent_door_usage', columns: ['decision_id','at','seed','specialist','agent','classes'], match: match(`decision_id IN (${decisions}) OR ${mentions('agent_door_usage', ['classes'])}`) },
] }

/** Statements join the existing native transaction and its single checkpoint. */
export async function eraseOncallAgentArtifacts(db: D1Database, secret: string, values: AgentSubjectValue[], tombstone: { erasure_id: string; at: string }) {
  // Oncall's permanent native audit retains non-person agent display labels.
  // Preserve that existing display contract with a fixed erased-sponsor label,
  // while the released redaction removes the sponsor's id, name and contact.
  const ids = values.filter((value): value is string => typeof value === 'string')
  const labels = (await db.prepare("SELECT id,json_extract(row,'$.agent.name') AS name FROM agent_door_audit WHERE json_extract(row,'$.sponsor.id') IN (SELECT value FROM json_each(?))")
    .bind(JSON.stringify(ids)).all<{ id: string; name: string | null }>()).results
  const statements = await agentErasureStatements({ db, secret, map: oncallAgentArtifacts,
    subject: { values: JSON.stringify(values.filter(value => typeof value !== 'string' || value.length > 0)) }, tombstone,
    // The caller already appends its existing redaction checkpoint exactly once.
    checkpoint: async () => [],
  })
  return [...statements,...labels.map(row=>db.prepare("UPDATE agent_door_audit SET row=json_set(row,'$.sponsor.name','Erased member','$.label',?) WHERE id=? AND json_type(row,'$.tombstone') IS NOT NULL")
    .bind(`${row.name??'Agent'} for Erased member`,row.id))]
}
