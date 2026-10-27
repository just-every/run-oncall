import { useEffect, useState } from 'react';
import { Form } from '../forms';
import { request } from '../useWorkspace';
import { OneTimeSecret } from './OneTimeSecret';
import { addPath, integrationKinds, newIdentity, privateKey, sourcePath, type IntegrationKind, type IntegrationProps } from './catalog';
import './integrations.css';

export function AddIntegration(props: IntegrationProps & { kind?: string }) {
  const kind = props.kind && props.kind in integrationKinds ? props.kind as IntegrationKind : undefined;
  if (!kind) return <section className="panel padded integrations" aria-label="Add integration"><h2>Add integration</h2><ul className="integration-rows">{Object.entries(integrationKinds).map(([key, name]) => <li key={key}><a href={addPath(key)}>{name}</a></li>)}</ul></section>;
  return <IntegrationCreate key={kind} {...props} kind={kind} />;
}

export function IntegrationCreate({ state, admin, busy, run, kind }: IntegrationProps & { kind: IntegrationKind }) {
  const [name, setName] = useState(''), [service, setService] = useState(state.services[0]?.id ?? ''), [mode, setMode] = useState('bearer');
  const [provider, setProvider] = useState('native'), [repository, setRepository] = useState('');
  const [domain, setDomain] = useState<string | null | undefined>(), [readError, setReadError] = useState(false);
  const [created, setCreated] = useState<{ value: string; path: string }>();
  const readEmail = () => { setReadError(false); request('/api/email').then(value => setDomain(value.domain)).catch(() => setReadError(true)); };
  useEffect(() => { if (admin && kind === 'email') readEmail(); }, [admin, kind]);
  if (!admin) return <section className="panel padded integrations"><h2>{integrationKinds[kind]}</h2><p>An administrator can add integrations.</p></section>;
  if (created) return <section className="panel padded integrations"><h2>{name}</h2><OneTimeSecret value={created.value} label={kind === 'email' ? 'Private address' : 'Private key'} /><a className="integration-link" href={created.path}>Open source</a></section>;
  return <section className="panel padded integrations" aria-label="Create integration">
    <a className="integration-link" href="/settings/integrations">‹ Integrations</a><h2>{integrationKinds[kind]}</h2>
    {!state.services.length ? <p><a href="/settings/services">Add a service first</a></p> : kind === 'email' && domain === undefined ? <p role="status">{readError ? <>Email settings could not be read. <button onClick={readEmail}>Retry</button></> : 'Reading email settings…'}</p> : kind === 'email' && !domain ? <p>Inbound email needs a receiving domain. <a href="/docs/compatible-intake#integration-email">Set up email routing</a></p> : <Form busy={busy} label={kind === 'email' ? 'Create address' : 'Create source'} onSubmit={async () => {
      const id = newIdentity(kind === 'events' ? name.trim().slice(0, 80) || 'Events' : kind);
      let key = privateKey(kind === 'changes' && provider === 'pagerduty' ? 16 : 32);
      let path: string, data: Record<string, unknown>, namespace: string;
      if (kind === 'email') {
        key = 'oncall-' + privateKey(20); path = '/api/email/addresses'; namespace = 'email:';
        data = { id, name, service, owner: state.members.find(m => m.active && m.role === 'admin')?.id, localPart: key, mode: 'subject', fallback: 'subject', rules: [] };
      } else if (kind === 'events') {
        path = '/api/sources'; namespace = 'native:'; data = { id, key, mode, scopes: [service] };
      } else if (kind === 'changes') {
        if (provider === 'gitlab') key = 'whsec_' + btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
        path = '/api/changes/sources'; namespace = 'change:'; data = { id, name, provider, service, repository, mode, key, revision: 0 };
      } else {
        path = '/api/intake/sources'; namespace = 'intake:'; data = { id, name, provider: kind, service, key, revision: 0 };
      }
      const result = await run(path, data, 'Integration created');
      if (result) setCreated({ value: kind === 'email' ? key + '@' + domain : key, path: sourcePath(namespace + id) });
      return false;
    }}>
      <label className="field">Name<input aria-label="Name" autoFocus required maxLength={kind === 'events' ? 80 : kind === 'email' ? 100 : 200} value={name} onChange={e => setName(e.target.value)} /></label>
      {state.services.length > 1 ? <label className="field">Service<select aria-label="Service" value={service} onChange={e => setService(e.target.value)}>{state.services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label> : <p>{state.services[0].name}</p>}
      {kind === 'changes' && <><label className="field">Provider<select aria-label="Provider" value={provider} onChange={e => setProvider(e.target.value)}><option value="native">Events API</option><option value="pagerduty">PagerDuty</option><option value="github">GitHub</option><option value="gitlab">GitLab</option><option value="argocd">Argo CD</option><option value="terraform">Terraform Cloud</option></select></label>{['github', 'gitlab'].includes(provider) && <label className="field">Repository or project<input required maxLength={200} value={repository} onChange={e => setRepository(e.target.value)} /></label>}</>}
      {(kind === 'events' || kind === 'changes' && provider === 'native') && <label className="field">Authentication<select aria-label="Authentication" value={mode} onChange={e => setMode(e.target.value)}><option value="bearer">Bearer token</option><option value="signed">HMAC signature</option></select></label>}
    </Form>}
  </section>;
}
