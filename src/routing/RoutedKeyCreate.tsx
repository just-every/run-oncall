import { useState } from 'react';
import { Form } from '../forms';
import { OneTimeSecret } from '../integrations/OneTimeSecret';
import { newIdentity, privateKey, type IntegrationProps } from '../integrations/catalog';

export function RoutedKeyCreate({ state, busy, run, defaultOpen = false, onCreated }: Pick<IntegrationProps, 'state' | 'busy' | 'run'> & { defaultOpen?: boolean; onCreated?: (id: string) => void }) {
  const [open, setOpen] = useState(defaultOpen), [name, setName] = useState(''), [provider, setProvider] = useState('pagerduty');
  const [team, setTeam] = useState(''), [scope, setScope] = useState<string[]>([]), [owner, setOwner] = useState(state.members.find(m => m.active && m.role === 'admin')?.id ?? '');
  const [authentication, setAuthentication] = useState('bearer'), [created, setCreated] = useState(''),[error,setError]=useState('');
  const teams = (state.teams??[]).filter(t=>t.active).sort((a,b)=>a.name.localeCompare(b.name));
  const services = state.services.filter(s=>!team||s.team===team);
  const owners = state.members.filter(m => m.active && ['admin', 'responder'].includes(m.role));
  return <details className="panel padded integrations routing-create" open={open} onToggle={e => setOpen(e.currentTarget.open)}><summary>Add routed key</summary>
    {created ? <OneTimeSecret value={created} onDone={() => { setCreated(''); setName(''); setOpen(false); }} /> : !state.services.length ? <p><a href="/settings/services">Add a service first</a></p> : <Form busy={busy} label="Create routed key" onSubmit={async () => {
      if(!scope.length){setError('Choose at least one service.');return false;}setError('');
      const id = newIdentity('routed'), key = privateKey();
      const result = await run('/api/routing/keys', { id, name, provider, scope, owner, key, ...(team?{team}:{}), revision: 0, rules: [], catchAll: null, ...(provider === 'native' ? { authentication } : {}) }, 'Routed key created');
      if (result) { setCreated(key); onCreated?.(id); }
      return false;
    }}>
      {error&&<p role="alert">{error}</p>}<label className="field">Name<input aria-label="Name" autoFocus={defaultOpen} required maxLength={200} value={name} onChange={e => setName(e.target.value)} /></label>
      <label className="field">Provider<select aria-label="Provider" value={provider} onChange={e => setProvider(e.target.value)}><option value="pagerduty">PagerDuty</option><option value="opsgenie">Opsgenie</option><option value="splunk">Splunk On-Call</option><option value="alertmanager">Alertmanager</option><option value="grafana">Grafana</option><option value="datadog">Datadog</option><option value="native">Events API</option></select></label>
      {owners.length > 1 ? <label className="field">Owner<select aria-label="Owner" value={owner} onChange={e => setOwner(e.target.value)}>{owners.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label> : <p>Owner · {owners[0]?.name}</p>}
      {teams.length>0&&<label className="field">Workspace or Team<select aria-label="Workspace or Team" value={team} onChange={e=>{const next=e.target.value;setTeam(next);setScope(scope.filter(id=>!next||state.services.find(s=>s.id===id)?.team===next));}}><option value="">Workspace</option>{teams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label>}
      {provider === 'native' && <label className="field">Authentication<select aria-label="Authentication" value={authentication} onChange={e => setAuthentication(e.target.value)}><option value="bearer">Bearer token</option><option value="signed">HMAC signature</option></select></label>}
      <fieldset className="routing-scope"><legend>Services</legend>{services.map(s => <label className="integration-checkbox" key={s.id}><input type="checkbox" checked={scope.includes(s.id)} onChange={e => setScope(e.target.checked ? [...scope, s.id] : scope.filter(id => id !== s.id))} />{s.name}</label>)}{!services.length&&<p>This team has no services yet.</p>}</fieldset>
    </Form>}
  </details>;
}
