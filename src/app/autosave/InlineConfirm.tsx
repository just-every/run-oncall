import {useId, useState, type ReactNode} from 'react';
import './autosave.css';
export function InlineConfirm({children, action, keep = 'Keep the old value', reasonRequired = false, explainDisabled = false, busy = false, onConfirm, onCancel}: {children: ReactNode; action: string; keep?: string; reasonRequired?: boolean; explainDisabled?: boolean; busy?: boolean; onConfirm: (reason?: string) => unknown; onCancel: () => void}) {
  const id = useId(), [reason, setReason] = useState('');
  const hint = explainDisabled && reasonRequired && !reason.trim() ? 'Enter a reason to enable “' + action + '”.' : undefined;
  return <div className="autosave-confirm" role="group" aria-labelledby={id}>
    <p id={id}>{children}</p>
    {reasonRequired && <label className="field"><span>Reason</span><textarea value={reason} onChange={event => setReason(event.target.value)} required rows={2} /></label>}
    <div className="routing-actions"><button className="primary" type="button" aria-describedby={hint ? id + '-hint' : undefined} disabled={busy || reasonRequired && !reason.trim()} onClick={() => onConfirm(reason.trim() || undefined)}>{action}</button><button type="button" disabled={busy} onClick={onCancel}>{keep}</button></div>
    {hint && <p id={id + '-hint'}>{hint}</p>}
  </div>;
}
