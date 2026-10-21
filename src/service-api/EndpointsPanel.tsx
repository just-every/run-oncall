import { useState } from 'react'
import { Form } from '../forms'
import type { State } from '../family/response-operations/domain'
import { eventTypes, type EventType } from './types'
import { toggle } from './AccountsPanel'
import type { Run } from './ServiceAccess'

export function EndpointsPanel({ state, busy, act }: { state: State; busy: boolean; act: Run }) {
  const [id, setId] = useState<string | undefined>(), [name, setName] = useState(''), [url, setUrl] = useState(''), [revision, setRevision] = useState(0)
  const [events, setEvents] = useState<EventType[]>([...eventTypes]), [services, setServices] = useState<string[]>([])
  const reset = () => { setId(undefined); setName(''); setUrl(''); setRevision(0); setEvents([...eventTypes]); setServices([]) }
  const endpoints = state.webhookEndpoints ?? []
  return <section className="panel padded change-sources service-access">
    <h2>Event endpoints</h2>
    <p>Signed incident events are sent to the HTTPS endpoint you name: trigger, acknowledgment, reassignment, resolution, role and follow-up changes. Each receives incident identity, state and the one change, never timelines, runbooks or contacts. Delivery to an endpoint is not a human acknowledgment, and no page is sent.</p>
    {!endpoints.length ? <p>No endpoints yet.</p> : <ul>{endpoints.map(endpoint => <li key={endpoint.id}>
      <strong>{endpoint.name}</strong> · {endpoint.active ? 'approved' : 'inactive — rotate the secret to approve it again'}
      <p><code>{endpoint.url}</code></p>
      <p>Events: {endpoint.events.join(', ')} · Services: {endpoint.services.map(service => state.services.find(candidate => candidate.id === service)?.name ?? 'unknown').join(', ')} · Owner: {state.members.find(member => member.id === endpoint.owner)?.name ?? 'unknown'}</p>
      <button disabled={busy} onClick={() => { setId(endpoint.id); setName(endpoint.name); setUrl(endpoint.url); setRevision(endpoint.revision); setEvents(endpoint.events); setServices(endpoint.services) }}>Configure {endpoint.name}</button>
      <button disabled={busy} onClick={() => act(`/api/webhooks/${endpoint.id}/rotate`, { revision: endpoint.revision }, 'Signing secret rotated and endpoint approved')}>Rotate secret and approve {endpoint.name}</button>
      {endpoint.active && <button disabled={busy} onClick={() => act(`/api/webhooks/${endpoint.id}/revoke`, { revision: endpoint.revision }, 'Endpoint revoked')}>Revoke {endpoint.name}</button>}
    </li>)}</ul>}
    {!state.services.length ? <p>Create a service first.</p> : <Form busy={busy} label={id ? 'Save event endpoint' : 'Create event endpoint'} onSubmit={async () => {
      const result = await act('/api/webhooks', { id, name, url, events, services, revision }, id ? 'Endpoint saved' : 'Endpoint created')
      if (result) reset()
      return false
    }}>
      <label className="field">Endpoint name<input required maxLength={100} value={name} onChange={event => setName(event.target.value)} /></label>
      <label className="field">Endpoint URL<input required type="url" maxLength={500} value={url} placeholder="https://hooks.example.com/oncall" onChange={event => setUrl(event.target.value)} /></label>
      <fieldset className="service-access-choices"><legend>Events to send</legend>
        {eventTypes.map(type => <label key={type} className="dependency-choice"><input type="checkbox" checked={events.includes(type)} onChange={() => setEvents(toggle(events, type))} />{type}</label>)}
      </fieldset>
      <fieldset className="service-access-choices"><legend>Services whose events may leave this installation</legend>
        {state.services.map(service => <label key={service.id} className="dependency-choice"><input type="checkbox" checked={services.includes(service.id)} onChange={() => setServices(toggle(services, service.id))} />{service.name} · {service.environment}</label>)}
      </fieldset>
      <p>HTTPS on a public hostname only. No credentials, query string or redirects. A plain-HTTP loopback receiver is accepted only on a local installation.</p>
      {id && <button type="button" onClick={reset}>Create a new endpoint instead</button>}
    </Form>}
  </section>
}
