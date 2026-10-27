import { useEffect, useRef, useState } from 'react';
import { policyDrafts, writeLocalDraft, removeLocalDraft } from '../app/autosave/localDraft';

/** O6 editors share the saving round's storage format and conflict model. */
export function useVersionDraft<T>(kind: string, id: string, version: number | ((value: T) => number), published: T) {
  const publishedVersion = typeof version === 'function' ? version(published) : version;
  const [draft, setDraft] = useState(() => policyDrafts<T>(kind, id)[0] ?? { kind, id, baseVersion: publishedVersion, value: published });
  const dirty = useRef(policyDrafts<T>(kind, id).length > 0);
  const currentVersion = typeof version === 'function' ? version(draft.value) : version;
  const changed = JSON.stringify(draft.value) !== JSON.stringify(published) || draft.baseVersion !== currentVersion;
  useEffect(() => {
    if (!dirty.current) setDraft({ kind, id, baseVersion: publishedVersion, value: published });
  }, [publishedVersion, JSON.stringify(published)]);
  function edit(value: T, baseVersion = draft.baseVersion) {
    dirty.current = true;
    if (baseVersion !== draft.baseVersion) removeLocalDraft(kind, id, draft.baseVersion);
    const next = { ...draft, baseVersion, value }; setDraft(next); writeLocalDraft(next);
  }
  function accepted(nextVersion: number, value: T) {
    removeLocalDraft(kind, id, draft.baseVersion);
    dirty.current = false;
    setDraft({ kind, id, baseVersion: nextVersion, value });
  }
  function useMine() {
    removeLocalDraft(kind, id, draft.baseVersion);
    const next = { ...draft, baseVersion: currentVersion }; setDraft(next); writeLocalDraft(next);
  }
  return { value: draft.value, baseVersion: draft.baseVersion, changed, edit, accepted, useMine, stale: draft.baseVersion !== currentVersion };
}
