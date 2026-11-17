import {request} from '../useWorkspace';
import { useEffect, useState } from 'react';
import { nativeName } from './native-name';
import type { Service } from '../family/response-operations/domain';

const quote = (value: string) => "'" + value.replace(/'/g, "'\\''") + "'";
export function RequestExample({ source, service, mode, defaultOpen = false, routed = false, privateKey }: { source: string; service: Service; mode: string; defaultOpen?: boolean; routed?: boolean; privateKey?: string }) {
  const [origin, setOrigin] = useState('');
  const [copied, setCopied] = useState('');
  const [observedAt] = useState(() => new Date().toISOString());
  useEffect(() => { setOrigin(location.origin); }, []);
  const payload = { source: routed ? source : nativeName(source), eventId: `latency-${observedAt}-trigger`, service: service.id, environment: service.environment, key: `${service.name} latency`, generation: `latency-${observedAt}`, intent: 'trigger', severity: 'warning', title: `${service.name} latency above 2 seconds`, observedAt, evidence: '' };
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
  const readyCommand = async () => {
    if (routed) return example;
    const key = privateKey || (await request('/api/integrations/native/' + encodeURIComponent(source) + '/reveal', {})).key;
    return 'ONCALL_SOURCE_KEY=' + quote(key) + '\n' + example;
  };
  return <details className="ingress-example" open={defaultOpen}><summary>Sample request</summary>
    <label className="field">Ingress URL<input readOnly value={endpoint} /></label>
    <button type="button" disabled={!origin || !source} onClick={async () => {
      try { await navigator.clipboard.writeText(endpoint); setCopied('Ingress URL copied'); }
      catch { setCopied('Select the URL above and copy it.'); }
    }}>Copy ingress URL</button>
    {routed ? <p>Set <code>ONCALL_SOURCE_KEY</code> to this key’s private key in your terminal’s environment, then paste this command into a macOS, Linux or WSL terminal with curl installed.</p> : <p>This command uses the private key for {nativeName(source)}. Copying includes the key as <code>ONCALL_SOURCE_KEY</code>; keep the copied command private. Paste it into a macOS, Linux or WSL terminal with curl{mode === 'signed' && ' and OpenSSL'} installed.</p>}
    {routed ? <p>This sample is ready for {service.name}. The key’s published routing rules choose the service for each event.</p> : <p>This sample is ready to send events to {service.name}. Its service value is already filled in.</p>}
    <details><summary>Request identifiers</summary>
    {routed ? <p>The source value is this key’s ID, <code>{source}</code>, the same text as the end of the URL. The service value is only a hint: this key’s published routing rules choose the allowed service, so you can keep {service.name}’s internal ID from <a href="/settings/services">Services</a> or use another allowed service’s.</p> : <p>The service value is already filled in for {service.name}. The source ID in the URL was assigned when this source was created.</p>}
    </details>
    <button type="button" disabled={!origin || !source} onClick={async () => {
      try { await navigator.clipboard.writeText(await readyCommand()); setCopied('Copied'); }
      catch { setCopied('The command could not be copied. Check key access and clipboard permission, then retry.'); }
    }}>Copy sample request</button><p role="status">{copied}</p>
    <details><summary>View request code</summary>
    <label className="field"><span>Sample request</span><textarea aria-label="Sample request" readOnly value={routed ? example : example.replace(': "${ONCALL_SOURCE_KEY:?Set ONCALL_SOURCE_KEY privately first}"\n', '').replaceAll('${ONCALL_SOURCE_KEY:?Set ONCALL_SOURCE_KEY privately first}', '$ONCALL_SOURCE_KEY').replace(/^/, 'printf ' + quote('Private key for ' + nativeName(source) + ': ') + '\nIFS= read -r ONCALL_SOURCE_KEY\n')} rows={12} spellCheck={false} /></label>
    </details>
  </details>;
}
