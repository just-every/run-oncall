import { useEffect, useState } from 'react';
import { nativeName } from './native-name';
import type { Service } from '../family/response-operations/domain';

const quote = (value: string) => "'" + value.replace(/'/g, "'\\''") + "'";
export function RequestExample({ source, service, mode, defaultOpen = false, routed = false }: { source: string; service: Service; mode: string; defaultOpen?: boolean; routed?: boolean }) {
  const [origin, setOrigin] = useState('');
  const [copied, setCopied] = useState('');
  const [observedAt] = useState(() => new Date().toISOString());
  useEffect(() => { setOrigin(location.origin); }, []);
  const payload = { source: routed ? source : nativeName(source), eventId: `latency-${observedAt}-trigger`, service: service.id, environment: service.environment, key: `${service.name} latency`, generation: `latency-${observedAt}`, intent: 'trigger', severity: 'warning', title: `${service.name} latency above 2 seconds`, observedAt, evidence: '' };
  const endpoint = origin + '/api/ingress/' + encodeURIComponent(source);
  const body = quote(JSON.stringify(payload, null, 2));
  const example = mode === 'signed' ? `body=${body}
timestamp=$(date +%s)
signature=$(printf '%s.%s' "$timestamp" "$body" | node --input-type=module -e '
import { createHmac } from "node:crypto";
const key = process.env.ONCALL_SOURCE_KEY;
if (!key) throw Error("Set ONCALL_SOURCE_KEY privately first");
let body = "";
for await (const chunk of process.stdin) body += chunk;
process.stdout.write(createHmac("sha256", key).update(body).digest("hex"));')
curl --fail-with-body ${quote(endpoint)} \\
  -H 'Content-Type: application/json' \\
  -H "x-oncall-timestamp: $timestamp" \\
  -H "x-oncall-signature: $signature" \\
  --data-binary "$body"` : `curl --fail-with-body ${quote(endpoint)} \\
  -H 'Content-Type: application/json' \\
  -H "Authorization: Bearer \${ONCALL_SOURCE_KEY:?Set ONCALL_SOURCE_KEY privately first}" \\
  --data-binary ${body}`;
  return <details className="ingress-example" open={defaultOpen}><summary>Sample request</summary>
    <label className="field">Ingress URL<input readOnly value={endpoint} /></label>
    <button type="button" disabled={!origin || !source} onClick={async () => {
      try { await navigator.clipboard.writeText(endpoint); setCopied('Ingress URL copied'); }
      catch { setCopied('Select the URL above and copy it.'); }
    }}>Copy ingress URL</button>
    <p>Keep the private key in your sender’s environment, then run this request.</p>
    {routed ? <p>The source value is this key’s ID, <code>{source}</code>, the same text as the end of the URL. The service value is only a hint: this key’s published routing rules choose the allowed service, so you can keep {service.name}’s internal ID from <a href="/settings/services">Services</a> or use another allowed service’s.</p> : <p>The service value is {service.name}’s internal ID, copied from <a href="/settings/services">Services</a>. The source ID in the URL was assigned when this source was created.</p>}
    <label className="field"><span>Sample request</span><textarea aria-label="Sample request" readOnly value={example} rows={12} spellCheck={false} /></label>
    <button type="button" disabled={!origin || !source} onClick={async () => {
      try { await navigator.clipboard.writeText(example); setCopied('Copied'); }
      catch { setCopied('Select the request above and copy it.'); }
    }}>Copy sample request</button><p role="status">{copied}</p>
  </details>;
}
