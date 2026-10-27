import {useEffect, useRef, useState} from 'react';
import {useLeaveGuard} from '../app/autosave/leaveGuard';
import {policyDrafts, removeLocalDraft, writeLocalDraft, type LocalDraft} from '../app/autosave/localDraft';

/** Service policy adapters use the shared browser storage; publication is the only server write. */
export function usePolicyDraft<T>(kind: string, id: string, version: number, current: T) {
  const [draft, setDraft] = useState<LocalDraft<T> | null>(null), [storageFailed, setStorageFailed] = useState(false);
  const edited = useRef(false);
  const guard = useRef({flush:async () => true, pagehide:() => {}, pending:(): boolean => false});
  guard.current.flush = async () => {if (!storageFailed || !draft) return true; const stored=writeLocalDraft(draft);setStorageFailed(!stored);return stored;};
  guard.current.pagehide = () => {if (draft) writeLocalDraft(draft);};
  guard.current.pending = () => storageFailed;
  useLeaveGuard(guard.current);
  useEffect(() => {
    if (!edited.current) setDraft(policyDrafts<T>(kind, id)[0] ?? null);
  }, [kind, id]);
  const persist = (entry: LocalDraft<T>) => {
    setStorageFailed(!writeLocalDraft(entry));
    setDraft(entry);
  };
  const change = (value: T) => {
    edited.current = true;
    const baseVersion = draft?.baseVersion ?? version;
    if (baseVersion === version && JSON.stringify(value) === JSON.stringify(current)) {
      removeLocalDraft(kind, id, baseVersion); setDraft(null); setStorageFailed(false);
    } else persist({kind, id, baseVersion, value});
  };
  const useMine = () => {
    if (!draft) return;
    removeLocalDraft(kind, id, draft.baseVersion);
    persist({...draft, baseVersion: version});
  };
  const published = () => {
    if (draft) removeLocalDraft(kind, id, draft.baseVersion);
    setDraft(null); setStorageFailed(false);
  };
  return {value: draft?.value ?? current, change, dirty: !!draft, stale: !!draft && draft.baseVersion !== version, baseVersion: draft?.baseVersion ?? version, useMine, published, storageFailed, retryStorage: () => {if (draft) persist(draft);}};
}
