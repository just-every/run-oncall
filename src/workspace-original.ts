import type { State } from './family/response-operations/domain'

// The stored workspace text a State was parsed from, kept so a later save can derive what changed without re-reading storage.
const originals = new WeakMap<object, string>()
export function rememberWorkspace(state: State, raw: string) { originals.set(state, raw) }
export function originalWorkspace(state: State): State | null {
  const raw = originals.get(state)
  return raw ? JSON.parse(raw) as State : null
}
