import { createImportOperatorHandler } from '../modules/import-kit/src/door/operator'
import { loadSnapshot, planRow, sql, transact } from '../modules/import-kit/src/door/store'
import { bundleBytes, uploadRow } from '../modules/import-kit/src/door/uploads'
import type { DoorRequest } from '../modules/import-kit/src/door/types'
import type { D1Sql } from '../modules/import-kit/src/d1/types'
import type { ImportPlan } from '../modules/import-kit/src/types'
import { runtimeBindings } from '../auth.server'
import { Fault, type Member } from '../family/response-operations/domain'
import { DOOR_LIMITS, importSource } from './door'
import { IMPORT_DOOR_KEY } from './door-key'
import { targets } from './target'
import { fileSource, type Vendor } from './source'
import { mapping } from './mapping'
import { alreadyImported, changedSinceImport, duplicateTargets, Refusal, supersededBy } from './refusals'

// The owner's move-in screen imports through Base's owner-session door, the
// same pipeline and allow-list as Business: upload → plan → reviewed
// fingerprint → apply → reconcile → undo. Oncall adds its review list and its
// named refusals around the door's answers; the door does every write.
const PREFIX = '/api/operator/import/'
const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
const vendorName = (vendor: string) => vendor === 'pagerduty' ? 'PagerDuty' : 'Opsgenie'
const aVendor = (vendor: string) => vendor === 'pagerduty' ? 'a PagerDuty' : 'an Opsgenie'
const answer = (value: unknown, status = 200) => Response.json(value, { status, headers })
// Every Oncall refusal carries its sentence and a code, so the screen shows the sentence exactly as written.
const refusal = (fault: Fault) => answer({ error: fault.message, code: fault instanceof Refusal ? fault.code : 'SOURCE_REFUSED' }, fault.status)
const code = async (response: Response) => (await response.clone().json().catch(() => ({})) as { error?: string }).error

/** The current administrator's own session, checked in the same database as every write: Oncall's move-in authority. */
export const adminSession = (digest: string, member: string): D1Sql => ({
 sql: `EXISTS(SELECT 1 FROM oc_current_sessions s JOIN oc_members m ON m.id=s.member WHERE s.token=? AND s.member=? AND s.expires>? AND json_extract(m.data,'$.active')=1 AND json_extract(m.data,'$.role')='admin')`,
 params: [digest, member, Date.now()],
})

/** Who approves an owner import in history: the signed-in owner's email, or a password administrator's workspace name. */
async function approver(db: D1Database, member: Member) {
 const row = await db.prepare('SELECT o.email FROM operator_members l JOIN oa_operators o ON o.id=l.operator_id WHERE l.member_id=?').bind(member.id).first<{ email: string }>()
 return row?.email ?? member.name
}

/** Read-only access to this source's retained door rows, for the review list and refusals. */
function reader(db: D1Database, vendor: Vendor, principal: string): DoorRequest {
 return { options: { database: db, targets, destination: 'oncall', format: 'json', limits: DOOR_LIMITS, ownerPrincipalId: principal, ...importSource(vendor)! },
  access: { action: 'status', installationId: IMPORT_DOOR_KEY, email: '', namespace: vendor, maxBytes: DOOR_LIMITS.maxBytes, maxChunks: 1024, maxRecords: DOOR_LIMITS.maxRecords },
  via: 'operator', authority: { sql: '0' }, epoch: 0 }
}

async function body(request: Request): Promise<Record<string, unknown> | undefined> {
 try { const text = await request.clone().text(); return text.length <= 100_000 ? JSON.parse(text) : undefined } catch { return undefined }
}

/** The compatibility review the move-in screen shows: every source object with its effects, differences and any rejection. */
const review = (plan: ImportPlan) => plan.entries.map(entry => {
 const value = entry.source.payload as any
 return { kind: entry.source.kind, id: entry.source.sourceId, location: entry.source.location,
  name: value?.fullName ?? value?.name ?? value?.summary ?? value?.username ?? value?.email ?? entry.source.sourceId,
  rejection: entry.rejection, unmapped: entry.unmapped, effects: entry.effects }
})

/** A door plan that failed on the file itself, named as the saved-file reader names it: a credential field, unreadable JSON or two records that become one object. */
async function sourceRefusal(read: DoorRequest, uploadId: string, vendor: Vendor): Promise<Fault | null> {
 let text: string, name: string
 try { const row = await uploadRow(read, uploadId); name = row.name; text = new TextDecoder().decode(await bundleBytes(read, row)) } catch { return null }
 try { const source = await fileSource(vendor, text, name); return duplicateTargets(source, mapping(vendor, source, Date.now())) }
 catch (error) {
  if (error instanceof Fault) return error
  const kit = (error as Error).message
  return /^[A-Z][A-Z0-9_]+$/.test(kit) ? new Refusal(400, "The import journal refused this request; check the job's state before trying again.", kit) : null
 }
}

