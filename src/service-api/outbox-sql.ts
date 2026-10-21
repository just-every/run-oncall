import type { State } from '../family/response-operations/domain.ts'
import { auditActor } from '../audit-store'
import { diffIncidentEvents, eventPayload } from './events.ts'
import { originalWorkspace } from '../workspace-original'
import { markDispatchDue } from './dispatch-hint'
import { maxAttempts, pendingPerEndpoint, pendingStates, retainedTerminal, terminalStates, type OutboxOperation, type Principal } from './types.ts'

const list = (values: readonly string[]) => values.map(value => `'${value}'`).join(',')
const gate = 'EXISTS(SELECT 1 FROM workspace_control WHERE id=1 AND write_token=?)'
const columns = 'id,ordinal,endpoint,event_id,rev,state,due_at,lease_expires,started,data'
const select = `json_extract(value,'$.id'),(SELECT COALESCE(MAX(ordinal),0) FROM oc_outbox)+CAST(key AS INTEGER)+1,json_extract(value,'$.endpoint'),json_extract(value,'$.eventId'),1,json_extract(value,'$.state'),json_extract(value,'$.dueAt'),NULL,0,value`

/** The principal under whose authority an incident write happened, as the audit context already knows it. */
function originOf(db: D1Database): Principal {
  const actor = auditActor(db)
  if (actor?.kind === 'member' || actor?.kind === 'service-account') return { kind: actor.kind, id: actor.id }
  return { kind: 'system', id: 'installation' }
}

/**
 * Statements that enqueue the signed events for one incident write. They join the same D1 batch as the state write and its
 * permanent audit entry, so a refused or failed batch leaves no event and an accepted one always has it. `token` is the
 * write token that proves the state write in this batch won its revision check.
 */
export function enqueueStatements(db: D1Database, state: State, token: string, only?: string): D1PreparedStatement[] {
  const endpoints = (state.webhookEndpoints ?? []).filter(endpoint => endpoint.active)
  if (!endpoints.length) return []
  const original = originalWorkspace(state)
  if (!original) return []
  const events = diffIncidentEvents(original.incidents, state.incidents, only)
  if (!events.length) return []
  const origin = originOf(db), at = new Date().toISOString(), now = Date.parse(at)
  const queued: OutboxOperation[] = [], overflow: OutboxOperation[] = []
  for (const event of events) {
    const eventId = crypto.randomUUID()
    for (const endpoint of endpoints) {
      if (!endpoint.events.includes(event.type) || !endpoint.services.includes(event.incident.service)) continue
      const id = crypto.randomUUID()
      const operation: OutboxOperation = {
        id, eventId, type: event.type, endpoint: endpoint.id, owner: endpoint.owner, createdAt: at, state: 'queued', dueAt: now,
        leaseExpiresAt: null, started: false, attempts: 0, maxAttempts, replays: 0, origin,
        authorizedBy: origin.kind === 'service-account' ? origin : { kind: 'member', id: endpoint.owner },
        payload: eventPayload(state, event, { operationId: id, eventId }, origin, at), history: [],
      }
      queued.push(operation)
      overflow.push({ ...operation, state: 'failed', dueAt: null, reason: 'queue-full', history: [{ at, attempt: 0, outcome: 'queue-full', status: null }] })
    }
  }
  if (!queued.length) return []
  markDispatchDue()
  return [
    db.prepare(`INSERT INTO oc_outbox(${columns}) SELECT ${select} FROM json_each(?) WHERE ${gate} AND (SELECT COUNT(*) FROM oc_outbox o WHERE o.endpoint=json_extract(value,'$.endpoint') AND o.state IN (${list(pendingStates)}))<?`)
      .bind(JSON.stringify(queued), token, pendingPerEndpoint),
    // A full endpoint queue is recorded as an honest terminal failure rather than silently dropping the event.
    db.prepare(`INSERT INTO oc_outbox(${columns}) SELECT ${select} FROM json_each(?) WHERE ${gate} AND NOT EXISTS(SELECT 1 FROM oc_outbox o WHERE o.id=json_extract(value,'$.id'))`)
      .bind(JSON.stringify(overflow), token),
    db.prepare(`DELETE FROM oc_outbox WHERE state IN (${list(terminalStates)}) AND ${gate} AND ordinal NOT IN (SELECT ordinal FROM oc_outbox WHERE state IN (${list(terminalStates)}) ORDER BY ordinal DESC LIMIT ?)`)
      .bind(token, retainedTerminal),
  ]
}
