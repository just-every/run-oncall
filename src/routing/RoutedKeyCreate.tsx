import { useState } from 'react';
import { Form } from '../forms';
import { OneTimeSecret } from '../integrations/OneTimeSecret';
import { newIdentity, privateKey, type IntegrationProps } from '../integrations/catalog';

export function RoutedKeyCreate({ state, busy, run, defaultOpen = false, onCreated }: Pick<IntegrationProps, 'state' | 'busy' | 'run'> & { defaultOpen?: boolean; onCreated?: (id: string) => void }) {
  const [open, setOpen] = useState(defaultOpen), [name, setName] = useState(''), [provider, setProvider] = useState('pagerduty');
  const [scope, setScope] = useState<string[]>([]), [owner, setOwner] = useState(state.members.find(m => m.active && m.role === 'admin')?.id ?? '');
  const [authentication, setAuthentication] = useState('bearer'), [created, setCreated] = useState(''),[error,setError]=useState('');
  const owners = state.members.filter(m => m.active && ['admin', 'responder'].includes(m.role));
  return <details className="panel padded integrations routing-create" open={open} onToggle={e => setOpen(e.currentTarget.open)}><summary>Add routed key</summary>
    {created ? <OneTimeSecret value={created} onDone={() => { setCreated(''); setName(''); setOpen(false); }} /> : !state.services.length ? <p><a href="/settings/services">Add a service first</a></p> : <Form busy={busy} label="Create routed key" onSubmit={async () => {
      if(!scope.length){setError('Choose at least one service.');return false;}setError('');
      const id = newIdentity('routed'), key = privateKey();
      const result = await run('/api/routing/keys', { id, name, provider, scope, owner, key, revision: 0, rules: [], catchAll: null, ...(provider === 'native' ? { authentication } : {}) }, 'Routed key created');
      if (result) { setCreated(key); onCreated?.(id); }
      return false;
    }}>
      {error&&<p role="alert">{error}</p>}<label className="field">Name<input aria-label="Name" autoFocus={defaultOpen} required maxLength={200} value={name} onChange={e => setName(e.target.value)} /></label>
      <label className="field">Provider<select aria-label="Provider" value={provider} onChange={e => setProvider(e.target.value)}><option value="pagerduty">PagerDuty</option><option value="opsgenie">Opsgenie</option><option value="splunk">Splunk On-Call</option><option value="alertmanager">Alertmanager</option><option value="grafana">Grafana</option><option value="datadog">Datadog</option><option value="native">Events API</option></select></label>
      {owners.length > 1 ? <label className="field">Owner<select aria-label="Owner" value={owner} onChange={e => setOwner(e.target.value)}>{owners.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label> : <p>Owner · {owners[0]?.name}</p>}
      <p>Workspace key</p><details><summary>Team ownership</summary><p>Team-owned keys are not available in this installation. Use a workspace key.</p></details>
      {provider === 'native' && <label className="field">Authentication<select aria-label="Authentication" value={authentication} onChange={e => setAuthentication(e.target.value)}><option value="bearer">Bearer token</option><option value="signed">HMAC signature</option></select></label>}
      <fieldset className="routing-scope"><legend>Services</legend>{state.services.map(s => <label className="integration-checkbox" key={s.id}><input type="checkbox" checked={scope.includes(s.id)} onChange={e => setScope(e.target.checked ? [...scope, s.id] : scope.filter(id => id !== s.id))} />{s.name}</label>)}</fieldset>
    </Form>}
  </details>;
}
