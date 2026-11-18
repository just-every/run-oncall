import {request} from '../useWorkspace';
import { useEffect, useState } from 'react';
import { providerSample } from './sender';
import type { SourceRecord } from './catalog';
import type { Service } from '../family/response-operations/domain';

/** One terminal recipe for both service-bound and routed compatible sources. */
export function ProviderRequest({ source, service, defaultOpen = false }: { source: SourceRecord; service: Service; defaultOpen?: boolean }) {
  const [origin, setOrigin] = useState(''), [copied, setCopied] = useState('');
  const [template] = useState(() => providerSample(source, service, 'ONCALL_RECEIVER_ORIGIN'));
  useEffect(() => { setOrigin(location.origin); }, []);
  const sample = template.replace('ONCALL_RECEIVER_ORIGIN', origin);
  return <details className="ingress-example" open={defaultOpen}><summary>Sample request</summary>
<p>This command uses the private key for {source.name}. Copying includes it as <code>ONCALL_SOURCE_KEY</code>; keep the command private. Paste it into a macOS, Linux or WSL terminal with curl installed.</p>
    <label className="field">Sample request<textarea aria-label="Sample request" readOnly rows={12} spellCheck={false} value={sample} /></label>
    <button type="button" disabled={!origin} onClick={async () => {
      try { const key = (await request('/api/integrations/intake/' + encodeURIComponent(source.id.slice(source.id.indexOf(':') + 1)) + '/reveal', {})).key; const quote = (value: string) => "'" + value.replace(/'/g, "'\\''") + "'"; await navigator.clipboard.writeText('ONCALL_SOURCE_KEY=' + quote(key) + '\n' + sample); setCopied('Copied'); }
      catch { setCopied('The command could not be copied. Check key access and clipboard permission, then retry.'); }
    }}>Copy sample request</button>
    {copied && <p role="status">{copied}</p>}
  </details>;
}
