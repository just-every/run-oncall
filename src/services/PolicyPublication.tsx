import {useEffect, useRef, useState, type ReactNode} from 'react';
import {InlineConfirm} from '../app/autosave/InlineConfirm';
import {useLeaveGuard} from '../app/autosave/leaveGuard';
import {failureMessage} from '../app/FailureLine';

type Props = {dirty: boolean; stale: boolean; version: number; approve?: boolean; publish: (reason: string) => Promise<unknown>; children?: ReactNode};
export function PolicyPublication({dirty, stale, version, approve, publish, children}: Props) {
  const [confirming, setConfirming] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const pending = useRef<Promise<boolean> | null>(null), refused = useRef(false);
  const guard = useRef({flush:async () => true, pagehide:() => {}, pending:(): boolean => false});
  guard.current.flush = async () => {if (pending.current) {await pending.current;return !refused.current;}return !refused.current && !confirming;};
  guard.current.pending = () => !!pending.current || refused.current || confirming;
  useLeaveGuard(guard.current);
  useEffect(() => {if (!dirty) {setConfirming(false);setError('');refused.current=false;}}, [dirty]);
  const label = `${approve ? 'Approve' : 'Publish'} version ${version}`;
  async function commit(reason: string) {
    setBusy(true);setError('');refused.current=false;
    try {
      const result = await publish(reason);
      if (result) {setConfirming(false);return true;}
      setError('This version could not be published. Your draft is still here.');
    } catch (cause) {setError(failureMessage(cause));}
    finally {setBusy(false);}
    refused.current=true;return false;
  }
  if (!dirty) return null;
  return <div className="service-policy-confirm">
    {children}
    {!confirming && <button type="button" disabled={stale} onClick={event => {if (event.currentTarget.closest('form')?.reportValidity() !== false) setConfirming(true);}}>{label}</button>}
    {confirming && <InlineConfirm action={label} keep="Keep editing" reasonRequired busy={busy || stale} onCancel={() => {setConfirming(false);setError('');refused.current=false;}} onConfirm={reason => {
      const job=commit(reason!);pending.current=job;void job.finally(() => {if(pending.current===job)pending.current=null;});
    }}>{approve ? 'Approve this workflow for new alerts?' : 'Publish this policy for new alerts and incidents?'}</InlineConfirm>}
    {error && <p role="alert">{error}</p>}
  </div>;
}
