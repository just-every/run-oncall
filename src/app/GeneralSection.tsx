import { useState } from 'react';
import { useWorkspaceContext } from './shell/WorkspaceContext';
import { installationName } from '../identity';
import { request } from '../useWorkspace';

export function GeneralSection() {
  const { page, admin } = useWorkspaceContext();
  const [name, setName] = useState(installationName), [busy, setBusy] = useState(false), [error, setError] = useState('');
  if (page !== 'general') return null;
  return <section className="panel general-settings" aria-label="Installation name">
    <h2>Installation name</h2>
    <form onSubmit={async event => {
      event.preventDefault(); setBusy(true); setError('');
      try { await request('/api/installation', {name}); location.assign('/settings/general?saved=1'); }
      catch (error) { setError((error as Error).message); setBusy(false); }
    }}>
      <label className="field"><span>What should we call this?</span><input value={name} onChange={event => setName(event.target.value)} required maxLength={80} placeholder="Brightwell Support" disabled={!admin || busy} /></label>
      <p>Shown in your header, browser tab and sign-in pages.</p>
      {admin && <button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save name'}</button>}
      {new URLSearchParams(location.search).has('saved') && <p role="status">Installation name saved.</p>}
      {error && <p role="alert">{error}</p>}
    </form>
  </section>;
}
