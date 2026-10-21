// OC-053 durable categories. Definitions ride the workspace archive; reusable credentials never do.
export const apiPermissions = ['read', 'incidents:write', 'incidents:resolve', 'actions:write'] as const
export type ApiPermission = (typeof apiPermissions)[number]
export type ServiceAccount = {
  id: string; name: string; permissions: ApiPermission[]; services: string[]; active: boolean
  revision: number; createdBy: string; createdAt: string; updatedAt: string
}

export const eventTypes = ['incident.triggered', 'incident.acknowledged', 'incident.reassigned', 'incident.resolved',
  'incident.role_assigned', 'incident.followup_created', 'incident.followup_completed'] as const
export type EventType = (typeof eventTypes)[number]
export type WebhookEndpoint = {
  id: string; name: string; url: string; events: EventType[]; services: string[]; active: boolean
  revision: number; owner: string; createdAt: string; updatedAt: string
}

export const outboxStates = ['queued', 'sending', 'sent', 'failed', 'uncertain', 'interrupted', 'refused', 'held'] as const
export type OutboxState = (typeof outboxStates)[number]
export type Principal = { kind: 'member' | 'service-account' | 'source' | 'system'; id: string }
export type EventPayload = {
  specVersion: 'oncall.event.v1'; operationId: string; eventId: string; type: EventType; occurredAt: string
  service: { id: string; name: string; environment: string }
  incident: { id: string; title: string; severity: string; state: string; revision: number }
  actor: Principal
  change: Record<string, unknown>
  notice: string
}
export type OutboxAttempt = { at: string; attempt: number; outcome: string; status: number | null; by?: string; reason?: string }
export type OutboxOperation = {
  id: string; eventId: string; type: EventType; endpoint: string; owner: string; createdAt: string
  state: OutboxState; dueAt: number | null; leaseExpiresAt: number | null; started: boolean
  attempts: number; maxAttempts: number; replays: number
  origin: Principal; authorizedBy: Principal
  payload: EventPayload; history: OutboxAttempt[]
  reason?: string
}
export const terminalStates: readonly OutboxState[] = ['sent', 'failed', 'refused']
export const pendingStates: readonly OutboxState[] = ['queued', 'sending', 'uncertain', 'interrupted', 'held']
export const noticeText = 'Delivery of this event is not a human acknowledgment.'
export const maxOutboxRows = 1000, retainedTerminal = 300, pendingPerEndpoint = 100, maxAttempts = 5, maxReplays = 10
export const maxAccounts = 50, maxEndpoints = 5
