import { useEffect, useRef, useState } from 'react';
import { policyDrafts, writeLocalDraft, removeLocalDraft } from '../app/autosave/localDraft';

/** O6 editors share the saving round's storage format and conflict model. */
export function useVersionDraft<T>(kind: string, id: string, version: number, published: T) {
  const [draft, setDraft] = useState(() => policyDrafts<T>(kind, id)[0] ?? { kind, id, baseVersion: version, value: published });
  const dirty = useRef(policyDrafts<T>(kind, id).length > 0);
  const changed = JSON.stringify(draft.value) !== JSON.stringify(published) || draft.baseVersion !== version;
  useEffect(() => {
    if (!dirty.current) setDraft({ kind, id, baseVersion: version, value: published });
  }, [version, JSON.stringify(published)]);
  function edit(value: T) {
    dirty.current = true;
    const next = { ...draft, value }; setDraft(next); writeLocalDraft(next);
  }
  function accepted(nextVersion: number, value: T) {
    removeLocalDraft(kind, id, draft.baseVersion);
    dirty.current = false;
    setDraft({ kind, id, baseVersion: nextVersion, value });
  }
  function useMine() {
    removeLocalDraft(kind, id, draft.baseVersion);
    const next = { ...draft, baseVersion: version }; setDraft(next); writeLocalDraft(next);
  }
  return { value: draft.value, baseVersion: draft.baseVersion, changed, edit, accepted, useMine, stale: draft.baseVersion !== version };
}
