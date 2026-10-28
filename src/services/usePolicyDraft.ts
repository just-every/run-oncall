import {useEffect, useRef, useState} from 'react';
import {useLeaveGuard} from '../app/autosave/leaveGuard';
import {policyDrafts, removeLocalDraft, writeLocalDraft, type LocalDraft} from '../app/autosave/localDraft';

/** Service policy adapters use the shared browser storage; publication is the only server write. */
export function usePolicyDraft<T>(kind: string, id: string, version: number, current: T, enabled = true) {
  const [draft, setDraft] = useState<LocalDraft<T> | null>(null), [storageFailed, setStorageFailed] = useState(false);
  const latest = useRef<LocalDraft<T> | null>(null);
  const edited = useRef(false);
  const guard = useRef({flush:async () => true, pagehide:() => {}, pending:(): boolean => false});
  guard.current.flush = async () => {if (!enabled) return true;if (!storageFailed || !draft) return true; const stored=writeLocalDraft(draft);setStorageFailed(!stored);return stored;};
  guard.current.pagehide = () => {if (draft) writeLocalDraft(draft);};
  guard.current.pending = () => enabled && storageFailed;
  useLeaveGuard(guard.current);
  useEffect(() => {
    if (!edited.current) {latest.current=policyDrafts<T>(kind, id)[0] ?? null;setDraft(latest.current);}
  }, [kind, id]);
  const persist = (entry: LocalDraft<T>) => {
    latest.current=entry;
    setStorageFailed(!writeLocalDraft(entry));
    setDraft(entry);
  };
  const change = (value: T) => {
    if (!enabled) return;
    edited.current = true;
    const baseVersion = draft?.baseVersion ?? version;
    if (baseVersion === version && JSON.stringify(value) === JSON.stringify(current)) {
      removeLocalDraft(kind, id, baseVersion); latest.current=null;setDraft(null); setStorageFailed(false);
    } else persist({kind, id, baseVersion, value});
  };
  const useMine = () => {
    if (!enabled || !draft) return;
    removeLocalDraft(kind, id, draft.baseVersion);
    persist({...draft, baseVersion: version});
  };
  const published = () => {
    if (draft) removeLocalDraft(kind, id, draft.baseVersion);
    // Keep edits made while this version was in flight as the next draft.
    const next=latest.current;
    if (JSON.stringify(next?.value ?? current) !== JSON.stringify(draft?.value)) {
      persist({kind,id,value:next?.value ?? current,baseVersion:version+1});
    } else {latest.current=null;setDraft(null);setStorageFailed(false);}
  };
  return {value: draft?.value ?? current, change, begin: () => {edited.current=true;persist({kind,id,baseVersion:version,value:current});}, dirty: enabled && !!draft, stale: enabled && !!draft && draft.baseVersion !== version, baseVersion: draft?.baseVersion ?? version, useMine, published, storageFailed:enabled && storageFailed, retryStorage: () => {if (draft) persist(draft);}};
}
