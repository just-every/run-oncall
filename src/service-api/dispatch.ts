import { auditKind, auditOutcome, setAuditSubject, type AuditOutcome } from '../audit-store'
import { rawDatabase } from '../audit-database'
import { loadWorkspace } from '../workspace-store'
import { isLoopbackHost } from '../modules/operator-auth/index.mjs'
import { runtimeBindings, type Bindings } from '../auth.server'
import type { State } from '../family/response-operations/domain'
import { checkEndpointUrl } from './egress.ts'
import { openCredential, webhookCustody } from './credentials'
import { signedHeaders } from './signing'
import { parseRow, transition, type StoredOperation } from './outbox-store'
import type { OutboxOperation, OutboxState, WebhookEndpoint } from './types.ts'

const timeoutMs = 8000, leaseMs = 45000, budgetMs = 20000
const retryable = [408, 425, 429, 500, 502, 503, 504]
const backoff = (attempts: number) => [30, 120, 600, 3600][attempts - 1] ?? 3600
export type DispatchSummary = { reconciled: number; sent: number; retrying: number; failed: number; uncertain: number; refused: number }
type Refusal = { reason: string }

function record(operation: OutboxOperation, at: number, outcome: string, status: number | null, reason?: string): OutboxOperation['history'] {
  return [...operation.history, { at: new Date(at).toISOString(), attempt: operation.attempts, outcome, status, ...(reason ? { reason } : {}) }].slice(-20)
}
async function audited(db: D1Database, endpoint: string, kind: string, outcome: AuditOutcome | undefined, work: () => Promise<boolean>) {
  auditKind(db, kind); setAuditSubject(db, 'webhook-endpoint', endpoint); auditOutcome(db, outcome)
  try { return await work() } finally { auditOutcome(db, undefined) }
}

/** Every authority is read again at the moment of sending: the endpoint, its signing secret, its named owner, the token that caused the event and the data it names. */
async function authorize(db: D1Database, env: Bindings, state: State, operation: OutboxOperation): Promise<Refusal | { endpoint: WebhookEndpoint; secret: string }> {
  const endpoint = state.webhookEndpoints?.find(candidate => candidate.id === operation.endpoint)
  if (!endpoint?.active) return { reason: 'endpoint-revoked' }
  const credential = await db.prepare('SELECT ciphertext FROM oc_webhook_credentials WHERE endpoint=?').bind(endpoint.id).first<{ ciphertext: string }>()
  if (!credential) return { reason: 'endpoint-not-approved' }
  if (!state.members.some(member => member.id === endpoint.owner && member.active && member.role === 'admin')) return { reason: 'owner-not-authorized' }
  if (!endpoint.events.includes(operation.type) || !endpoint.services.includes(operation.payload.service.id)) return { reason: 'endpoint-scope-changed' }
  if (!state.incidents.some(incident => incident.id === operation.payload.incident.id && incident.service === operation.payload.service.id)) return { reason: 'data-access-changed' }
  const by = operation.authorizedBy
  if (by.kind === 'service-account') {
    const account = state.serviceAccounts?.find(candidate => candidate.id === by.id)
    if (!account?.active || !await db.prepare('SELECT 1 FROM oc_api_credentials WHERE account=?').bind(by.id).first()) return { reason: 'token-revoked' }
    if (!account.services.includes(operation.payload.service.id)) return { reason: 'token-scope-changed' }
  } else if (operation.replays > 0 && !state.members.some(member => member.id === by.id && member.active && member.role === 'admin')) return { reason: 'replay-authority-revoked' }
  if (!checkEndpointUrl(endpoint.url, isLoopbackHost(new URL(runtimeBindings(env).AUTH_ORIGIN).hostname)).ok) return { reason: 'unsafe-endpoint' }
  try { return { endpoint, secret: await openCredential(credential.ciphertext, runtimeBindings(env).SESSION_SECRET, webhookCustody) } }
  catch { return { reason: 'credential-unreadable' } }
}

/** An expired lease never silently erases an operation: it is kept as interrupted (no request began) or uncertain (one may have). */
async function reconcile(db: D1Database, now: number, summary: DispatchSummary) {
  const rows = (await db.prepare("SELECT id,rev,data FROM oc_outbox WHERE state='sending' AND lease_expires<?").bind(now).all<{ id: string; rev: number; data: string }>()).results
  await Promise.all(rows.map(async row => {
    const { operation, rev } = parseRow(row)
    const began = operation.started
    const next: OutboxOperation = { ...operation, leaseExpiresAt: null, started: false, state: began ? 'uncertain' : 'interrupted',
      attempts: began ? operation.attempts : Math.max(0, operation.attempts - 1),
      dueAt: began ? (operation.attempts < operation.maxAttempts ? now + backoff(operation.attempts) * 1000 : null) : now,
      history: record(operation, now, began ? 'uncertain' : 'interrupted', null, began ? 'lease-expired-after-send-began' : 'lease-expired-before-send') }
    if (await audited(db, operation.endpoint, 'outbox.reconcile', began ? 'uncertain' : 'interrupted', () => transition(db, operation.id, rev, next, ['sending']))) summary.reconciled++
  }))
}

