import { auditPrincipal } from './audit-principal'
import { auditedDatabase } from './audit-database'
import { auditKind, setAuditSubject, type AuditContext } from './audit-store'
import type { Bindings } from './auth.server'

// Only an authorized human response-value comparison can mark this request's
// unique audited database after its read fence. Permission, credential,
// notification-routing and retention no-ops still retain their audit facts.
const commandNoops = new WeakSet<D1Database>()
export function markCommandNoop(db: D1Database) { commandNoops.add(db) }

const commands = new Set(['manual-page','user-assignment','request-responders','respond-request','cancel-request','merge-incidents','split-incident','service-template','template-check','service','service-dependencies','policy','member','declare','assign-role','reassign','set-priority','set-urgency','set-severity','bulk-acknowledge','bulk-resolve','review','action','complete','accept-action','reopen-action','note','transition','runbook','priority','close-action','request-response'])
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
  const prefixes = ['teams','identity-link','command','members','password','sources','paging','schedules','delivery','triage','handoffs','routing','urgency','response','changes','intake','monitoring','email','move-in','restore','recovery','setup','login','logout']
  const feature = prefixes.find(value => path === `/api/${value}` || path.startsWith(`/api/${value}/`))
    ?? (path.startsWith('/auth/') || path.startsWith('/__dev/') ? 'access' : path.startsWith('/api/ingress/') || path.startsWith('/v2/') || path.startsWith('/integrations/') || path.startsWith('/generic/') ? 'ingest' : 'workspace')
  const operation = path.split('/').at(-1) ?? ''
  const operations = new Set(['publish','revoke','review','prepare','export','ack','cancel','resume','apply','erase','undo','approve','rotate','overrides','schedules','policies','jobs','tick','callbacks','bulk','views','archive','restore','key','confirm','logout','identity','imports'])
  return { feature, kind: `${feature}.${operations.has(operation) ? operation : 'request'}` }
}
export async function auditedRequest(request: Request, env: Bindings, handle: (env: Bindings) => Promise<Response>): Promise<Response> {
  const path = new URL(request.url).pathname
  const context: AuditContext = { ...route(path), source: { kind: 'door', id: route(path).feature }, commits: 0, storageFailed: false }
  const subject = /^\/api\/(?:paging\/(?:schedules|jobs)|schedules|handoffs|(?:urgency|response)\/(?:services|alerts)|triage\/incidents)\/([^/]+)/.exec(path)
  if(subject) context.subject={kind:'entity',id:decodeURIComponent(subject[1])}
  const audit = auditedDatabase(env.DB, context)
  try {
    Object.assign(context,await auditPrincipal(request,env));
    const response = await handle({ ...env, DB: audit.db })
    const status = response.status
    // Successful write batches already carry their own entries. A refusal with no
    // state write, including paging OFF, still survives as an attributed attempt.
    // The OC-050 human comparison exception excludes denials, failed authority
    // and stale revisions; Response API and bulk receipt contracts remain audited.
    const zeroWriteReplay = response.ok && (path === '/api/replay' || path === '/api/triage/workflows/preview' || /^\/api\/(?:email\/addresses|routing\/keys)\/[^/]+\/preview$/.test(path));
    const unchangedCommand = path === '/api/command' && request.method === 'POST' && status === 200 && context.commits === 0 && commandNoops.has(audit.db)
    if (!context.ownerCustodyRefusal && !(context.refusalCommitted && status === 409) && !zeroWriteReplay && !unchangedCommand && context.actor && (context.outcome || status >= 400 || context.commits === 0 && request.method !== 'GET' || context.kind.endsWith('.export') || context.kind === 'workspace.archive'))
      await audit.record(context.outcome ?? (status >= 500 ? 'failed' : status >= 400 ? 'refused' : 'accepted'))
    return response
  } catch {
    // Never turn a failed audit commit into an apparently accepted state change.
    if (context.actor && !context.storageFailed) {
      try { await audit.record('failed') } catch { /* Storage remains unavailable. */ }
    }
    return Response.json({ error: 'Storage or server failure; no success confirmed' }, { status: 503, headers: { 'cache-control': 'no-store' } })
  }
}