/** A file the preview refuses goes with its refusal: under the owner's session the upload and its chunks are
 * withdrawn (as the door drops an upload holding an erased record), and the namespace binding that upload made
 * when nothing else in the source holds it, so a refused preview leaves no row behind. */
async function withdrawUpload(db: D1Database, session: D1Sql, vendor: string, uploadId: unknown) {
 if (typeof uploadId !== 'string') return
 const scope = [IMPORT_DOOR_KEY, vendor]
 await transact(db, session, [
  sql('DELETE FROM ik_door_chunks WHERE upload_id IN (SELECT id FROM ik_door_uploads WHERE id=? AND installation_id=? AND namespace=?)', uploadId, ...scope),
  sql('DELETE FROM ik_door_uploads WHERE id=? AND installation_id=? AND namespace=?', uploadId, ...scope),
  sql(`DELETE FROM ik_door_scopes WHERE installation_id=? AND namespace=? AND NOT EXISTS(SELECT 1 FROM ik_door_uploads WHERE installation_id=? AND namespace=?)
   AND NOT EXISTS(SELECT 1 FROM ik_door_plans WHERE installation_id=? AND namespace=?)`, ...scope, ...scope, ...scope),
 ])
}

/** Why Undo cannot run on this import yet, named before the door records reversal intent: a later import replaced
 * its records (undo that one first), or something changed in Oncall since. Null when Undo can proceed. */
const undoRefusal = async (db: D1Database, job: string) => await supersededBy(db, job) ?? await changedSinceImport(db, job)

/** The source's pending door plan, if any: whether it is this screen's own unconfirmed preview, whether an apply started and whether an erasure withdrew it. */
async function pendingPlan(db: D1Database, vendor: string) {
 return db.prepare(`SELECT n.pending_id AS id,EXISTS(SELECT 1 FROM move_in_previews v WHERE v.plan_id=n.pending_id) AS preview,
  EXISTS(SELECT 1 FROM ik_jobs j WHERE j.operation_key='door:'||n.pending_id) AS started,
  NOT EXISTS(SELECT 1 FROM ik_door_plan_chunks c WHERE c.plan_id=n.pending_id) AS withdrawn
  FROM ik_door_namespaces n WHERE n.installation_id=? AND n.namespace=? AND n.pending_id IS NOT NULL`).bind(IMPORT_DOOR_KEY, vendor).first<{ id: string; preview: number; started: number; withdrawn: number }>()
}
const forget = (db: D1Database, planId: unknown) => typeof planId === 'string' ? db.prepare('DELETE FROM move_in_previews WHERE plan_id=?').bind(planId).run() : null
const jobOf = async (db: D1Database, planId: string) => (await db.prepare("SELECT id FROM ik_jobs WHERE destination='oncall' AND operation_key=?").bind('door:' + planId).first<{ id: string }>())?.id
/** The job of this owner's own door plan in this source, if it started one. */
const ownJob = async (db: D1Database, planId: string, vendor: string, principal: string) => (await db.prepare(`SELECT j.id FROM ik_door_plans d JOIN ik_jobs j ON j.operation_key='door:'||d.id
 WHERE d.id=? AND d.installation_id=? AND d.namespace=? AND j.destination='oncall' AND j.principal_id=?`).bind(planId, IMPORT_DOOR_KEY, vendor, principal).first<{ id: string }>())?.id

