import { useEffect, useState } from 'react';
import { request } from '../useWorkspace';

type Run = (path: string, data?: unknown, success?: string) => Promise<any>;
type Listed = { id: string; authentication: 'signed' | 'bearer'; custody: string; scopes: string[] };
// Secret-free definitions only: the server never returns a source key after saving.
export function NativeSourceList({ busy, run, saved }: { busy: boolean; run: Run; saved: number }) {
  const [sources, setSources] = useState<Listed[] | null>(null), [error, setError] = useState(''), [revoked, setRevoked] = useState(0);
  useEffect(() => {
    let live = true; setError('');
    request('/api/sources').then(value => { if (live) setSources(value.sources); }).catch(e => { if (live) setError(e.message); });
    return () => { live = false; };
  }, [saved, revoked]);
  return <div className="ingress-sources">
    <h3>Configured sources</h3>
    {error && <p role="alert">{error}</p>}
    {sources && !sources.length && <p>No monitoring sources yet.</p>}
    {sources && sources.length > 0 && <ul>{sources.map(source => <li key={source.id}>
      <p><strong><code>{source.id}</code></strong> · {source.authentication === 'signed' ? 'HMAC signature' : 'Bearer token'} · key {source.custody} · allowed services: {source.scopes.join(', ')}</p>
      <button type="button" disabled={busy} onClick={async () => { if (await run('/api/sources/' + encodeURIComponent(source.id) + '/revoke', {}, 'Source revoked; its key no longer admits events')) setRevoked(n => n + 1); }}>Revoke {source.id}</button>
    </li>)}</ul>}
    <p className="muted">Keys are never shown after saving. Revoking stops new events at once; accepted events stay in history.</p>
  </div>;
}
