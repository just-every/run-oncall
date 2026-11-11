import { agentErasureStatements, operatorPolicyRefs, type AgentArtifactMap } from '../modules/agent-door/index.ts'

// Adapted from default-seed/src/agent-door/erasure.ts at Base
// 4dd4197007cefd688fd314ffb19eed4d0b3c67dd to Oncall's native subjects, with
// the bounded text matcher of Base 1943bd59. Native ids, exact email addresses
// and recorded display names select linked custody only as whole tokens:
// erasing al@example.com never selects sal@example.com or al@example.com.test,
// nor id u1 the record of u10. A recorded name also delimits at a colon.
export type AgentSubjectValue = string | { name: string }
const recordedName = "CASE WHEN subject.type='object' THEN json_extract(subject.value,'$.name') END"
const textValue = `CASE WHEN subject.type='text' THEN CAST(subject.value AS TEXT) ELSE ${recordedName} END`
const strictTokenCharacter = "'[A-Za-z0-9_@.+/:-]'"
const separatorTokenCharacter = "'[A-Za-z0-9_@.+-]'"
const minimumSeparatorLength = 8
// Short identifiers preserve URI/version tokens; longer ids and emails can
// occur in path segments. A period delimits a sentence when its outward
// neighbor is not an identifier character. Recorded names also delimit at
// colons; non-ASCII letters continue names, Unicode punctuation does not.
const tokenCharacter = `CASE WHEN length((${textValue}))<${minimumSeparatorLength} AND instr((${textValue}),'@')=0 THEN ${strictTokenCharacter} ELSE ${separatorTokenCharacter} END`
const textBoundary = (position: string, outward: number) => {
  const char = `substr(text,${position},1)`, next = `substr(text,(${position})+(${outward}),1)`
  return `(${char} NOT GLOB token OR (${char}='.' AND ${next} NOT GLOB token) OR (named AND ${char}=':'))
    AND NOT (named AND coalesce(unicode(${char}),0)>127 AND ${char} NOT GLOB '[\u00a0\u2000-\u206f\u2e00-\u2e7f\u3000-\u303f]')`
}
// Search decoded string values, never JSON keys or numbers. A bounded
// occurrence can follow an embedded one in the same string, so every literal
// hit is checked. One search spans all of a table's columns, which keeps the
// expression shallow enough for D1's depth limit.
const cells = (table: string, columns: string[]) => columns.map(name => `SELECT ${table}.${name} AS cell`).join(' UNION ALL ')
const decoded = 'json_tree(CASE WHEN json_valid(cells.cell) THEN cells.cell ELSE json_quote(cells.cell) END) content'
const textMention = (table: string, columns: string[]) => `EXISTS(
      WITH RECURSIVE hits(text,source,pos,token,named) AS (
        SELECT content.value,(${textValue}),instr(content.value,(${textValue})),(${tokenCharacter}),(${recordedName}) IS NOT NULL
        FROM (${cells(table, columns)}) cells, ${decoded}
        WHERE content.type='text' AND instr(content.value,(${textValue}))>0
        UNION ALL SELECT text,source,pos+instr(substr(text,pos+1),source),token,named FROM hits
          WHERE pos>0 AND instr(substr(text,pos+1),source)>0
      ) SELECT 1 FROM hits WHERE pos>0
        AND ${textBoundary('pos-1', -1)}
        AND ${textBoundary('pos+length(source)', 1)}
    )`
const mentions = (table: string, columns: string[]) => `EXISTS(SELECT 1 FROM json_each(?1) subject WHERE
    (subject.type='text' OR subject.type='object') AND ${textMention(table, columns)})`
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
// Native person UI events (0152 triggers) attribute the acting member as
// actor.person. A natively erased member keeps a pseudonymous "Erased member"
// tombstone id, so that member's own events keep their id, sequence, type, URI
// and actor id; the erasure replaces only the display name in the same batch.
// Base 0.2.96 maps customer subjects, not operator attribution: every
// decision-linked event and every other mention is still redacted in place.
const ownEvent = `EXISTS(SELECT 1 FROM json_each(?2) member WHERE json_extract(agent_door_events.event,'$.actor.kind')='person'
  AND json_extract(agent_door_events.event,'$.actor.person.id')=member.value)`