/** POST /api/operator/import/{uploads,plan,apply,status,reconcile,undo} with X-Import-Source naming a listed vendor. */
export async function ownerImport(c: any): Promise<Response> {
 const request: Request = c.req.raw, actor: Member = c.get('actor'), db: D1Database = c.env.DB
 const vendor = request.headers.get('X-Import-Source') ?? '', source = importSource(vendor)
 if (!source) return answer({ error: 'unknown_import_source' }, 400)
 if (actor.role !== 'admin') return answer({ error: 'Current admin required' }, 403)
 const session = adminSession(c.get('sessionDigest'), actor.id)
 const door = createImportOperatorHandler({ database: db, targets, destination: 'oncall', format: 'json', limits: DOOR_LIMITS, ownerPrincipalId: actor.id,
  installationId: IMPORT_DOOR_KEY, appOrigin: runtimeBindings(c.env).AUTH_ORIGIN, ownerEmail: await approver(db, actor), namespace: vendor,
  authorize: async () => session, ...source })
 const send = async (sent: Request) => (await door(sent)) ?? answer({ error: 'not_found' }, 404)
 const action = new URL(request.url).pathname.slice(PREFIX.length), input = await body(request), read = reader(db, vendor as Vendor, actor.id)
 if (action === 'plan') {
  // Every refusal this preview names takes the file with it.
  const refuse = async (fault: Fault) => { await withdrawUpload(db, session, vendor, input?.uploadId); return refusal(fault) }
  const headers = new Headers(request.headers); headers.delete('content-length')
  const resend = (path: string, value: unknown) => send(new Request(new URL(PREFIX + path, request.url), { method: 'POST', headers, body: JSON.stringify(value) }) as Request)
  const before = (await pendingPlan(db, vendor))?.id
  let response = await send(request)
  // A plan that can never apply gives way to the next preview: this screen's own unconfirmed preview of another
  // file, as a preview always did, or any unapplied plan an erasure withdrew. It is cancelled through the door.
  for (let attempt = 0; attempt < 2 && [409, 410].includes(response.status); attempt++) {
   const failure = await response.clone().json().catch(() => ({})) as { error?: string; details?: { planId?: unknown } }
   let stale: string | undefined
   if (failure.error === 'namespace_has_pending_import') {
    const pending = await pendingPlan(db, vendor)
    if (!pending) break
    if (!pending.started && (pending.preview || pending.withdrawn)) stale = pending.id
    else return refuse(new Refusal(409, pending.started
     ? `An earlier ${vendorName(vendor)} import has not finished. Choose it in Saved import journal and resume or undo it, then preview this file again.`
     : `Business has proposed ${aVendor(vendor)} import that is waiting for approval. Approve or decline it in Business, then preview this file again.`, 'namespace_has_pending_import'))
   } else if (failure.error === 'snapshot_withdrawn' && typeof failure.details?.planId === 'string' && !await jobOf(db, failure.details.planId)) stale = failure.details.planId
   if (!stale) break
   const cancelled = await resend('undo', { planId: stale })
   if (!cancelled.ok) return cancelled
   await forget(db, stale)
   response = await resend('plan', input)
  }
  if (response.status === 409 && await code(response) === 'catchup_required' && input && input.catchup === undefined) {
   // A source that already holds an import plans the file as its catch-up: additions, replacements guarded by
   // the import's own revisions, and gone records only listed.
   response = await resend('plan', { ...input, catchup: true })
  }
  if (response.status === 409 && await code(response) === 'import_door_conflict' && typeof input?.uploadId === 'string') {
   const named = await sourceRefusal(read, input.uploadId, vendor as Vendor)
   if (named) return refuse(named)
  }
  if (!response.ok) return response
  const plan = await response.json() as { planId: string }
  // Only a plan this preview created is the screen's own; repeating a pending plan's file (Business's, say) adopts nothing.
  if (plan.planId !== before) await db.prepare(`INSERT OR IGNORE INTO move_in_previews(plan_id) SELECT id FROM ik_door_plans WHERE id=? AND job_id IS NULL
   AND NOT EXISTS(SELECT 1 FROM ik_jobs WHERE operation_key='door:'||?)`).bind(plan.planId, plan.planId).run()
  const snapshot = await loadSnapshot(read, await planRow(read, plan.planId))
  return answer({ ...plan, items: review(snapshot.plan) })
 }
 if (action === 'apply' && typeof input?.planId === 'string') {
  // Name people or schedules another import already holds before the door starts a job that could only fail.
  const held = await (async () => {
   try { return await alreadyImported(db, (await loadSnapshot(read, await planRow(read, input.planId as string))).plan, vendor, await jobOf(db, input.planId as string)) }
   catch { return null }
  })()
  if (held) return refusal(held)
  const response = await send(request)
  if (response.ok) await forget(db, input.planId)
  return response
 }
 if (action === 'undo' && typeof input?.planId === 'string') {
  // Name a later import over this owner's import, or what changed in Oncall since it, before the door records
  // reversal intent: a refused Undo leaves the import completed, as it always did. One that lands meanwhile is still named below.
  const own = await ownJob(db, input.planId, vendor, actor.id), blocked = own ? await undoRefusal(db, own) : null
  if (blocked) return refusal(blocked)
  const response = await send(request)
  if (response.ok) await forget(db, input.planId)
  if (response.status === 409 && await code(response) === 'import_door_conflict') {
   const job = await jobOf(db, input.planId), named = job ? await undoRefusal(db, job) : null
   if (named) return refusal(named)
  }
  return response
 }
 return send(request)
}
