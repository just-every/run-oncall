import { auditedDatabase } from './audit-database'
import { auditKind, setAuditSubject, type AuditContext } from './audit-store'
import type { Bindings } from './auth.server'

const commands = new Set(['service','service-dependencies','policy','member','declare','assign-role','review','action','complete','accept-action','reopen-action','note','transition','runbook','priority','close-action','request-response'])
export function auditInput(db: D1Database, input: any, path: string) {
  if (!input || typeof input !== 'object') return
  if (path === '/api/command' && commands.has(input.type)) auditKind(db, `command.${input.type}`)
  // Values become revocable identity associations only; they never enter history.
  const subject = path === '/api/password' ? input.member : path === '/api/command' ? input.incident ?? input.id ?? input.member : input.id ?? input.service
  if (typeof subject === 'string' && subject.length <= 200) setAuditSubject(db, path === '/api/password' || path === '/api/command' && input.type === 'member' ? 'member' : 'entity', subject)
}
function importKind(path: string) {
 const action=path.split('/').at(-1)??''
 return `import-door.${new Set(['uploads','plan','apply','status','reconcile','undo','archive','approve']).has(action)?action:'request'}`
}
function route(path: string): { feature: string; kind: string } {
  if (path === '/api/audit/export') return { feature: 'audit', kind: 'audit.export' }
  if (path.startsWith('/api/operator/import/')) return { feature: 'import-door', kind: importKind(path) }
  if (path.startsWith('/api/rer/import/')) return { feature: 'import-door', kind: importKind(path) }
  const prefixes = ['identity-link','command','members','password','sources','paging','schedules','delivery','triage','handoffs','routing','urgency','changes','intake','monitoring','move-in','restore','recovery','setup','login','logout']
  const feature = prefixes.find(value => path === `/api/${value}` || path.startsWith(`/api/${value}/`))
    ?? (path.startsWith('/auth/') || path.startsWith('/__dev/') ? 'access' : path.startsWith('/api/ingress/') || path.startsWith('/v2/') || path.startsWith('/integrations/') || path.startsWith('/generic/') ? 'ingest' : 'workspace')
  const operation = path.split('/').at(-1) ?? ''
  const operations = new Set(['publish','revoke','review','prepare','export','ack','cancel','resume','apply','erase','undo','approve','rotate','overrides','schedules','policies','jobs','tick','callbacks','bulk','views','archive','restore','key','confirm','logout','identity','imports'])
  return { feature, kind: `${feature}.${operations.has(operation) ? operation : 'request'}` }
}
export async function auditedRequest(request: Request, env: Bindings, handle: (env: Bindings) => Promise<Response>): Promise<Response> {
  const path = new URL(request.url).pathname
  const context: AuditContext = { ...route(path), source: { kind: 'door', id: route(path).feature }, commits: 0, storageFailed: false }
  const subject = /^\/api\/(?:paging\/(?:schedules|jobs)|schedules|handoffs|urgency\/(?:services|alerts)|triage\/incidents)\/([^/]+)/.exec(path)
  if(subject) context.subject={kind:'entity',id:decodeURIComponent(subject[1])}
  const audit = auditedDatabase(env.DB, context)
  try {
    const response = await handle({ ...env, DB: audit.db })
    const status = response.status
    // Successful write batches already carry their own entries. A refusal with no
    // state write, including paging OFF, still survives as an attributed attempt.
    if (context.actor && (status >= 400 || context.commits === 0 && request.method !== 'GET' || context.kind.endsWith('.export') || context.kind === 'workspace.archive'))
      await audit.record(status >= 500 ? 'failed' : status >= 400 ? 'refused' : 'accepted')
    return response
  } catch {
    // Never turn a failed audit commit into an apparently accepted state change.
    if (context.actor && !context.storageFailed) {
      try { await audit.record('failed') } catch { /* Storage remains unavailable. */ }
    }
    return Response.json({ error: 'Storage or server failure; no success confirmed' }, { status: 503, headers: { 'cache-control': 'no-store' } })
  }
}