export const oncallAgentArtifacts: AgentArtifactMap = { artifacts: [
  { table: 'agent_door_retired_refs', columns: ['digest','marker'], unrelated: 'Value-free suppression digests and erasure markers; they travel in installation archives so retirement holds across restore.' },
  { table: 'agent_door_relay', columns: ['sequence','decision_id','business'], unrelated: 'Installation-private decision ids and Business id only. External Business projections are purged by tombstone pulls, stop and unreachable rules; remote deletion is not claimed.' },
  { table: 'agent_door_replay_aliases', columns: ['agent','alias','call_id','tombstone'], unrelated: 'Installation-private HMAC replay associations, excluded from exports and removed with the original call horizon.' },
  { table: 'agent_door_state', columns: ['id','envelope','local_document','local_revision','local_paused','decision_lock','decision_until'], retire: { refs: 'policyRefs' } },
  { table: 'agent_door_agents', columns: ['id','name','specialist','sponsor','sponsor_name','revoked','window','requests','tombstone'], match: match(agents) },
  { table: 'agent_door_calls', columns: ['agent','key','digest','decision_id','created_at','state','outcome','expires_at'], match: match(`decision_id IN (${decisions})`) },
  { table: 'agent_door_audit', columns: ['sequence','id','at','agent','classes','row','evidence'], match: match(`id IN (${decisions}) OR json_extract(row,'$.decision_id') IN (${decisions}) OR json_extract(row,'$.replay_of') IN (${decisions}) OR agent IN (SELECT id FROM agent_door_agents WHERE ${agents})`) },
  { table: 'agent_door_approvals', columns: ['id','state','saved','approvals','result','version'], match: match(`json_extract(saved,'$.decision_id') IN (${decisions}) OR ${approvals}`) },
  { table: 'agent_door_reviews', columns: ['id','state','saved','marked_by','marked_at'], match: match(`json_extract(saved,'$.decision_id') IN (${decisions}) OR ${reviews}`) },
  { table: 'agent_door_events', columns: ['sequence','id','uri','event'], match: { sql: `json_extract(event,'$.decision_id') IN (${decisions}) OR (NOT ${ownEvent} AND ${mentions('agent_door_events', ['uri','event'])})`, params: ['values','members'] } },
  { table: 'agent_door_usage', columns: ['decision_id','at','seed','specialist','agent','classes'], match: match(`decision_id IN (${decisions}) OR ${mentions('agent_door_usage', ['classes'])}`) },
] }

/** Statements join the existing native transaction and its single checkpoint.
 * `members` are native members this transaction erases to their tombstone. */
export async function eraseOncallAgentArtifacts(db: D1Database, secret: string, values: AgentSubjectValue[], tombstone: { erasure_id: string; at: string }, members: string[] = []) {
  // Oncall's permanent native audit retains non-person agent display labels.
  // Preserve that existing display contract with a fixed erased-sponsor label,
  // while the released redaction removes the sponsor's id, name and contact.
  const ids = values.filter((value): value is string => typeof value === 'string')
  // The 0.2.97 operator recipe on Oncall's own roster ids: the Business team adapter binds bs_team.operator_id
  // to the oc_members id, so an erased member's refs are that id and its Business id. Base's roster rule
  // then retires bs_team and the stored signed document in the same transaction.
  const policyRefs = [...new Set((await Promise.all(members.map(member => operatorPolicyRefs(db, member)))).flat())]
  const labels = (await db.prepare("SELECT id,json_extract(row,'$.agent.name') AS name FROM agent_door_audit WHERE json_extract(row,'$.sponsor.id') IN (SELECT value FROM json_each(?))")
    .bind(JSON.stringify(ids)).all<{ id: string; name: string | null }>()).results
  const statements = await agentErasureStatements({ db, secret, map: oncallAgentArtifacts,
    subject: { values: JSON.stringify(values.filter(value => typeof value !== 'string' ? value.name.length > 0 : value.length > 0)), members: JSON.stringify(members), policyRefs: JSON.stringify(policyRefs) }, tombstone,
    // The caller already appends its existing redaction checkpoint exactly once.
    checkpoint: async () => [],
  })
  // After the guarded redaction, so only the retained own events remain to rename.
  const ownEvents = members.length ? [db.prepare("UPDATE agent_door_events SET event=json_set(event,'$.actor.person.name','Erased member') WHERE json_extract(event,'$.actor.kind')='person' AND json_extract(event,'$.actor.person.id') IN (SELECT value FROM json_each(?))")
    .bind(JSON.stringify(members))] : []
  return [...statements,...labels.map(row=>db.prepare("UPDATE agent_door_audit SET row=json_set(row,'$.sponsor.name','Erased member','$.label',?) WHERE id=? AND json_type(row,'$.tombstone') IS NOT NULL")
    .bind(`${row.name??'Agent'} for Erased member`,row.id)),...ownEvents]
}
