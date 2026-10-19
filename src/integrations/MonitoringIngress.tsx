import { useState } from 'react';
import { Form } from '../forms';
import type { Service } from '../family/response-operations/domain';
import { IntegrationEvent } from './IntegrationEvent';
import { RequestExample } from './RequestExample';
import { NativeSourceList } from './NativeSourceList';
import './ingress.css';

type Run = (path: string | (() => Promise<any>), data?: unknown, success?: string | ((value: any) => string)) => Promise<any>;
export function MonitoringIngress({ admin, services, busy, run }: { admin: boolean; services: Service[]; busy: boolean; run: Run }) {
  const [source, setSource] = useState('monitoring');
  const [secret, setSecret] = useState('');
  const [mode, setMode] = useState('bearer');
  const [serviceId, setServiceId] = useState('');
  const [saved, setSaved] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [copyStatus, setCopyStatus] = useState('');
  const service = services.find(item => item.id === serviceId) ?? services[0];
  const changed = () => { setSaved(false); setCopyStatus(''); };
  async function copyKey() {
    try { await navigator.clipboard.writeText(secret); setCopyStatus('Key copied. Save it privately in your monitoring tool.'); }
    catch { setCopyStatus('Clipboard unavailable. Select the key in the field and copy it.'); }
  }
  return <section className="panel padded ingress">
    <h2>Monitoring ingress</h2>
    <p>Connect your monitoring to this installation’s app address. Hosted Oncall records alert events and coordinates incidents beside your existing pager. Keep that pager active: Oncall sends no pages and has no independent standby.</p>
    {!services.length ? <p><a href="#services">Create a service first</a> so Oncall knows what the signal affects.</p> : <>
      {admin ? <>
        <h3>1. Create a monitoring source</h3>
        <p>A source is one monitoring tool or sender. Its key can send events for the service you allow below. It cannot read the workspace or sign in. Keys stay in this installation: bearer keys as a digest, HMAC keys encrypted with the installation key. They are never shown again and are excluded from exports.</p>
        <Form busy={busy} label="Save scoped source" onSubmit={async () => {
          const result = await run('/api/sources', { id: source, key: secret, mode, scopes: [service.id] }, 'Monitoring source saved');
          if (result) { setSaved(true); setSavedCount(n => n + 1); }
          return false;
        }}>
          <label className="field"><span id="ingress-source-label">Source ID</span><input name="id" aria-labelledby="ingress-source-label" required maxLength={100} value={source} onChange={e => { setSource(e.target.value); changed(); }} aria-describedby="source-help" /><small id="source-help">Choose a short name, such as monitoring or checkout-monitor. Use this same name in the request URL and event.</small></label>
          <label className="field"><span id="ingress-key-label">Source key (32+ characters)</span><input name="key" aria-labelledby="ingress-key-label" type="password" required minLength={32} maxLength={200} value={secret} onChange={e => { setSecret(e.target.value); changed(); }} aria-describedby="key-help" /><small id="key-help">Generate a random private key, then copy it to your sender's secret settings. Keep it out of source code and shared requests. Saving an existing Source ID replaces its key and access settings; update the sender too.</small></label>
          <div className="ingress-actions"><button type="button" onClick={() => { setSecret(Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, '0')).join('')); changed(); }}>Generate key</button><button type="button" disabled={!secret} onClick={copyKey}>Copy key</button></div>
          <p role="status">{copyStatus}</p>
          <label className="field"><span id="ingress-auth-label">Authentication</span><select name="mode" aria-labelledby="ingress-auth-label" value={mode} onChange={e => { setMode(e.target.value); changed(); }} aria-describedby="auth-help"><option value="bearer">Bearer token (recommended)</option><option value="signed">HMAC signature</option></select><small id="auth-help">Bearer sends the private key in the Authorization header and is the simplest setup. HMAC keeps the key out of the request and signs its exact body with SHA-256 plus a timestamp within five minutes. Choose HMAC only if your sender can calculate that signature; the two modes are not interchangeable.</small></label>
          <label className="field"><span id="ingress-service-label">Allowed service</span><select name="service" aria-labelledby="ingress-service-label" value={service.id} onChange={e => { setServiceId(e.target.value); changed(); }}>{services.map(item => <option key={item.id} value={item.id}>{item.name} · {item.environment}</option>)}</select><small>Only this service may receive events with this key.</small></label>
        </Form>
        {saved && <p role="status">Source saved. Use its key with the request below, or send a test event here.</p>}
        <NativeSourceList busy={busy} run={run} saved={savedCount} />
      </> : <p>An administrator must create a source and give you its ID, private key, authentication mode and allowed service.</p>}
      <h3>2. Send the first event</h3>
      <RequestExample source={source.trim()} service={service} mode={mode} />
      <IntegrationEvent source={source.trim()} secret={secret} mode={mode} service={service} services={services} busy={busy} run={run} />
    </>}
    <p className="muted">Requests are limited to 64 KiB. An accepted event is stored here; it does not page anyone. <a href="/docs/incidents#send-an-alert-event">Full request and response reference</a></p>
  </section>;
}
