export type LocalDraft<T> = {kind: string; id: string; baseVersion: number; value: T};
export const draftKey = (kind: string, id: string, baseVersion: number) => `oncall:draft:${kind}:${id}:${baseVersion}`;
export function writeLocalDraft<T>(draft: LocalDraft<T>): boolean {
  try {localStorage.setItem(draftKey(draft.kind, draft.id, draft.baseVersion), JSON.stringify(draft)); return true;} catch {return false;}
}
export function readLocalDraft<T>(kind: string, id: string, baseVersion: number): LocalDraft<T> | null {
  try {
    const raw = localStorage.getItem(draftKey(kind, id, baseVersion));
    if (!raw) return null;
    const draft = JSON.parse(raw);
    return draft?.kind === kind && draft.id === id && draft.baseVersion === baseVersion && 'value' in draft ? draft : null;
  } catch {return null;}
}
/** Return older drafts alongside the current published version for Use mine. */
export function policyDrafts<T>(kind: string, id: string): LocalDraft<T>[] {
  try {
    const drafts: LocalDraft<T>[] = [], prefix = `oncall:draft:${kind}:${id}:`;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(prefix)) continue;
      const version = Number(key.slice(prefix.length));
      if (!Number.isSafeInteger(version) || version < 0) continue;
      const draft = readLocalDraft<T>(kind, id, version);
      if (draft) drafts.push(draft);
    }
    return drafts.sort((a, b) => b.baseVersion - a.baseVersion);
  } catch {return [];}
}
export function removeLocalDraft(kind: string, id: string, baseVersion: number): void {
  try {localStorage.removeItem(draftKey(kind, id, baseVersion));} catch { /* Storage is optional. */ }
}
