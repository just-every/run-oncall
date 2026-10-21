import { useState } from 'react'
import type { State } from '../family/response-operations/domain'
import type { Run } from './ServiceAccess'

const stateNames: Record<string, string> = { queued: 'Queued', sending: 'Sending', sent: 'Sent (the receiver answered 2xx)', failed: 'Failed', uncertain: 'Uncertain (the receiver may have it)', interrupted: 'Interrupted before sending', refused: 'Refused at dispatch', held: 'Held (restored; replay to resume)' }
const reasons: Record<string, string> = {
  'endpoint-inactive': 'the endpoint is revoked or not approved', 'endpoint-not-approved': 'the endpoint has no approved signing secret', 'owner-not-authorized': 'the named owner is no longer an administrator',
  'endpoint-scope-changed': 'the endpoint no longer covers this event or service', 'data-access-changed': 'the incident is no longer available', 'token-revoked': 'the token that caused it was revoked',
  'token-scope-changed': 'the token no longer reaches this service', 'replay-authority-revoked': 'the administrator who replayed it lost authority', 'unsafe-endpoint': 'the endpoint address is not permitted',
  'credential-unreadable': 'the signing secret cannot be opened', 'rejected-by-receiver': 'the receiver rejected it', 'redirect-refused': 'the receiver answered with a redirect, which is never followed',
  'attempts-exhausted': 'every attempt failed', 'queue-full': 'the endpoint queue was full',
}
export function OutboxPanel({ state, busy, act, outbox }: { state: State; busy: boolean; act: Run; outbox: any }) {
  const [reason, setReason] = useState('Owner replay')
  const operations: any[] = outbox?.operations ?? []
  return <section className="panel padded change-sources service-access">
    <h2>Event delivery</h2>
    <p>{outbox?.schedule ?? 'Loading delivery state…'}</p>
    {outbox && <p>{Object.entries(outbox.counts as Record<string, number>).filter(([, count]) => count).map(([name, count]) => `${count} ${name}`).join(' · ') || 'No events have been queued.'}</p>}
    <button disabled={busy} onClick={() => act('/api/outbox/dispatch', {}, 'Due events delivered')}>Deliver due events now</button>
    <label className="field">Replay reason<input value={reason} maxLength={500} onChange={event => setReason(event.target.value)} /></label>
    <ul>{operations.map(operation => <li key={operation.id}>
      <strong>{operation.type}</strong> · {stateNames[operation.state] ?? operation.state}
      <p>{operation.payload.incident.title} · {state.webhookEndpoints?.find(endpoint => endpoint.id === operation.endpoint)?.name ?? 'endpoint'} · Operation <code>{operation.id}</code></p>
      <p>Attempt {operation.attempts} of {operation.maxAttempts}{operation.replays ? ` · replayed ${operation.replays}×` : ''}{operation.dueAt && operation.state !== 'sent' ? ` · due ${new Date(operation.dueAt).toLocaleString()}` : ''}{operation.reason ? ` · ${reasons[operation.reason] ?? operation.reason}` : ''}</p>
      {!['queued', 'sending'].includes(operation.state) && <button disabled={busy || !reason.trim()} onClick={() => act(`/api/outbox/${operation.id}/replay`, { reason }, 'Delivery queued again with the same operation ID')}>Replay {operation.type} to the receiver</button>}
    </li>)}</ul>
  </section>
}
