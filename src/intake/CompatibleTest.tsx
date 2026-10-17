import { useEffect, useState } from 'react';
import { Form } from '../forms';
import type { IntakeSource } from './model';
import type { CompatibleProvider } from './provider-types';

export type IntakeRun = (path: string | (() => Promise<any>), data?: any, message?: string) => Promise<any>;
const protocols: {id: CompatibleProvider; name: string}[] = [
  {id: 'pagerduty-v2', name: 'PagerDuty Events v2'}, {id: 'pagerduty-v1', name: 'PagerDuty Events v1'},
  {id: 'opsgenie', name: 'Opsgenie Alert API'}, {id: 'splunk', name: 'Splunk On-Call'},
];
function compatibleRequest(provider: CompatibleProvider, secret: string, identity: string, title: string, recover: boolean) {
  const headers: Record<string, string> = {'Content-Type': 'application/json'};
  let path: string, body: Record<string, unknown>;
  if (provider === 'pagerduty-v2') {
    path = '/v2/enqueue';
    body = {routing_key: secret, event_action: recover ? 'resolve' : 'trigger', dedup_key: identity, payload: {summary: title, source: 'Oncall integration check', severity: 'warning'}};
  } else if (provider === 'pagerduty-v1') {
    path = '/generic/2010-04-15/create_event.json';
    body = {service_key: secret, event_type: recover ? 'resolve' : 'trigger', incident_key: identity, description: title, client: 'Oncall integration check'};
  } else if (provider === 'opsgenie') {
    path = recover ? '/v2/alerts/' + encodeURIComponent(identity) + '/close?identifierType=alias' : '/v2/alerts';
    headers.Authorization = 'GenieKey ' + secret;
    body = recover ? {source: 'Oncall integration check'} : {alias: identity, message: title, priority: 'P4', source: 'Oncall integration check'};
  } else {
    path = '/integrations/generic/20131114/alert/' + encodeURIComponent(secret) + '/oncall';
    body = {message_type: recover ? 'RECOVERY' : 'WARNING', entity_id: identity, entity_display_name: title, monitoring_tool: 'Oncall integration check'};
  }
  return {path, headers, body};
}
function requestExample(provider: CompatibleProvider, origin: string, title: string) {
  const request = compatibleRequest(provider, 'ONCALL_KEY_VARIABLE', 'ONCALL_ID_VARIABLE', title, false);
  const body = JSON.stringify(request.body, null, 2).replace('"ONCALL_KEY_VARIABLE"', 'key').replace('"ONCALL_ID_VARIABLE"', 'alertId');
  const headers = provider === 'opsgenie' ? "{ 'Content-Type': 'application/json', Authorization: 'GenieKey ' + key }" : "{ 'Content-Type': 'application/json' }";
  const url = provider === 'splunk' ? `${JSON.stringify(origin + '/integrations/generic/20131114/alert/')} + encodeURIComponent(key) + '/oncall'` : JSON.stringify(origin + request.path);
  return `node --input-type=module <<'ONCALL_REQUEST'
const key = process.env.ONCALL_INTAKE_KEY;
const alertId = process.env.ONCALL_ALERT_ID;
if (!key || !alertId) throw Error('Set ONCALL_INTAKE_KEY and ONCALL_ALERT_ID first');
let response;
try { response = await fetch(${url}, {
  method: 'POST',
  headers: ${headers},
  body: JSON.stringify(${body})
}); } catch { console.error('Receiver could not be reached'); process.exit(1); }
console.log('Receiver HTTP status:', response.status);
if (!response.ok) process.exitCode = 1;
ONCALL_REQUEST`;
}
async function send(provider: CompatibleProvider, secret: string, identity: string, title: string, recover: boolean) {
  const request = compatibleRequest(provider, secret, identity, title, recover);
  let response: Response;
  try { response = await fetch(request.path, {method: 'POST', headers: request.headers, body: JSON.stringify(request.body)}); }
  catch { throw Error('The compatible receiver could not be reached. Check your connection before sending again.'); }
  if (!response.ok) {
    const value = await response.json().catch(() => null) as Record<string, unknown> | null;
    const detail = Array.isArray(value?.errors) ? value.errors.filter((item: unknown) => typeof item === 'string').join('; ') : typeof value?.error === 'string' ? value.error : typeof value?.message === 'string' ? value.message : '';
    const safeDetail = detail.replaceAll(secret, '[redacted]').replaceAll(encodeURIComponent(secret), '[redacted]');
    throw Error(`Compatible receiver refused the request (HTTP ${response.status})${safeDetail ? ': ' + safeDetail : '.'}`);
  }
  return {status: response.status};
}

