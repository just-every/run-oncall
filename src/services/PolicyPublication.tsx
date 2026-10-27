import {useEffect, useState, type ReactNode} from 'react';
import {InlineConfirm} from '../app/autosave/InlineConfirm';
import {failureMessage} from '../app/FailureLine';

type Props = {dirty: boolean; stale: boolean; version: number; approve?: boolean; publish: (reason: string) => Promise<unknown>; children?: ReactNode};
export function PolicyPublication({dirty, stale, version, approve, publish, children}: Props) {
  const [confirming, setConfirming] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  useEffect(() => {if (!dirty) {setConfirming(false);setError('');}}, [dirty]);
  const label = `${approve ? 'Approve' : 'Publish'} version ${version}`;
  if (!dirty) return null;
  return <div className="service-policy-confirm">
    {children}
    {!confirming && <button type="button" disabled={stale} onClick={event => {if (event.currentTarget.closest('form')?.reportValidity() !== false) setConfirming(true);}}>{label}</button>}
    {confirming && <InlineConfirm action={label} keep="Keep editing" reasonRequired busy={busy || stale} onCancel={() => {setConfirming(false); setError('');}} onConfirm={async reason => {
      setBusy(true); setError('');
      try {
        const result = await publish(reason!);
        if (result) setConfirming(false);
        else setError('This version could not be published. Your draft is still here.');
      } catch (cause) {setError(failureMessage(cause));}
      finally {setBusy(false);}
    }}>{approve ? 'Approve this workflow for new alerts?' : 'Publish this policy for new alerts and incidents?'}</InlineConfirm>}
    {error && <p role="alert">{error}</p>}
  </div>;
}