async function attempt(db: D1Database, env: Bindings, stored: StoredOperation, summary: DispatchSummary) {
  let { operation, rev } = stored
  const now = Date.now()
  const state = await loadWorkspace(db) // current authority, read again for every send
  const decision = await authorize(db, env, state, operation)
  if ('reason' in decision) {
    const refused: OutboxOperation = { ...operation, state: 'refused', dueAt: null, leaseExpiresAt: null, started: false, reason: decision.reason, history: record(operation, now, 'refused', null, decision.reason) }
    if (await audited(db, operation.endpoint, 'outbox.refused', 'refused', () => transition(db, operation.id, rev, refused, ['queued', 'uncertain', 'interrupted']))) summary.refused++
    return
  }
  const claimed: OutboxOperation = { ...operation, state: 'sending', attempts: operation.attempts + 1, dueAt: null, leaseExpiresAt: now + leaseMs, started: false, reason: undefined }
  if (!await audited(db, operation.endpoint, 'outbox.claim', undefined, () => transition(db, operation.id, rev, claimed, ['queued', 'uncertain', 'interrupted']))) return
  rev++
  // The marker that a request may now exist is operational lease state; it is not an accepted product mutation.
  const begun: OutboxOperation = { ...claimed, started: true }
  if (!await transition(rawDatabase(db), operation.id, rev, begun, ['sending'])) return
  rev++
  operation = begun
  const body = JSON.stringify(operation.payload)
  let status: number | null = null, retryAfter = 0
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(decision.endpoint.url, { method: 'POST', redirect: 'manual', signal: controller.signal, body,
      headers: await signedHeaders(decision.secret, body, { id: operation.id, eventId: operation.eventId, type: operation.type, attempt: operation.attempts, replays: operation.replays }) })
    status = response.status
    retryAfter = Math.min(3600, Number(response.headers.get('retry-after')) || 0)
    await response.body?.cancel()
  } catch { status = null } finally { clearTimeout(timer) }
  const at = Date.now()
  let next: OutboxOperation, kind: string, outcome: AuditOutcome
  const base = { ...operation, leaseExpiresAt: null, started: false }
  if (status === null) {
    // The request may have reached the receiver: never claim it failed. It stays uncertain and the same operation ID is retried.
    next = { ...base, state: 'uncertain', dueAt: operation.attempts < operation.maxAttempts ? at + backoff(operation.attempts) * 1000 : null, history: record(operation, at, 'uncertain', null, 'no response before the connection ended') }
    kind = 'outbox.uncertain'; outcome = 'uncertain'; summary.uncertain++
  } else if (status >= 200 && status < 300) {
    next = { ...base, state: 'sent', dueAt: null, history: record(operation, at, 'sent', status) }
    kind = 'outbox.sent'; outcome = 'accepted'; summary.sent++
  } else if (retryable.includes(status) && operation.attempts < operation.maxAttempts) {
    next = { ...base, state: 'queued', dueAt: at + Math.max(retryAfter, backoff(operation.attempts)) * 1000, history: record(operation, at, 'retry', status) }
    kind = 'outbox.retry'; outcome = 'failed'; summary.retrying++
  } else {
    const reason = status >= 300 && status < 400 ? 'redirect-refused' : retryable.includes(status) ? 'attempts-exhausted' : 'rejected-by-receiver'
    next = { ...base, state: 'failed', dueAt: null, reason, history: record(operation, at, 'failed', status, reason) }
    kind = 'outbox.failed'; outcome = 'failed'; summary.failed++
  }
  await audited(db, operation.endpoint, kind, outcome, () => transition(db, operation.id, rev, next, ['sending']))
}

/** Reconcile expired leases, then send what is due. Endpoints run in parallel; one endpoint's operations keep their order. */
export async function dispatchOutbox(db: D1Database, env: Bindings, limit = 20): Promise<DispatchSummary> {
  const summary: DispatchSummary = { reconciled: 0, sent: 0, retrying: 0, failed: 0, uncertain: 0, refused: 0 }
  const started = Date.now()
  await reconcile(db, started, summary)
  const due = (await db.prepare("SELECT id,rev,data FROM oc_outbox WHERE state IN ('queued','uncertain','interrupted') AND due_at<=? ORDER BY due_at,ordinal LIMIT ?").bind(Date.now(), limit).all<{ id: string; rev: number; data: string }>()).results.map(parseRow)
  if (!due.length) return summary
  const groups = new Map<string, StoredOperation[]>()
  for (const stored of due) groups.set(stored.operation.endpoint, [...groups.get(stored.operation.endpoint) ?? [], stored])
  await Promise.all([...groups.values()].map(async group => {
    for (const stored of group) {
      if (Date.now() - started > budgetMs) return // leave the rest queued, due and visible
      await attempt(db, env, stored, summary)
    }
  }))
  return summary
}
export type { OutboxState }
