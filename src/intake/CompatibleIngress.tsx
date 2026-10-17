import { useEffect, useState } from 'react';
import { Form } from '../forms';
import type { State } from '../family/response-operations/domain';
import type { IntakeProvider, IntakeReceipt, IntakeSource } from './model';
import { CompatibleTest, type IntakeRun } from './CompatibleTest';
import './intake.css';

const providerNames = {pagerduty: 'PagerDuty', opsgenie: 'Opsgenie', splunk: 'Splunk On-Call'};
function outcomeText(receipt: IntakeReceipt) {
  switch (receipt.outcome) {
    case 'opened': return 'Opened a new alert generation';
    case 'deduplicated': return 'Deduplicated into the open generation';
    case 'recovered': return 'Recovered the open alert generation';
    case 'acknowledged': return 'Source acknowledgement recorded as an integration claim; no human acknowledgement';
    case 'noted': return 'Source note recorded for the open generation';
    case 'no-effect': return 'No effect: no open generation matched this action';
  }
}
function IntakeReceipts({state, serviceName}: {state: State; serviceName: (id: string) => string}) {
  const [source, setSource] = useState('');
  const sources = state.intakeSources ?? [];
  const receipts = (state.intakeReceipts ?? []).filter(item => !source || item.source === source).reverse().sort((a, b) => b.acceptedAt.localeCompare(a.acceptedAt));
  const visible = receipts.slice(0, 20);
  return <div className="intake-receipts"><h3>Compatible intake receipts</h3>
    <p>Accepted requests record their outcomes here. An acceptance is not delivery or paging evidence. Source recovery does not resolve a declared incident.</p>
    <label className="field"><span id="intake-receipt-filter-label">Filter receipts by source</span><select aria-labelledby="intake-receipt-filter-label" value={source} onChange={e => setSource(e.target.value)}><option value="">All compatible sources</option>{sources.map(item => <option key={item.id} value={item.id}>{item.name} · {item.id}</option>)}</select></label>
    <p role="status">Showing {visible.length} of {receipts.length} receipts{source ? ' for this source' : ''}, newest first (up to 20).</p>
    {!visible.length ? <p>No accepted compatible requests{source ? ' for this source' : ''} yet.</p> : <ol className="intake-list">{visible.map(receipt => <li key={receipt.id}>
      <strong>{outcomeText(receipt)}</strong>
      <p>{sources.find(item => item.id === receipt.source)?.name ?? receipt.source} · {receipt.provider} · {serviceName(receipt.service)}</p>
      <p>{receipt.title || 'No title supplied for this action'}</p>
      <p>Source ID: <code>{receipt.source}</code> · Action: {receipt.action} · Outcome: {receipt.outcome}</p>
      <p>Alert key: <code>{receipt.key}</code></p>
      <p>Accepted: <time dateTime={receipt.acceptedAt}>{new Date(receipt.acceptedAt).toLocaleString()}</time></p>
      <p>Generation: {receipt.generation ? <code>{receipt.generation}</code> : 'none — no alert changed'}</p>
      <details><summary>Receipt details and source context</summary>
        <dl><dt>Receipt ID</dt><dd>{receipt.id}</dd><dt>Severity / priority</dt><dd>{receipt.severity}{receipt.priority ? ' / ' + receipt.priority : ''}</dd><dt>Reported sender</dt><dd>{receipt.sender || 'Not supplied'}</dd><dt>Source timestamp</dt><dd>{receipt.observedAt ?? 'Not supplied'}</dd><dt>Alert / event</dt><dd>{receipt.alert ?? 'None'} / {receipt.event ?? 'None'}</dd></dl>
        {receipt.truncated && <p>Source context was truncated to the receiver’s stored limits.</p>}
        <h4>Source links (stored as text)</h4>{receipt.links.length ? <ul>{receipt.links.map((url, index) => <li key={index}><code>{url}</code></li>)}</ul> : <p>No source links supplied.</p>}
        <h4>Bounded source details</h4><pre>{JSON.stringify(receipt.details, null, 2)}</pre>
      </details>
    </li>)}</ol>}
  </div>;
}

