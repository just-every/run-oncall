import { fail, text, type State } from '../family/response-operations/domain.ts'
import { checkEndpointUrl } from './egress.ts'
import { apiPermissions, eventTypes, maxAccounts, maxEndpoints, maxOutboxRows, outboxStates, pendingStates, noticeText,
  type OutboxOperation, type ServiceAccount, type WebhookEndpoint } from './types.ts'

export const erasedActor = 'erased-service-account'
export const actorId = (account: string) => 'sa:' + account
export const isServiceActorId = (id: unknown): id is string => typeof id === 'string' && id.startsWith('sa:')
/** A follow-up or timeline reference that may name a service account instead of a human member. */
export function serviceActorRef(state: State, id: unknown) {
  return id === erasedActor || (isServiceActorId(id) && !!state.serviceAccounts?.some(account => actorId(account.id) === id))
}

const validDate = (value: unknown) => typeof value === 'string' && /(?:Z|[+-]\d{2}:\d{2})$/i.test(value) && Number.isFinite(Date.parse(value))
const exact = (value: any, keys: string[], optional: string[] = []) => {
  if (!value || typeof value !== 'object' || Array.isArray(value) || keys.some(key => !Object.hasOwn(value, key)) ||
    Object.keys(value).some(key => !keys.includes(key) && !optional.includes(key))) fail('Invalid service API archive fields')
}
const distinctSubset = (values: unknown, allowed: readonly string[], name: string, max = 200) => {
  if (!Array.isArray(values) || !values.length || values.length > max || new Set(values).size !== values.length || values.some(value => typeof value !== 'string' || !allowed.includes(value))) fail(`Invalid ${name}`)
}

export function validateServiceApiArchive(state: State) {
  const accounts = state.serviceAccounts, endpoints = state.webhookEndpoints
  if (accounts !== undefined && (!Array.isArray(accounts) || accounts.length > maxAccounts)) fail('Invalid service accounts')
  if (endpoints !== undefined && (!Array.isArray(endpoints) || endpoints.length > maxEndpoints)) fail('Invalid webhook endpoints')
  const members = new Set(state.members.map(member => member.id)), services = state.services.map(service => service.id)
  for (const account of accounts ?? []) {
    exact(account, ['id', 'name', 'permissions', 'services', 'active', 'revision', 'createdBy', 'createdAt', 'updatedAt'])
    text(account.id, 'Service account ID', 100); text(account.name, 'Service account name', 100)
    distinctSubset(account.permissions, apiPermissions, 'service account permissions', 4)
    distinctSubset(account.services, services, 'service account scope')
    if (typeof account.active !== 'boolean' || !Number.isSafeInteger(account.revision) || account.revision < 1 || !members.has(account.createdBy) || !validDate(account.createdAt) || !validDate(account.updatedAt)) fail('Invalid service account')
  }
  if (new Set((accounts ?? []).map(account => account.id)).size !== (accounts ?? []).length) fail('Duplicate service account identities')
  for (const endpoint of endpoints ?? []) {
    exact(endpoint, ['id', 'name', 'url', 'events', 'services', 'active', 'revision', 'owner', 'createdAt', 'updatedAt'])
    text(endpoint.id, 'Webhook endpoint ID', 100); text(endpoint.name, 'Webhook endpoint name', 100)
    distinctSubset(endpoint.events, eventTypes, 'webhook event types', eventTypes.length)
    distinctSubset(endpoint.services, services, 'webhook service scope')
    // A restored definition may name a loopback receiver; whether it may send is decided again at dispatch.
    if (!checkEndpointUrl(endpoint.url, true).ok) fail('Invalid webhook endpoint URL')
    if (typeof endpoint.active !== 'boolean' || !Number.isSafeInteger(endpoint.revision) || endpoint.revision < 1 || !members.has(endpoint.owner) || !validDate(endpoint.createdAt) || !validDate(endpoint.updatedAt)) fail('Invalid webhook endpoint')
  }
  if (new Set((endpoints ?? []).map(endpoint => endpoint.id)).size !== (endpoints ?? []).length) fail('Duplicate webhook endpoint identities')
  if (state.outbox !== undefined) validateOutbox(state)
}

function validateOutbox(state: State) {
  const outbox = state.outbox!
  if (!Array.isArray(outbox) || outbox.length > maxOutboxRows) fail('Invalid outbox archive')
  const principal = (value: any) => {
    exact(value, ['kind', 'id'])
    if (!['member', 'service-account', 'source', 'system'].includes(value.kind)) fail('Invalid outbox principal')
    text(value.id, 'Principal', 200)
  }
  for (const operation of outbox) {
    exact(operation, ['id', 'eventId', 'type', 'endpoint', 'owner', 'createdAt', 'state', 'dueAt', 'leaseExpiresAt', 'started', 'attempts', 'maxAttempts', 'replays', 'origin', 'authorizedBy', 'payload', 'history'], ['reason'])
    text(operation.id, 'Operation ID', 100); text(operation.eventId, 'Event ID', 100)
    if (!eventTypes.includes(operation.type) || !outboxStates.includes(operation.state) || !validDate(operation.createdAt) ||
      !state.webhookEndpoints?.some(endpoint => endpoint.id === operation.endpoint) || !state.members.some(member => member.id === operation.owner) ||
      !Number.isSafeInteger(operation.attempts) || operation.attempts < 0 || !Number.isSafeInteger(operation.maxAttempts) || operation.maxAttempts < 1 ||
      !Number.isSafeInteger(operation.replays) || operation.replays < 0 || typeof operation.started !== 'boolean' ||
      (operation.dueAt !== null && !Number.isSafeInteger(operation.dueAt)) || (operation.leaseExpiresAt !== null && !Number.isSafeInteger(operation.leaseExpiresAt))) fail('Invalid outbox operation')
    principal(operation.origin); principal(operation.authorizedBy)
    const payload = operation.payload
    exact(payload, ['specVersion', 'operationId', 'eventId', 'type', 'occurredAt', 'service', 'incident', 'actor', 'change', 'notice'])
    if (payload.specVersion !== 'oncall.event.v1' || payload.operationId !== operation.id || payload.eventId !== operation.eventId || payload.type !== operation.type || payload.notice !== noticeText || !validDate(payload.occurredAt) ||
      !state.services.some(service => service.id === payload.service?.id) || !state.incidents.some(incident => incident.id === payload.incident?.id && incident.service === payload.service.id)) fail('Invalid outbox payload')
    if (!Array.isArray(operation.history) || operation.history.length > 20 || operation.history.some((entry: any) => !entry || !validDate(entry.at) || typeof entry.outcome !== 'string' || entry.outcome.length > 100)) fail('Invalid outbox history')
  }
  if (new Set(outbox.map(operation => operation.id)).size !== outbox.length) fail('Duplicate outbox operation identities')
}

/** Restored definitions are inactive history: tokens, signing secrets and approvals are installation-local authority. */
export function pauseServiceApi(state: State) {
  for (const account of state.serviceAccounts ?? []) account.active = false
  for (const endpoint of state.webhookEndpoints ?? []) endpoint.active = false
  // Nothing queued before a restore may resume without a fresh deliberate replay.
  for (const operation of state.outbox ?? []) if (pendingStates.includes(operation.state)) holdOperation(operation, 'Restored from an archive; replay to resume')
  return state
}
export function holdOperation(operation: OutboxOperation, reason: string) {
  operation.state = 'held'; operation.dueAt = null; operation.leaseExpiresAt = null; operation.started = false; operation.reason = reason
  return operation
}
