import { useEffect, useState } from 'react';
import type { Service } from '../family/response-operations/domain';

const quote = (value: string) => "'" + value.replace(/'/g, "'\\''") + "'";
export function RequestExample({ source, service, mode }: { source: string; service: Service; mode: string }) {
  const [origin, setOrigin] = useState('');
  const [copied, setCopied] = useState('');
  const [observedAt] = useState(() => new Date().toISOString());
  useEffect(() => { setOrigin(location.origin); }, []);
  const payload = { source, eventId: 'checkout-latency-001-trigger', service: service.id, environment: service.environment, key: 'checkout-latency', generation: 'checkout-latency-001', intent: 'trigger', severity: 'warning', title: 'Checkout latency above 2 seconds', observedAt, evidence: '' };
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
    <p>On the same computer, set the <code>ONCALL_SOURCE_KEY</code> environment variable privately to the key you copied, then run this {mode === 'signed' ? 'Node 22+' : 'curl'} request. The service ID, environment and local address are filled in for <strong>{service.name}</strong>. Save the source above before sending.</p>
    <label className="field"><span>Example request</span><textarea readOnly value={example} rows={12} spellCheck={false} /></label>
    <button type="button" disabled={!origin || !source} onClick={async () => {
      try { await navigator.clipboard.writeText(example); setCopied('Request copied.'); }
      catch { setCopied('Select the request above and copy it.'); }
    }}>Copy request</button><p role="status">{copied}</p>
    <p>A new event returns HTTP 201; an identical retry returns 200. Use a new event ID and observation time for the next observation. Change the example's title and alert identifiers to match your monitor. HTTP 401 means the source, key or authentication mode does not match; 403 means the key is not allowed for that service.</p>
  </div>;
}