export function CompatibleTest({sources, serviceName, origin, busy, run}: {sources: IntakeSource[]; serviceName: (id: string) => string; origin: string; busy: boolean; run: IntakeRun}) {
  const [provider, setProvider] = useState<CompatibleProvider>('pagerduty-v2');
  const [sourceId, setSourceId] = useState(''), [secret, setSecret] = useState(''), [identity, setIdentity] = useState('');
  const [title, setTitle] = useState('Service latency above 2 seconds'), [action, setAction] = useState('trigger');
  const [status, setStatus] = useState(''), [sending, setSending] = useState(false), [copied, setCopied] = useState('');
  const source = sources.find(item => item.id === sourceId);
  const matches = source && (provider.startsWith('pagerduty-') ? source.provider === 'pagerduty' : source.provider === provider);
  useEffect(() => { setIdentity('integration-check-' + crypto.randomUUID()); }, []);
  const sample = requestExample(provider, origin, title);
  return <>
    <h3>Send a compatible request</h3>
    <label className="field"><span id="intake-protocol-label">Request protocol</span><select aria-labelledby="intake-protocol-label" disabled={busy || sending} value={provider} onChange={e => {setProvider(e.target.value as CompatibleProvider); setStatus(''); setCopied('');}}>{protocols.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    <p>Receiver: <code>{origin}{provider === 'pagerduty-v2' ? '/v2/enqueue' : provider === 'pagerduty-v1' ? '/generic/2010-04-15/create_event.json' : provider === 'opsgenie' ? '/v2/alerts' : '/integrations/generic/20131114/alert/<endpoint-key>/<routing-key>'}</code></p>
    <p>{provider === 'opsgenie' ? 'Authenticate with Authorization: GenieKey <integration-key>.' : provider === 'splunk' ? 'Only the endpoint key authenticates this request. The routing key is a label; it does not select another service. The example uses oncall as that label.' : 'Send the saved integration key as ' + (provider === 'pagerduty-v2' ? 'routing_key.' : 'service_key.')} Every request uses the service bound to that key. <a href="/docs/compatible-intake">Setup and protocol reference</a></p>
    <details className="intake-example"><summary>Sample request with private environment variables</summary>
      <p>In Bash, run <code>read -rs ONCALL_INTAKE_KEY</code>, paste the saved key at the hidden prompt and press Enter. Run <code>export ONCALL_INTAKE_KEY</code> and <code>export ONCALL_ALERT_ID="$(node -p 'crypto.randomUUID()')"</code>. Keep this alert ID for a recovery or a repeated trigger.</p>
      <label className="field">Node 22+ request<textarea readOnly rows={14} value={sample} spellCheck={false} /></label>
      <button type="button" disabled={!origin} onClick={async () => {try {await navigator.clipboard.writeText(sample); setCopied('Request copied.');} catch {setCopied('Select the request above and copy it.');}}}>Copy sample request</button>
      <p role="status">{copied}</p><p>Check the stored receipt below after sending. Clear the variables with <code>unset ONCALL_INTAKE_KEY ONCALL_ALERT_ID</code> when finished.</p>
    </details>
    <details><summary>Send a first compatible test</summary>
      <p>This sends a real request to this installation and stores a real alert or recovery. It sends no pages. Select a saved source and enter its key separately.</p>
      {!sources.some(item => item.active) ? <p>An administrator must save an active compatible source first.</p> : <Form busy={busy || sending} disabled={!origin} label="Send compatible test" onSubmit={async () => {
        setStatus(''); setSending(true);
        try {
          const result = await run(async () => {
            if (!source || !source.active || !matches) throw Error('Select an active source that matches the request protocol.');
            return send(provider, secret, identity, title, action === 'recover');
          }, undefined, 'Compatible request accepted; receipt list refreshed');
          if (result) {setSecret(''); setStatus(`Receiver accepted the ${action} request (HTTP ${result.status}). See its stored outcome in the receipt list. No page was sent.`);}
        } finally {setSending(false);}
        return false;
      }}>
        <label className="field"><span id="intake-test-source-label">Test source</span><select aria-labelledby="intake-test-source-label" required value={sourceId} onChange={e => {setSourceId(e.target.value); const selected = sources.find(item => item.id === e.target.value); if (selected) setProvider(selected.provider === 'pagerduty' ? 'pagerduty-v2' : selected.provider); setSecret(''); setStatus(''); setCopied('');}}><option value="">Choose a saved source</option>{sources.map(item => <option key={item.id} value={item.id} disabled={!item.active}>{item.name} · {item.provider} · {serviceName(item.service)}{item.active ? '' : ' · inactive'}</option>)}</select></label>
        {source && <p>Bound service: <strong>{serviceName(source.service)}</strong>. {!matches && 'Select the matching request protocol above.'}</p>}
        <label className="field">Test integration key<input type="password" autoComplete="off" required minLength={32} maxLength={200} value={secret} onChange={e => setSecret(e.target.value)} /></label>
        <label className="field"><span id="intake-test-action-label">Test action</span><select aria-labelledby="intake-test-action-label" value={action} onChange={e => {setAction(e.target.value); setStatus('');}}><option value="trigger">Trigger</option><option value="recover">Recover</option></select></label>
        <label className="field">Deduplication key / alias / entity ID<input required maxLength={200} value={identity} onChange={e => {setIdentity(e.target.value); setStatus('');}} /><small>Reuse this ID to deduplicate a trigger or recover its open generation. A later trigger after recovery opens a new generation.</small></label>
        <button type="button" onClick={() => {setIdentity('integration-check-' + crypto.randomUUID()); setStatus('');}}>Generate new alert ID</button>
        <label className="field">Test signal title<input required maxLength={300} value={title} onChange={e => {setTitle(e.target.value); setStatus(''); setCopied('');}} /></label>
      </Form>}
      <p role="status">{status}</p>
    </details>
  </>;
}