export function CompatibleIngress({state, admin, busy, run}: {state: State; admin: boolean; busy: boolean; run: IntakeRun}) {
  const [origin, setOrigin] = useState('');
  const [id, setId] = useState(''), [name, setName] = useState(''), [provider, setProvider] = useState<IntakeProvider>('pagerduty');
  const [service, setService] = useState(''), [key, setKey] = useState(''), [status, setStatus] = useState(''), [copyStatus, setCopyStatus] = useState('');
  const sources = state.intakeSources ?? [], previous = sources.find(item => item.id === id);
  const boundService = previous?.service ?? (service || state.services[0]?.id || '');
  const boundProvider = previous?.provider ?? provider;
  const serviceName = (serviceId: string) => state.services.find(item => item.id === serviceId)?.name ?? serviceId;
  useEffect(() => {setOrigin(window.location.origin);}, []);
  function configure(source?: IntakeSource) {
    setId(source?.id ?? ''); setName(source?.name ?? ''); setProvider(source?.provider ?? 'pagerduty'); setService(source?.service ?? ''); setKey(''); setStatus(''); setCopyStatus('');
  }
  return <section className="panel padded compatible-intake">
    <h2>Compatible alert intake</h2>
    <p>Connect PagerDuty, Opsgenie or Splunk On-Call shaped events to a known service. Oncall records alerts and coordinates incidents beside your existing pager. These requests send no pages.</p>
    <p>Each source has one fixed provider and service. Private keys are never returned after saving and are excluded from exports. Restored sources are inactive until an administrator configures a key in this installation.</p>
    {!sources.length ? <p>No compatible sources configured.</p> : <ul className="intake-list">{sources.map(source => <li key={source.id}>
      <strong>{source.name}</strong><p>{providerNames[source.provider]} · {serviceName(source.service)} · {source.active ? 'Active — local key configured' : 'Inactive — no usable local key; configure one to activate'}</p>
      <p>Source ID: <code>{source.id}</code> · Revision {source.revision}</p>
      {admin && <div className="intake-actions"><button type="button" disabled={busy} onClick={() => configure(source)}>Configure {source.name}</button>{source.active && <button type="button" disabled={busy} onClick={async () => {const result = await run('/api/intake/sources/' + encodeURIComponent(source.id) + '/revoke', {revision: source.revision}, 'Compatible source revoked'); if (result) {setKey(''); setStatus('Source revoked. Requests with its old key will be refused.');}}}>Revoke {source.name}</button>}</div>}
    </li>)}</ul>}
    {admin ? <>
      <h3>{previous ? 'Configure ' + previous.name : 'Create a compatible source'}</h3>
      {previous && <button type="button" disabled={busy} onClick={() => configure()}>Create another source</button>}
      {!state.services.length ? <p><a href="#services">Create a service first</a> to bind this source.</p> : <Form busy={busy} label={previous ? 'Save and rotate compatible key' : 'Save compatible source'} onSubmit={async () => {
        const result = await run('/api/intake/sources', {id, name, provider: boundProvider, service: boundService, key, revision: previous?.revision ?? 0}, 'Compatible source saved');
        if (result) {setKey(''); setCopyStatus(''); setStatus('Source saved. The key is now cleared here; use the private copy in your sender.');}
        return false;
      }}>
        <label className="field">Compatible source ID<input required maxLength={80} value={id} onChange={e => {const next = sources.find(item => item.id === e.target.value); setId(e.target.value); if (next) {setName(next.name); setProvider(next.provider); setService(next.service);} setKey(''); setStatus(''); setCopyStatus('');}} /><small>Use a distinct ID for each integration. Entering an existing ID configures that source.</small></label>
        <label className="field">Integration name<input required maxLength={200} value={name} onChange={e => {setName(e.target.value); setStatus('');}} /></label>
        <label className="field"><span id="intake-provider-label">Compatible provider</span><select aria-labelledby="intake-provider-label" value={boundProvider} disabled={!!previous} onChange={e => {setProvider(e.target.value as IntakeProvider); setStatus('');}}>{Object.entries(providerNames).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="field"><span id="intake-service-label">Bound service</span><select aria-labelledby="intake-service-label" value={boundService} disabled={!!previous} onChange={e => {setService(e.target.value); setStatus('');}}>{state.services.map(item => <option key={item.id} value={item.id}>{item.name} · {item.environment}</option>)}</select><small>Provider and service cannot be changed on an existing source. Create another source for a different binding.</small></label>
        <label className="field">Integration key (32–200 characters)<input type="password" autoComplete="new-password" required minLength={32} maxLength={200} value={key} onChange={e => {setKey(e.target.value); setStatus(''); setCopyStatus('');}} /><small>Generate and copy the key before saving. Saving an existing source rotates its key, so update your sender too.</small></label>
        <div className="intake-actions"><button type="button" onClick={() => {setKey(Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, '0')).join('')); setStatus(''); setCopyStatus('');}}>Generate integration key</button><button type="button" disabled={!key} onClick={async () => {try {await navigator.clipboard.writeText(key); setCopyStatus('Key copied. Store it privately in your sender before saving.');} catch {setCopyStatus('Clipboard unavailable. Select the password field and copy its value.');}}}>Copy integration key</button></div>
        <p role="status">{copyStatus}</p>
      </Form>}
    </> : <p>An administrator configures and revokes sources. Ask them for the source’s private key to send a request.</p>}
    <p role="status">{status}</p>
    <CompatibleTest sources={sources} serviceName={serviceName} origin={origin} busy={busy} run={run} />
    <IntakeReceipts state={state} serviceName={serviceName} />
  </section>;
}
