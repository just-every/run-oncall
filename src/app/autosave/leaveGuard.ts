import {useCallback, useEffect} from 'react';
import {useBlocker} from '@tanstack/react-router';

export type PendingSave = {flush: () => Promise<boolean>; pagehide: () => void; pending: () => boolean};
const saves = new Set<PendingSave>();
/** Sheet owners await this before closing. A refusal keeps the sheet open. */
export async function flushPendingSaves(): Promise<boolean> {
  const results = await Promise.all([...saves].map(save => save.flush()));
  return results.every(Boolean);
}
export async function leaveAfterSaving(leave: () => void): Promise<boolean> {
  if (!await flushPendingSaves()) return false;
  leave();
  return true;
}
export function useLeaveGuard(save: PendingSave) {
  useBlocker({shouldBlockFn: useCallback(async ({current, next}) => {
    // Search, filters and view switches inside a page never wait for writes.
    if (current.pathname === next.pathname) return false;
    return !await flushPendingSaves();
  }, []), enableBeforeUnload: false});
  useEffect(() => {
    saves.add(save);
    const hide = () => save.pagehide();
    window.addEventListener('pagehide', hide);
    // Reload/close cannot await JavaScript. Send the revision-checked request
    // now using keepalive; don't present a browser-native confirmation dialog.
    window.addEventListener('beforeunload', hide);
    return () => {
      saves.delete(save);
      window.removeEventListener('pagehide', hide);
      window.removeEventListener('beforeunload', hide);
    };
  }, [save]);
}
