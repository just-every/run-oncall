import { useState } from 'react'
import { Form } from '../forms'
import type { State } from '../family/response-operations/domain'
import { apiPermissions, type ApiPermission } from './types'
import type { AccountRow, Run } from './ServiceAccess'

const permissionNames: Record<ApiPermission, string> = {
  read: 'Read services, schedules, incidents, follow-ups, analytics and integration state',
  'incidents:write': 'Declare, acknowledge, reassign and assign roles on incidents',
  'incidents:resolve': 'Resolve incidents with automation-supplied recovery evidence',
  'actions:write': 'Create and complete follow-ups',
}
export function toggle<T>(list: T[], value: T) { return list.includes(value) ? list.filter(item => item !== value) : [...list, value] }

export function AccountsPanel({ state, busy, act, accounts }: { state: State; busy: boolean; act: Run; accounts: AccountRow[] | null }) {
  const [id, setId] = useState<string | undefined>(), [name, setName] = useState(''), [revision, setRevision] = useState(0)
  const [permissions, setPermissions] = useState<ApiPermission[]>(['read']), [services, setServices] = useState<string[]>([])
  const [confirmErase, setConfirmErase] = useState('')
  const reset = () => { setId(undefined); setName(''); setRevision(0); setPermissions(['read']); setServices([]) }
  return <section className="panel padded change-sources service-access">
    <h2>Service accounts</h2>
    <p>Scoped machine tokens for the versioned API. A token reaches only the services you choose and never carries a human role: it cannot manage members, services or policies, and a person must still be named to take responsibility. <a href="/docs/api">API reference</a></p>
    {accounts === null ? <p>Loading service accounts…</p> : !accounts.length ? <p>No service accounts yet. Create one to let a deploy tool or chat bot read and update incidents.</p> :
      <ul>{accounts.map(account => <li key={account.id}>
        <strong>{account.name}</strong> · {account.active ? 'active' : 'revoked'}
        <p>Services: {account.services.map(service => state.services.find(candidate => candidate.id === service)?.name ?? 'unknown').join(', ')} · Permissions: {account.permissions.join(', ')}</p>
        <p>Token: {account.active ? 'held as a digest; never shown' : 'none'} · Last used: {account.lastUsedAt ? new Date(account.lastUsedAt).toLocaleString() : 'never'}{account.tokenRotatedAt && ` · Rotated ${new Date(account.tokenRotatedAt).toLocaleString()}`}</p>
        {account.active && <>
          <button disabled={busy} onClick={() => { setId(account.id); setName(account.name); setRevision(account.revision); setPermissions(account.permissions); setServices(account.services) }}>Configure {account.name}</button>
          <button disabled={busy} onClick={() => act(`/api/service-accounts/${account.id}/rotate`, { revision: account.revision }, 'Token rotated')}>Rotate token for {account.name}</button>
          <button disabled={busy} onClick={() => act(`/api/service-accounts/${account.id}/revoke`, { revision: account.revision }, 'Service account revoked')}>Revoke {account.name}</button>
        </>}
        {!account.active && (confirmErase === account.id
          ? <button disabled={busy} onClick={() => { setConfirmErase(''); act(`/api/service-accounts/${account.id}/erase`, { revision: account.revision, confirmation: `erase ${account.id}` }, 'Service account erased') }}>Confirm: erase {account.name} and its history links</button>
          : <button disabled={busy} onClick={() => setConfirmErase(account.id)}>Erase {account.name}</button>)}
      </li>)}</ul>}
    {!state.services.length ? <p>Create a service first.</p> : <Form busy={busy} label={id ? 'Save service account' : 'Create service account'} onSubmit={async () => {
      const result = await act('/api/service-accounts', { id, name, permissions, services, revision }, id ? 'Service account saved' : 'Service account created')
      if (result) reset()
      return false
    }}>
      <label className="field">Service account name<input required maxLength={100} value={name} onChange={event => setName(event.target.value)} /></label>
      <fieldset className="service-access-choices"><legend>Services this token may reach</legend>
        {state.services.map(service => <label key={service.id} className="dependency-choice"><input type="checkbox" checked={services.includes(service.id)} onChange={() => setServices(toggle(services, service.id))} />{service.name} · {service.environment}</label>)}
      </fieldset>
      <fieldset className="service-access-choices"><legend>Permissions</legend>
        {apiPermissions.map(permission => <label key={permission} className="dependency-choice"><input type="checkbox" checked={permissions.includes(permission)} disabled={permission === 'read'} onChange={() => setPermissions(toggle(permissions, permission))} />{permissionNames[permission]}</label>)}
      </fieldset>
      {id && <button type="button" onClick={reset}>Create a new account instead</button>}
    </Form>}
  </section>
}
