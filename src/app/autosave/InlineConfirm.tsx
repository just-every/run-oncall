import {useId, useState, type ReactNode} from 'react';
import './autosave.css';
export function InlineConfirm({children, action, keep = 'Keep the old value', reasonRequired = false, busy = false, onConfirm, onCancel}: {children: ReactNode; action: string; keep?: string; reasonRequired?: boolean; busy?: boolean; onConfirm: (reason?: string) => unknown; onCancel: () => void}) {
  const id = useId(), [reason, setReason] = useState('');
  return <div className="autosave-confirm" role="group" aria-labelledby={id}>
    <p id={id}>{children}</p>
    {reasonRequired && <label className="field"><span>Reason</span><textarea value={reason} onChange={event => setReason(event.target.value)} required rows={2} /></label>}
    <div className="routing-actions"><button type="button" disabled={busy || reasonRequired && !reason.trim()} onClick={() => onConfirm(reason.trim() || undefined)}>{action}</button><button type="button" disabled={busy} onClick={onCancel}>{keep}</button></div>
  </div>;
}
