import { auditIdentity, setAuditSubject, forgetAuditIdentityQueries } from '../audit-store'
import { workspaceWrite } from '../workspace-store'
import { authority, fail, text, type State } from '../family/response-operations/domain'
import { isLoopbackHost } from '../modules/operator-auth/index.mjs'
import { runtimeBindings } from '../auth.server'
import { dispatchOutbox } from './dispatch'
import { newSigningSecret, newToken, sealCredential, tokenDigest, webhookCustody } from './credentials'
import { checkEndpointUrl } from './egress.ts'
import { actorId, erasedActor } from './model.ts'
import { getOperation, listOperations, outboxCounts, replayed } from './outbox-store'
import { markDispatchDue } from './dispatch-hint'
import { apiPermissions, eventTypes, maxAccounts, maxEndpoints, type ApiPermission, type EventType, type ServiceAccount, type WebhookEndpoint } from './types.ts'

type Guard = { sql: string; values: (string | number | null)[] }
type Dependencies = { body: (c: any, max?: number) => Promise<any>; state: (c: any, admin?: boolean) => Promise<State>; guard: (c: any) => Guard }
const gate = 'EXISTS(SELECT 1 FROM workspace_control WHERE write_token=?)'
const stamp = (c: any, kind: string, line: string, at: string) => ({ id: crypto.randomUUID(), at, actor: c.get('actor').id, kind, text: line })
const subset = <T extends string>(value: unknown, allowed: readonly T[], name: string, max = 200): T[] => {
  if (!Array.isArray(value) || !value.length || value.length > max || new Set(value).size !== value.length || value.some(item => !allowed.includes(item))) fail(`Choose ${name} from the offered values`)
  return value as T[]
}
const localInstallation = (c: any) => isLoopbackHost(new URL(runtimeBindings(c.env).AUTH_ORIGIN).hostname)

function scrubServiceActor(state: State, account: string) {
  const mark = actorId(account), swap = (value: string) => value === mark ? erasedActor : value
  const scrub = (entry: { actor: string; text: string }) => { entry.actor = swap(entry.actor); entry.text = entry.text.replaceAll(account, erasedActor) }
  state.audit.forEach(scrub)
  for (const incident of state.incidents) {
    incident.timeline.forEach(scrub)
    for (const action of incident.actions) {
      if (action.submission) action.submission.by = swap(action.submission.by)
      if (action.accepted) action.accepted.by = swap(action.accepted.by)
    }
  }
}

