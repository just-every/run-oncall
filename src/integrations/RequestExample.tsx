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
  return <details className="ingress-example"><summary>Sample request</summary>
    <p>Keep the private key in your sender’s environment, then run this request.</p>
    <label className="field"><span>Sample request</span><textarea aria-label="Sample request" readOnly value={example} rows={12} spellCheck={false} /></label>
    <button type="button" disabled={!origin || !source} onClick={async () => {
      try { await navigator.clipboard.writeText(example); setCopied('Copied'); }
      catch { setCopied('Select the request above and copy it.'); }
    }}>Copy sample request</button><p role="status">{copied}</p>
  </details>;
}
