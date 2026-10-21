import { changeHmac } from '../changes/credentials'

/** Same convention as the signed inbound sources: HMAC-SHA256 over timestamp + "." + exact body, hex-encoded. */
export async function signedHeaders(secret: string, body: string, operation: { id: string; eventId: string; type: string; attempt: number; replays: number }, now = Date.now()) {
  const timestamp = String(Math.floor(now / 1000))
  return {
    'content-type': 'application/json',
    'user-agent': 'Oncall-Events/1',
    'x-oncall-timestamp': timestamp,
    'x-oncall-signature': await changeHmac(secret, timestamp + '.' + body),
    'x-oncall-operation-id': operation.id,
    'x-oncall-event-id': operation.eventId,
    'x-oncall-event-type': operation.type,
    'x-oncall-attempt': String(operation.attempt),
    'x-oncall-replay': String(operation.replays),
    'idempotency-key': operation.id,
  }
}
