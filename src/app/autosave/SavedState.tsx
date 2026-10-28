import {useMemo} from 'react';
import {FailureLine} from '../FailureLine';
import type {FieldSaveState} from './useAutosave';
import './autosave.css';
/** Put the mark beside the label; put feedback below (never inside a label). */
export function SavedState({state}: {state?: FieldSaveState}) {
  const message = state?.status === 'saved' ? 'Saved' : state?.status === 'idle' ? state.message : undefined;
  return message ? <span className="autosave-saved" role="status">{message}</span> : null;
}
export function SaveFeedback({state, retry, useMine, format = value => Array.isArray(value) ? value.join(', ') || 'None' : String(value ?? 'None')}: {state?: FieldSaveState; retry: () => unknown; useMine: () => unknown; format?: (value: unknown) => string}) {
  const failure = useMemo(() => ({message: state?.message ?? 'This change could not be saved. Your change is still here.', target: null, retry: state?.status === 'failed' ? async () => {await retry();} : undefined, retryLabel: 'Retry'}), [state]);
  if (!state || !['failed', 'conflict'].includes(state.status)) return null;
  return <div className="autosave-feedback"><FailureLine failure={failure} />
    {state.status === 'conflict' && <div className="autosave-conflict"><span>Saved value: {format(state.savedValue)}</span><button type="button" onClick={() => {void useMine();}}>Use mine</button></div>}
  </div>;
}
