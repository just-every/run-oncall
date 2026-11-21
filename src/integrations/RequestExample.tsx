import { useEffect, useState } from 'react';
import { nativeName } from './native-name';
import type { Service } from '../family/response-operations/domain';

const quote = (value: string) => "'" + value.replace(/'/g, "'\\''") + "'";
export function RequestExample({ source, service, mode, defaultOpen = false, routed = false, singleService = false }: { source: string; service: Service; mode: string; defaultOpen?: boolean; routed?: boolean; singleService?: boolean }) {
  const [origin, setOrigin] = useState('');
  const [copied, setCopied] = useState('');
  const [observedAt] = useState(() => new Date().toISOString());
  useEffect(() => { setOrigin(location.origin); }, []);
  const payload = { source: routed ? source : nativeName(source), eventId: `latency-${observedAt}-trigger`, ...(singleService ? {} : {service: service.id}), environment: service.environment, key: `${service.name} latency`, generation: `latency-${observedAt}`, intent: 'trigger', severity: 'warning', title: `${service.name} latency above 2 seconds`, observedAt, evidence: '' };
  const endpoint = origin + '/api/ingress/' + encodeURIComponent(source);
  const body = quote(JSON.stringify(payload, null, 2));
  const example = mode === 'signed' ? `: "\${ONCALL_SOURCE_KEY:?Set ONCALL_SOURCE_KEY privately first}"
body=${body}
timestamp=$(date +%s)
signature=$(printf '%s.%s' "$timestamp" "$body" | openssl dgst -sha256 -hmac "\${ONCALL_SOURCE_KEY:?Set ONCALL_SOURCE_KEY privately first}" -binary | od -An -v -tx1 | tr -d ' \\n')
curl --fail-with-body ${quote(endpoint)} \\
  -H 'Content-Type: application/json' \\
  -H "x-oncall-timestamp: $timestamp" \\
  -H "x-oncall-signature: $signature" \\
  --data-binary "$body"` : `curl --fail-with-body ${quote(endpoint)} \\
  -H 'Content-Type: application/json' \\
  -H "Authorization: Bearer \${ONCALL_SOURCE_KEY:?Set ONCALL_SOURCE_KEY privately first}" \\
  --data-binary ${body}`;
  const copyRequest = <button type="button" disabled={!origin || !source} onClick={async () => {
    try { await navigator.clipboard.writeText(example); setCopied('Copied'); }
    catch { setCopied('Open the request below and copy it.'); }
  }}>Copy sample request</button>;
  return <details className="ingress-example" open={defaultOpen}><summary>Sample request</summary>
    <label className="field">Ingress URL{singleService ? <textarea aria-label="Ingress URL" className="ingress-url" readOnly rows={2} spellCheck={false} value={endpoint} /> : <input readOnly value={endpoint} />}</label>
    <div className="intake-actions"><button type="button" disabled={!origin || !source} onClick={async () => {
      try { await navigator.clipboard.writeText(endpoint); setCopied('Ingress URL copied'); }
      catch { setCopied('Select the URL above and copy it.'); }
    }}>Copy ingress URL</button>{singleService && copyRequest}</div>
    {singleService && <p role="status">{copied}</p>}
    <p>Set <code>ONCALL_SOURCE_KEY</code> to the private key in your sender’s environment, then paste this request into a macOS, Linux or WSL terminal. It uses curl{mode === 'signed' ? ', OpenSSL and standard shell tools' : ''}; no Node.js is needed. Check <code>curl --version</code>{mode === 'signed' && <> and <code>openssl version</code></>} first.</p>
    {routed ? <p>This sample is ready for {service.name}. The key’s published routing rules choose the service for each event.</p> : <p>This sample sends events to {service.name}. {singleService ? 'This source is already linked to that service.' : 'Its service value is already filled in.'}</p>}
    <details><summary>Request identifiers</summary>
    {routed ? <p>The source value is this key’s ID, <code>{source}</code>, the same text as the end of the URL. The service value is only a hint: this key’s published routing rules choose the allowed service, so you can keep {service.name}’s internal ID from <a href="/settings/services">Services</a> or use another allowed service’s.</p> : <p>{singleService ? 'Oncall uses the service chosen when you created this source.' : <>The service value comes from <a href="/settings/services">Services</a> and is already filled in for {service.name}.</>} The source ID is the last part of the ingress URL.</p>}
    </details>
    {!singleService && <>{copyRequest}<p role="status">{copied}</p></>}
    <details><summary>View request code</summary>
    <label className="field"><span>Sample request</span><textarea aria-label="Sample request" readOnly value={example} rows={12} spellCheck={false} /></label>
    </details>
  </details>;
}
