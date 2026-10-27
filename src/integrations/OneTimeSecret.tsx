import { useState } from 'react';

/** This value lives in component memory only. No draft or storage ever receives it. */
export function OneTimeSecret({ value, label = 'Private key', onDone }: { value: string; label?: string; onDone?: () => void }) {
  const [notice, setNotice] = useState('');
  return <section className="one-time-secret" aria-label="Created credential">
    <h3>{label}</h3><p>Copy it now. It cannot be read back.</p>
    <label className="field">{label}<input readOnly value={value} autoComplete="off" onFocus={e => e.currentTarget.select()} /></label>
    <div className="intake-actions"><button type="button" onClick={async () => {
      try { await navigator.clipboard.writeText(value); setNotice('Copied'); }
      catch { setNotice('Select the value above and copy it.'); }
    }}>Copy</button>{onDone && <button type="button" onClick={onDone}>Done</button>}</div>
    {notice && <p role="status">{notice}</p>}
  </section>;
}
