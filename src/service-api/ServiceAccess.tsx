import { useCallback, useEffect, useState } from 'react'
import { request } from '../useWorkspace'
import type { State } from '../family/response-operations/domain'
import { AccountsPanel } from './AccountsPanel'
import { EndpointsPanel } from './EndpointsPanel'
import { OutboxPanel } from './OutboxPanel'
import './service-access.css'

export type Run = (path: string, data: any, message?: string) => Promise<any>
export type Revealed = { label: string; value: string } | null
export type AccountRow = State['serviceAccounts'] extends (infer A)[] | undefined ? A & { tokenCreatedAt: string | null; tokenRotatedAt: string | null; lastUsedAt: string | null } : never

/** Service-account tokens, event endpoints and the delivery outbox, in the same list-and-form panels as the other integrations. */
export function ServiceAccess({ state, busy, run }: { state: State; busy: boolean; run: Run }) {
  const [accounts, setAccounts] = useState<AccountRow[] | null>(null)
  const [outbox, setOutbox] = useState<any>(null)
  const [problem, setProblem] = useState('')
  const [revealed, setRevealed] = useState<Revealed>(null)
  const load = useCallback(async () => {
    try {
      const [listed, queue] = await Promise.all([request('/api/service-accounts'), request('/api/outbox?limit=25')])
      setAccounts(listed.accounts); setOutbox(queue); setProblem('')
    } catch (error) { setProblem(error instanceof Error ? error.message : 'Could not load service access') }
  }, [])
  useEffect(() => { load() }, [load, state.revision])
  // One wrapper keeps the one-time secret out of every list and refreshes the rows the action changed.
  const act: Run = async (path, data, message) => {
    const result = await run(path, data, message)
    if (result?.token) setRevealed({ label: 'Service-account token', value: result.token })
    else if (result?.signingSecret) setRevealed({ label: 'Endpoint signing secret', value: result.signingSecret })
    await load()
    return result
  }
  return <>
    {problem && <p role="alert" className="panel padded">{problem}</p>}
    {revealed && <section className="panel padded service-access-secret" role="status">
      <h2>{revealed.label}</h2>
      <p>Copy it now. It is held only as a digest or encrypted, never shown again, and excluded from archives and exports.</p>
      <p><code data-testid="revealed-secret">{revealed.value}</code></p>
      <button onClick={() => setRevealed(null)}>I have stored it — hide</button>
    </section>}
    <AccountsPanel state={state} busy={busy} act={act} accounts={accounts} />
    <EndpointsPanel state={state} busy={busy} act={act} />
    <OutboxPanel state={state} busy={busy} act={act} outbox={outbox} />
  </>
}
