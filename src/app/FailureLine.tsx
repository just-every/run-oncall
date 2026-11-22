import {useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {HttpFailure, InterruptedTransport} from '../useWorkspace';
import './flows.css';

export type ActionFailure = {message: string; read?: boolean; target: HTMLElement | null; focus?: HTMLElement; retry?: () => Promise<unknown>; retryLabel?: string; saved?: string; change?: string};
export function failureMessage(error: unknown, read = false) {
  if (error instanceof InterruptedTransport) return read
    ? 'Oncall could not be reached. The current view is still here.'
    : 'Oncall could not be reached. Your change is still here; saving was not confirmed.';
  if (error instanceof HttpFailure && error.human) return error.message;
  const message = error instanceof Error ? error.message : '';
  return message && !/Invalid server response|Request failed|Failed to fetch|NetworkError|SyntaxError|TypeError|SQLITE|D1_|[a-f0-9]{16,}|https?:|\/api\//i.test(message)
    ? message : read ? 'Current records could not be loaded. The current view is still here.' : 'This change could not be saved. Your change is still here.';
}

export function hasChangeBase(data: unknown) {
  return Boolean(data && typeof data === 'object' && ['revision','baseRevision','baseVersion','workspaceRevision','operationId','commandKey','baseValues'].some(key => {
    const value = (data as Record<string, unknown>)[key];
    return key === 'baseValues' && value !== null && typeof value === 'object' || typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 || typeof value === 'string' && value.trim().length > 0;
  }));
}

/** Captures the initiating action without changing the forms that own the edit. */
export function useActionFailure() {
  const [failure, setFailure] = useState<ActionFailure | null>(null);
  const current = useRef<ActionFailure | null>(null);
  const action = useRef<HTMLElement | null>(null);
  const keyboardFocus = useRef<HTMLElement | undefined>(undefined);
  useEffect(() => {
    const capture = (event: Event) => {
      const element = event.target as HTMLElement;
      if (element.closest('.failure-line')) return;
      const form = element.closest('form');
      const button = form?.querySelector<HTMLElement>('button[type="submit"], button:not([type])') ?? element.closest('button');
      action.current = button?.parentElement ?? form ?? null;
      const active = document.activeElement;
      keyboardFocus.current = active instanceof HTMLElement && active.matches(':focus-visible') &&
        (active === button || form?.contains(active)) ? active : undefined;
    };
    document.addEventListener('submit', capture, true);
    document.addEventListener('click', capture, true);
    return () => {document.removeEventListener('submit', capture, true); document.removeEventListener('click', capture, true);};
  }, []);
  function show(error: unknown, options: Omit<Partial<ActionFailure>, 'message' | 'focus'> = {}) {
    if (options.read && current.current && !current.current.read) return;
    const reason = failureMessage(error, options.read);
    const message = /[.!?]$/.test(reason) ? reason : reason + '.';
    const target = options.target === undefined ? action.current : options.target;
    const focus = target === action.current ? keyboardFocus.current : undefined;
    const next = {...options, message: message + (!options.read && !options.retry && error instanceof InterruptedTransport ? ' Check the current records before trying this action again.' : ''), target, focus};
    current.current = next; setFailure(next);
  }
  return {failure, show, clear: () => {current.current = null; setFailure(null);}, action, current};
}

export function FailureLine({failure}: {failure: ActionFailure | null}) {
  const line = useRef<HTMLDivElement>(null);
  const [retrying, setRetrying] = useState(false);
  useEffect(() => {
    if (!failure || failure.read || !line.current) return;
    // Disabling a form during a write can drop focus. Keep a user's later
    // focus choice if they have already moved to another control.
    const focus = failure.focus;
    if (focus?.isConnected && !focus.matches(':disabled') && document.activeElement === document.body) {
      focus.focus({preventScroll: true});
    }
    const box = line.current.getBoundingClientRect();
    if (box.top < 0 || box.bottom > window.innerHeight) line.current.scrollIntoView({block: 'center'});
  }, [failure]);
  if (!failure) return null;
  const content = <div className={failure.read ? 'failure-line read-failure' : 'failure-line'} role="alert" ref={line}>
    <span>{failure.message}{failure.change && <><br />{failure.change}</>}{failure.saved && <><br />Current record: {failure.saved}</>}</span>
    {failure.retry && <button type="button" disabled={retrying} onClick={async () => {
      setRetrying(true);
      try {await failure.retry?.();} catch { /* The retained failure still describes the unsuccessful retry. */ } finally {setRetrying(false);}
    }}>{failure.retryLabel ?? 'Try again'}</button>}
  </div>;
  return failure.target?.isConnected ? createPortal(content, failure.target) : content;
}
