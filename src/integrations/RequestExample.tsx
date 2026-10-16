import { useEffect, useState } from 'react';
import type { Service } from '../family/response-operations/domain';

const quote = (value: string) => "'" + value.replace(/'/g, "'\\''") + "'";
export function RequestExample({ source, service, mode }: { source: string; service: Service; mode: string }) {
  const [origin, setOrigin] = useState('');
  const [copied, setCopied] = useState('');
  const [sample] = useState(() => ({ id: crypto.randomUUID(), observedAt: new Date().toISOString() }));
  useEffect(() => { setOrigin(location.origin); }, []);
  const payload = { source, eventId: `example-${service.id}-${sample.id}-trigger`, service: service.id, environment: service.environment, key: `${service.id}-latency`, generation: `example-${sample.id}`, intent: 'trigger', severity: 'warning', title: `${service.name} latency above 2 seconds`, observedAt: sample.observedAt, evidence: '' };
  const endpoint = origin + '/api/ingress/' + encodeURIComponent(source);
  const example = mode === 'signed' ? `node --input-type=module <<'ONCALL_REQUEST'
import { createHmac } from 'node:crypto';
const key = process.env.ONCALL_SOURCE_KEY;
if (!key) throw Error('Set ONCALL_SOURCE_KEY privately first');
const body = JSON.stringify(${JSON.stringify(payload, null, 2)});
const timestamp = String(Math.floor(Date.now() / 1000));
const signature = createHmac('sha256', key).update(timestamp + '.' + body).digest('hex');
const response = await fetch(${JSON.stringify(endpoint)}, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-oncall-timestamp': timestamp, 'x-oncall-signature': signature },
  body
});
console.log(response.status, await response.text());
if (!response.ok) process.exitCode = 1;
ONCALL_REQUEST` : `curl --fail-with-body ${quote(endpoint)} \\
  -H 'Content-Type: application/json' \\
  -H "Authorization: Bearer \${ONCALL_SOURCE_KEY:?Set ONCALL_SOURCE_KEY privately first}" \\
  --data-binary ${quote(JSON.stringify(payload, null, 2))}`;
  return <div className="ingress-example">
    <p>On the computer that will send events, open a terminal and run <code>bash</code>. Run <code>read -rs ONCALL_SOURCE_KEY</code>, paste your copied key at the hidden prompt and press Enter. Then run <code>export ONCALL_SOURCE_KEY</code>. This keeps the key out of command history. Now run this {mode === 'signed' ? 'Node 22+' : 'curl'} request. Afterwards, run <code>unset ONCALL_SOURCE_KEY</code>.</p>
    <p>The service ID, environment and app address are filled in for <strong>{service.name}</strong>. Save the source above before sending. For a first check without a terminal, expand <strong>Send an integration event</strong> below.</p>
    <label className="field"><span>Example request</span><textarea readOnly value={example} rows={12} spellCheck={false} /></label>
    <button type="button" disabled={!origin || !source} onClick={async () => {
      try { await navigator.clipboard.writeText(example); setCopied('Request copied.'); }
      catch { setCopied('Select the request above and copy it.'); }
    }}>Copy request</button><p role="status">{copied}</p>
    <p>A new event returns HTTP 201; copying this request again retries the same observation and returns 200. Reopening this page generates a new example event ID. Use a new event ID and observation time for the next observation. Change the example's title and alert identifiers to match your monitor. HTTP 409 means that event ID was already used with different content: restore the original request for a retry, or give a new observation a new event ID. HTTP 401 means the source, key or authentication mode does not match; 403 means the key is not allowed for that service.</p>
  </div>;
}