export function installServiceApiManagement(api: any, deps: Dependencies) {
  const listAccounts = async (c: any) => {
    const state = await deps.state(c, true)
    const rows = (await c.env.DB.prepare('SELECT account,created_at,rotated_at,last_used_at FROM oc_api_credentials').all()).results as { account: string; created_at: string; rotated_at: string | null; last_used_at: string | null }[]
    return { accounts: (state.serviceAccounts ?? []).map(account => {
      const credential = rows.find(row => row.account === account.id)
      return { ...account, token: credential ? 'held as a digest; never returned' : 'none', tokenCreatedAt: credential?.created_at ?? null, tokenRotatedAt: credential?.rotated_at ?? null, lastUsedAt: credential?.last_used_at ?? null }
    }) }
  }
  api.get('/api/service-accounts', async (c: any) => c.json(await listAccounts(c)))
  api.post('/api/service-accounts', async (c: any) => {
    const input = await deps.body(c), state = await deps.state(c, true), actor = c.get('actor'); authority(state, actor, true)
    const previous = input.id ? state.serviceAccounts?.find(account => account.id === input.id) : undefined
    if (input.id && !previous) fail('Unknown service account', 404)
    if (previous && (input.revision !== previous.revision || !previous.active)) fail('Service account changed or was revoked. Reload before saving.', 409)
    const accounts = state.serviceAccounts ??= []
    if (!previous && accounts.length >= maxAccounts) fail(`At most ${maxAccounts} service accounts`, 429)
    const name = text(input.name, 'Service account name', 100)
    if (accounts.some(account => account.name === name && account.id !== previous?.id)) fail('Use a different name for each service account', 409)
    const at = new Date().toISOString(), id = previous?.id ?? crypto.randomUUID()
    const permissions = subset<ApiPermission>(input.permissions, apiPermissions, 'permissions', 4)
    if (!permissions.includes('read')) fail('Every token needs the read permission; write permissions return the record they change')
    const account: ServiceAccount = { id, name, permissions,
      services: subset(input.services, state.services.map(service => service.id), 'services'), active: true,
      revision: (previous?.revision ?? 0) + 1, createdBy: previous?.createdBy ?? actor.id, createdAt: previous?.createdAt ?? at, updatedAt: at }
    if (previous) accounts[accounts.indexOf(previous)] = account; else accounts.push(account)
    state.audit.push(stamp(c, 'service-account', `${previous ? 'Updated' : 'Created'} service account ${id}; revision ${account.revision}`, at))
    auditIdentity(c.env.DB, { source: { kind: 'service-account', id }, subject: { kind: 'service-account', id } })
    const token = previous ? null : newToken(), revision = state.revision, writeToken = crypto.randomUUID()
    const writes = workspaceWrite(c.env.DB, state, revision, deps.guard(c), writeToken)
    const insert = token ? [c.env.DB.prepare(`INSERT INTO oc_api_credentials(account,digest,created_at) SELECT ?,?,? WHERE ${gate}`).bind(id, await tokenDigest(token), at, writeToken)] : []
    const result = await c.env.DB.batch([...writes, ...insert])
    if (result[0].meta.changes !== 1) fail('Workspace or authority changed; reload and retry', 409)
    return c.json({ account, ...(token ? { token, tokenNotice: 'Copy this token now. It is not shown again and is stored only as a digest.' } : {}) }, previous ? 200 : 201)
  })
  api.post('/api/service-accounts/:id/rotate', async (c: any) => {
    const input = await deps.body(c), state = await deps.state(c, true), account = state.serviceAccounts?.find(candidate => candidate.id === c.req.param('id'))
    if (!account) fail('Unknown service account', 404)
    if (!account.active || input.revision !== account.revision) fail('Service account changed or was revoked. Reload before rotating.', 409)
    const at = new Date().toISOString(), token = newToken(), revision = state.revision, writeToken = crypto.randomUUID()
    account.revision++; account.updatedAt = at
    state.audit.push(stamp(c, 'service-account-rotated', `Rotated the token of service account ${account.id}; revision ${account.revision}`, at))
    auditIdentity(c.env.DB, { source: { kind: 'service-account', id: account.id }, subject: { kind: 'service-account', id: account.id } })
    // One guarded statement replaces the digest: the previous token stops authenticating when this commits.
    const result = await c.env.DB.batch([...workspaceWrite(c.env.DB, state, revision, deps.guard(c), writeToken),
      c.env.DB.prepare(`UPDATE oc_api_credentials SET digest=?,rotated_at=?,last_used_at=NULL WHERE account=? AND ${gate}`).bind(await tokenDigest(token), at, account.id, writeToken)])
    if (result[0].meta.changes !== 1 || result[result.length - 1].meta.changes !== 1) fail('Workspace or authority changed; reload and retry', 409)
    return c.json({ account, token, tokenNotice: 'Copy this token now. It is not shown again and is stored only as a digest.' })
  })
  api.post('/api/service-accounts/:id/revoke', async (c: any) => {
    const input = await deps.body(c), state = await deps.state(c, true), account = state.serviceAccounts?.find(candidate => candidate.id === c.req.param('id'))
    if (!account) fail('Unknown service account', 404)
    if (input.revision !== account.revision) fail('Service account changed. Reload before revoking.', 409)
    const at = new Date().toISOString(), revision = state.revision, writeToken = crypto.randomUUID()
    account.active = false; account.revision++; account.updatedAt = at
    state.audit.push(stamp(c, 'service-account-revoked', `Revoked service account ${account.id}; revision ${account.revision}`, at))
    auditIdentity(c.env.DB, { source: { kind: 'service-account', id: account.id }, subject: { kind: 'service-account', id: account.id } })
    const result = await c.env.DB.batch([...workspaceWrite(c.env.DB, state, revision, deps.guard(c), writeToken),
      c.env.DB.prepare(`DELETE FROM oc_api_credentials WHERE account=? AND ${gate}`).bind(account.id, writeToken)])
    if (result[0].meta.changes !== 1) fail('Workspace or authority changed; reload and retry', 409)
    return c.json({ account, effect: 'its token no longer authenticates; queued events it caused are refused at dispatch; accepted history stays' })
  })
  // Erasure of an identified subject: the record, its idempotency answers and every reference go; the permanent audit labels stay unlinkable.
  api.post('/api/service-accounts/:id/erase', async (c: any) => {
    const input = await deps.body(c), state = await deps.state(c, true), id = c.req.param('id'), account = state.serviceAccounts?.find(candidate => candidate.id === id)
    if (!account) fail('Unknown service account', 404)
    if (account.active) fail('Revoke the service account before erasing it', 409)
    if (input.confirmation !== `erase ${id}` || input.revision !== account.revision) fail('Confirm with "erase <id>" and the current revision', 409)
    const at = new Date().toISOString(), revision = state.revision, writeToken = crypto.randomUUID()
    state.serviceAccounts = state.serviceAccounts!.filter(candidate => candidate.id !== id)
    if (!state.serviceAccounts.length) delete state.serviceAccounts
    scrubServiceActor(state, id)
    state.audit.push(stamp(c, 'service-account-erased', 'Erased a service account', at))
    // The permanent audit row keeps its unlinkable label; the association that would name this account is deleted in the same batch.
    setAuditSubject(c.env.DB, 'service-account', id)
    const erasing = forgetAuditIdentityQueries([id]).map(query => c.env.DB.prepare(query.sql).bind(...query.params))
    const result = await c.env.DB.batch([...workspaceWrite(c.env.DB, state, revision, deps.guard(c), writeToken),
      c.env.DB.prepare(`DELETE FROM oc_api_credentials WHERE account=? AND ${gate}`).bind(id, writeToken),
      c.env.DB.prepare(`DELETE FROM oc_api_idempotency WHERE account=? AND ${gate}`).bind(id, writeToken),
      c.env.DB.prepare(`DELETE FROM oc_api_rate WHERE account=? AND ${gate}`).bind(id, writeToken),
      c.env.DB.prepare(`UPDATE oc_outbox SET data=replace(data,?,?) WHERE instr(data,?)>0 AND ${gate}`).bind(id, 'erased', id, writeToken),
      ...erasing])
    if (result[0].meta.changes !== 1) fail('Workspace or authority changed; reload and retry', 409)
    return c.json({ erased: true })
  })

  api.get('/api/webhooks', async (c: any) => {
    const state = await deps.state(c, true)
    const held = new Set(((await c.env.DB.prepare('SELECT endpoint FROM oc_webhook_credentials').all()).results as { endpoint: string }[]).map(row => row.endpoint))
    return c.json({ endpoints: (state.webhookEndpoints ?? []).map(endpoint => ({ ...endpoint, signingSecret: held.has(endpoint.id) ? 'encrypted in this installation; never returned' : 'none — rotate to approve this endpoint' })), eventTypes })
  })
  api.post('/api/webhooks', async (c: any) => {
    const input = await deps.body(c), state = await deps.state(c, true), actor = c.get('actor'); authority(state, actor, true)
    const previous = input.id ? state.webhookEndpoints?.find(endpoint => endpoint.id === input.id) : undefined
    if (input.id && !previous) fail('Unknown webhook endpoint', 404)
    if (previous && input.revision !== previous.revision) fail('Webhook endpoint changed. Reload before saving.', 409)
    const endpoints = state.webhookEndpoints ??= []
    if (!previous && endpoints.length >= maxEndpoints) fail(`At most ${maxEndpoints} webhook endpoints`, 429)
    const checked = checkEndpointUrl(input.url, localInstallation(c)); if (!checked.ok) fail(checked.reason)
    const owner = input.owner ?? actor.id
    if (!state.members.some(member => member.id === owner && member.active && member.role === 'admin')) fail('The named owner must be an active administrator')
    const name = text(input.name, 'Webhook endpoint name', 100), at = new Date().toISOString(), id = previous?.id ?? crypto.randomUUID()
    const endpoint: WebhookEndpoint = { id, name, url: checked.url, events: subset<EventType>(input.events, eventTypes, 'event types', eventTypes.length),
      services: subset(input.services, state.services.map(service => service.id), 'services'), active: previous?.active ?? true, revision: (previous?.revision ?? 0) + 1,
      owner, createdAt: previous?.createdAt ?? at, updatedAt: at }
    if (previous) endpoints[endpoints.indexOf(previous)] = endpoint; else endpoints.push(endpoint)
    state.audit.push(stamp(c, 'webhook-endpoint', `${previous ? 'Updated' : 'Created'} webhook endpoint ${id}; revision ${endpoint.revision}`, at))
    auditIdentity(c.env.DB, { source: { kind: 'webhook-endpoint', id }, subject: { kind: 'webhook-endpoint', id } })
    const secret = previous ? null : newSigningSecret(), revision = state.revision, writeToken = crypto.randomUUID()
    const writes = workspaceWrite(c.env.DB, state, revision, deps.guard(c), writeToken)
    const insert = secret ? [c.env.DB.prepare(`INSERT INTO oc_webhook_credentials(endpoint,ciphertext) SELECT ?,? WHERE ${gate}`).bind(id, await sealCredential(secret, runtimeBindings(c.env).SESSION_SECRET, webhookCustody), writeToken)] : []
    const result = await c.env.DB.batch([...writes, ...insert])
    if (result[0].meta.changes !== 1) fail('Workspace or authority changed; reload and retry', 409)
    return c.json({ endpoint, ...(secret ? { signingSecret: secret, signingSecretNotice: 'Copy this signing secret now. It is not shown again and is stored encrypted.' } : {}) }, previous ? 200 : 201)
  })
  // Rotation is also how a restored or revoked endpoint is approved again: it is a fresh, deliberate owner action.
  api.post('/api/webhooks/:id/rotate', async (c: any) => {
    const input = await deps.body(c), state = await deps.state(c, true), actor = c.get('actor'), endpoint = state.webhookEndpoints?.find(candidate => candidate.id === c.req.param('id'))
    if (!endpoint) fail('Unknown webhook endpoint', 404)
    if (input.revision !== endpoint.revision) fail('Webhook endpoint changed. Reload before rotating.', 409)
    if (!checkEndpointUrl(endpoint.url, localInstallation(c)).ok) fail('This endpoint URL is no longer permitted; save a permitted URL first')
    if (!state.members.some(member => member.id === endpoint.owner && member.active && member.role === 'admin')) endpoint.owner = actor.id
    const at = new Date().toISOString(), secret = newSigningSecret(), revision = state.revision, writeToken = crypto.randomUUID()
    endpoint.active = true; endpoint.revision++; endpoint.updatedAt = at
    state.audit.push(stamp(c, 'webhook-endpoint-rotated', `Rotated and approved the signing secret of webhook endpoint ${endpoint.id}; revision ${endpoint.revision}`, at))
    auditIdentity(c.env.DB, { source: { kind: 'webhook-endpoint', id: endpoint.id }, subject: { kind: 'webhook-endpoint', id: endpoint.id } })
    const result = await c.env.DB.batch([...workspaceWrite(c.env.DB, state, revision, deps.guard(c), writeToken),
      c.env.DB.prepare(`INSERT INTO oc_webhook_credentials(endpoint,ciphertext) SELECT ?,? WHERE ${gate} ON CONFLICT(endpoint) DO UPDATE SET ciphertext=excluded.ciphertext`).bind(endpoint.id, await sealCredential(secret, runtimeBindings(c.env).SESSION_SECRET, webhookCustody), writeToken)])
    if (result[0].meta.changes !== 1) fail('Workspace or authority changed; reload and retry', 409)
    return c.json({ endpoint, signingSecret: secret, signingSecretNotice: 'Copy this signing secret now. It is not shown again and is stored encrypted.' })
  })
  api.post('/api/webhooks/:id/revoke', async (c: any) => {
    const input = await deps.body(c), state = await deps.state(c, true), endpoint = state.webhookEndpoints?.find(candidate => candidate.id === c.req.param('id'))
    if (!endpoint) fail('Unknown webhook endpoint', 404)
    if (input.revision !== endpoint.revision) fail('Webhook endpoint changed. Reload before revoking.', 409)
    const at = new Date().toISOString(), revision = state.revision, writeToken = crypto.randomUUID()
    endpoint.active = false; endpoint.revision++; endpoint.updatedAt = at
    state.audit.push(stamp(c, 'webhook-endpoint-revoked', `Revoked webhook endpoint ${endpoint.id}; revision ${endpoint.revision}`, at))
    auditIdentity(c.env.DB, { source: { kind: 'webhook-endpoint', id: endpoint.id }, subject: { kind: 'webhook-endpoint', id: endpoint.id } })
    const result = await c.env.DB.batch([...workspaceWrite(c.env.DB, state, revision, deps.guard(c), writeToken),
      c.env.DB.prepare(`DELETE FROM oc_webhook_credentials WHERE endpoint=? AND ${gate}`).bind(endpoint.id, writeToken)])
    if (result[0].meta.changes !== 1) fail('Workspace or authority changed; reload and retry', 409)
    return c.json({ endpoint, effect: 'nothing more is sent to it; its queued events are refused at dispatch and stay visible' })
  })

  api.get('/api/outbox', async (c: any) => {
    await deps.state(c, true)
    const limit = Math.min(100, Math.max(1, Number(c.req.query('limit') ?? 25) || 25)), before = c.req.query('before') ? Number(c.req.query('before')) : undefined
    if (before !== undefined && !Number.isSafeInteger(before)) fail('Invalid cursor')
    const page = await listOperations(c.env.DB, c.req.query('state') || undefined, before, limit)
    return c.json({ operations: page.rows.map(row => ({ ...row.operation })), next: page.more ? page.rows.at(-1)!.ordinal : null, counts: await outboxCounts(c.env.DB),
      schedule: 'Delivery starts after each committed change and when an administrator dispatches due work; no timer runs while the installation receives no requests.' })
  })
  api.post('/api/outbox/dispatch', async (c: any) => {
    await deps.body(c); await deps.state(c, true)
    return c.json(await dispatchOutbox(c.env.DB, c.env))
  })
  api.post('/api/outbox/:id/replay', async (c: any) => {
    const input = await deps.body(c), state = await deps.state(c, true), actor = c.get('actor'); authority(state, actor, true)
    const reason = text(input.reason, 'Replay reason', 500), stored = await getOperation(c.env.DB, c.req.param('id'))
    if (!stored) fail('Unknown outbox operation', 404)
    const next = replayed(stored.operation, actor.id, reason, new Date())
    auditIdentity(c.env.DB, { source: { kind: 'webhook-endpoint', id: next.endpoint }, subject: { kind: 'outbox-operation', id: next.id } })
    // Only the delivery row changes: the incident, its timeline and its revision are never touched by a replay.
    const guard = deps.guard(c)
    const result = await c.env.DB.prepare(`UPDATE oc_outbox SET state=?,due_at=?,lease_expires=NULL,started=0,data=?,rev=rev+1 WHERE id=? AND rev=? AND state NOT IN ('queued','sending') AND ${guard.sql} AND EXISTS(SELECT 1 FROM oc_members WHERE id=? AND json_extract(data,'$.active')=1 AND json_extract(data,'$.role')='admin')`)
      .bind(next.state, next.dueAt, JSON.stringify(next), next.id, stored.rev, ...guard.values, actor.id).run()
    if (result.meta.changes !== 1) fail('The delivery changed or authority changed; reload and retry', 409)
    markDispatchDue()
    return c.json(next)
  })
}
