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
    <p>Set <code>ONCALL_SOURCE_KEY</code> to this source’s private key in your terminal’s environment, then paste this command into a macOS, Linux or WSL terminal. Check <code>curl --version</code> first. It uses curl and standard shell tools; no Node.js is needed.</p>
    <label className="field">Sample request<textarea aria-label="Sample request" readOnly rows={12} spellCheck={false} value={sample} /></label>
    <button type="button" disabled={!origin} onClick={async () => {
      try { await navigator.clipboard.writeText(sample); setCopied('Copied'); }
      catch { setCopied('Select the request above and copy it.'); }
    }}>Copy sample request</button>
    {copied && <p role="status">{copied}</p>}
  </details>;
}
