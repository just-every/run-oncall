import {subjectErasureIdentity} from '../subject-erasure-identity';
import {eraseDeadlineMember} from '../incident-deadlines/archive';
import {eraseManualMember} from '../manual-pages/archive';
import { eraseBusinessMember } from '../business-status/model';
import { syncErasureFences } from '../erasure-fence'
import { createErasure, defineErasure, toD1Sql } from '../modules/erasure/index.mjs'
import { createPortability } from '../modules/portability/index.mjs'
import { retireD1ImportCustody, upgradeD1ImportErasureIndex } from '../modules/import-kit/src/d1/index'
import { relatedSelection } from '../modules/import-kit/src/d1/erasure-related'
import { loadPlans } from '../modules/import-kit/src/d1/plans'
import type { D1ImportContext, D1Sql } from '../modules/import-kit/src/d1/types'
import { portabilityPolicy } from '../portability-policy.mjs'
import { validateSchedule } from '../family/response-operations/schedules'
import { fail } from '../family/response-operations/domain'
import { addressRanges } from './address-match'
import { IMPORT_DOOR_KEY } from './door-key'
import { auditIdentity, forgetAuditIdentityQueries, setAuditSubject } from '../audit-store'

/** The paused imported user object is the native entity an imported person lives in. */
const person = defineErasure({ entity: 'move-in-person', root: { table: 'move_in_objects' } })
// A rotation slot that held the person keeps its index, so coverage there is an explicit gap and no later slot moves (SCHEDULE-SEMANTICS.md).
export const ERASED_SLOT = 'erased-person'

const hex = () => [...crypto.getRandomValues(new Uint8Array(8))].map(b => b.toString(16).padStart(2, '0')).join('')
const names = (text: string, email: string) => addressRanges(text, email).length > 0
const without = (text: string, email: string) => addressRanges(text, email).reduceRight((out, [start, end]) => out.slice(0, start) + ERASED_SLOT + out.slice(end), text)

/** Whether a retained source object (or any object inside it) refers to the person: by email or username, or by the vendor user id where the object is a user reference. */
export function refers(value: any, email: string, ids: ReadonlySet<string>, key = ''): boolean {
  if (Array.isArray(value)) return value.some(item => refers(item, email, ids, key))
  if (!value || typeof value !== 'object') return false
  for (const field of ['email', 'username']) if (typeof value[field] === 'string' && value[field].trim().toLowerCase() === email) return true
  if (value.id !== undefined && ids.has(String(value.id)) && (['user', 'user_reference'].includes(value.type) || (value.type === undefined && ['user', 'recipient'].includes(key)))) return true
  return Object.entries(value).some(([k, child]) => refers(child, email, ids, k))
}

/** Whether any text inside a value names the person's address exactly. */
export const mentions = (value: any, email: string): boolean => typeof value === 'string' ? names(value, email) : Array.isArray(value) ? value.some(item => mentions(item, email)) : !!value && typeof value === 'object' && Object.values(value).some(item => mentions(item, email))

/** The retained records whose planned result names the person although their own source may not: a schedule absorbs override records, slots
 * and incumbent comparisons from other records, and a record whose effect is a schedule row the erasure rewrites. Keyed by source identity. */
export async function indirect(ctx: D1ImportContext, email: string, ids: ReadonlySet<string>, rewritten: ReadonlySet<string>, namespaceIds?: ReadonlyMap<string,ReadonlySet<string>>) {
  const found = new Set<string>(), filenames = new Set<string>()
  const jobs = (await ctx.storage.database.prepare('SELECT * FROM ik_jobs WHERE destination=? ORDER BY id').bind(ctx.destination).all<any>()).results
  for (const plan of (await loadPlans(jobs, ctx.storage.database, ctx.storage.targets.planCodec)).values()) {
    for (const artifact of plan.source.artifacts) if (names(artifact.name, email)) filenames.add(artifact.name)
    for (const entry of plan.entries) {
      if (entry.erased) continue
      const result = { effects: entry.effects, unmapped: entry.unmapped, rejection: entry.rejection }
      if (refers(result, email, namespaceIds?.get(entry.source.namespace) ?? ids) || mentions(result, email) || entry.effects.some(effect => effect.targetKind === 'schedule' && rewritten.has(effect.targetId))) found.add(sourceKey(entry.source))
    }
  }
  return {found, filenames}
}
const sourceKey = (record: { namespace: string; kind: string; sourceId: string }) => JSON.stringify([record.namespace, record.kind, record.sourceId])

/** The schedule value without the person: slots keep their index, an override that named them becomes an explicit empty interval, and the incumbent comparison text no longer names them. */
export function scrub(value: any, email: string) {
  const next = structuredClone(value)
  const clean = (item: any): any => typeof item === 'string' ? (item.trim().toLowerCase() === email ? ERASED_SLOT : without(item, email)) : Array.isArray(item) ? item.map(clean) : item && typeof item === 'object' ? Object.fromEntries(Object.entries(item).map(([k, v]) => [k, clean(v)])) : item
  for (const override of next.schedule?.overrides ?? []) if (typeof override.member === 'string' && override.member.trim().toLowerCase() === email) override.member = null
  return clean(next)
}

async function services(database: D1ImportContext['storage']['database']) {
  const db = database as unknown as D1Database
  const portability = await createPortability({ db, policy: portabilityPolicy })
  return { portability, erasure: createErasure({ db, buckets: {}, portability, declarations: [person] }) }
}

/** The vendor ids of every user object inside a value that carries the person's email or username. */
function personIds(value: any, email: string, ids: Set<string>) {
  if (Array.isArray(value)) { for (const item of value) personIds(item, email, ids); return }
  if (!value || typeof value !== 'object') return
  if (value.id !== undefined && ['email', 'username'].some(field => typeof value[field] === 'string' && value[field].trim().toLowerCase() === email)) ids.add(String(value.id))
  for (const child of Object.values(value)) personIds(child, email, ids)
}

/** Whether the import door holds the person in a retained upload or plan snapshot that no kit job holds: Business's unplanned
 * upload or unapproved plan. Each bundle is read whole, then searched like a kit original; the vendor ids found join `ids`. */
async function inDoorCustody(db: D1Database, email: string, ids: Set<string>) {
  const search = (text: string) => {
    let value: unknown
    try { value = JSON.parse(text) } catch { return names(text, email) }
    personIds(value, email, ids)
    return refers(value, email, ids) || mentions(value, email)
  }
  let found = false
  const uploads = (await db.prepare('SELECT id FROM ik_door_uploads WHERE installation_id=? ORDER BY id').bind(IMPORT_DOOR_KEY).all<{ id: string }>()).results
  for (const { id } of uploads) {
    const chunks = (await db.prepare('SELECT base64 FROM ik_door_chunks WHERE upload_id=? ORDER BY ordinal').bind(id).all<{ base64: string }>()).results
    const bytes = chunks.flatMap(chunk => [...atob(chunk.base64)].map(char => char.charCodeAt(0)))
    if (bytes.length && search(new TextDecoder().decode(new Uint8Array(bytes)))) found = true
  }
  const plans = (await db.prepare('SELECT id FROM ik_door_plans WHERE installation_id=? ORDER BY id').bind(IMPORT_DOOR_KEY).all<{ id: string }>()).results
  for (const { id } of plans) {
    const body = (await db.prepare('SELECT body FROM ik_door_plan_chunks WHERE plan_id=? ORDER BY ordinal').bind(id).all<{ body: string }>()).results.map(chunk => chunk.body).join('')
    if (body && search(body)) found = true
  }
  // A Business archive of a tool's final export keeps its own copy of the bytes after the upload goes.
  const archives = (await db.prepare('SELECT id FROM ik_door_archives WHERE installation_id=? ORDER BY id').bind(IMPORT_DOOR_KEY).all<{ id: string }>()).results
  for (const { id } of archives) {
    const chunks = (await db.prepare('SELECT base64 FROM ik_door_archive_chunks WHERE archive_id=? ORDER BY ordinal').bind(id).all<{ base64: string }>()).results
    const bytes = chunks.flatMap(chunk => [...atob(chunk.base64)].map(char => char.charCodeAt(0)))
    if (bytes.length && search(new TextDecoder().decode(new Uint8Array(bytes)))) found = true
  }
  return found
}

export type PersonErasure = { receiptId: string; recordsErased: number; jobsRetired: number; streamsRetired: number; importedUser: 'removed' | 'not applied'; schedulesRewritten: number; nativeMember: 'kept' | 'none' }

/** Severing related records rewrites a job's erasure index and leaves the job without its completeness receipt, which the next erasure refuses
 * (IMPORT_ERASURE_INDEX_UPGRADE_REQUIRED). Base's documented upgrade page rebuilds it; run it until nothing is left, before and after an erasure. */
async function reindex(ctx: D1ImportContext) { while (!(await upgradeD1ImportErasureIndex(ctx)).complete); }

/** Erase one imported person by exact email, in one D1 batch: the paused user object, their slot in imported schedules, and every retained copy in import custody. */
export async function eraseImportedPerson(ctx: D1ImportContext, email: string): Promise<PersonErasure> {
  const db = ctx.storage.database
  setAuditSubject(db as unknown as D1Database, 'import-person', email)
  await reindex(ctx)
  const user = await db.prepare("SELECT data FROM move_in_objects WHERE kind='user' AND id=?").bind(email).first<{ data: string }>()
  // The vendor ids the person goes by in retained source records, applied or still pending.
  const ids = new Set<string>(), applied = user ? JSON.parse(user.data) : null
  if (applied?.sourceId !== undefined) ids.add(String(applied.sourceId))
  const mailOf = (record: any) => { try { return String(record.email ?? record.username ?? '').trim().toLowerCase() } catch { return '' } }
  await relatedSelection(ctx, { source(record) { if (record.kind === 'users' && mailOf(record.payload) === email) ids.add(String((record.payload as any).id ?? record.sourceId)); return false } })
  // Door custody (an unplanned upload or a plan awaiting approval) counts as pending too: the erasure withdraws those bundles whole.
  const held = await inDoorCustody(db as unknown as D1Database, email, ids)
  const pending = ids.size > 0 || held
  if (!user && !pending) fail('No imported person has that email', 404)
  const { erasure, portability } = await services(db)
  const native = user ? await erasure.nativeStatements('move-in-person', { kind: 'user', id: email }) : null
  const rows = (await db.prepare("SELECT id,revision,data FROM move_in_objects WHERE kind='schedule' ORDER BY id").all<{ id: string; revision: string; data: string }>()).results
  const rewrite: D1Sql[] = [], rewritten = new Set<string>()
  let schedulesRewritten = 0
  for (const row of rows) {
    const next = scrub(JSON.parse(row.data), email), data = JSON.stringify(next)
    if (data === row.data) continue
    next.schedule = validateSchedule(next.schedule)
    schedulesRewritten++
    rewritten.add(row.id)
    rewrite.push(
      { sql: "INSERT INTO rer_erasure_guard(value) SELECT CASE WHEN EXISTS(SELECT 1 FROM move_in_objects WHERE kind='schedule' AND id=? AND revision=? AND data=?) THEN 1 ELSE 0 END", params: [row.id, row.revision, row.data] },
      { sql: "UPDATE move_in_objects SET revision=?,data=? WHERE kind='schedule' AND id=?", params: [`erased-${hex()}`, JSON.stringify(next), row.id] })
  }
  // Automation definitions may contain a person's display name. Sever those labels,
  // revoke their local capabilities and advance the workspace fence atomically.
  let automationChanged=false
  const workspace=await db.prepare('SELECT revision FROM workspace_control WHERE id=1').first<{revision:number}>()
  for(const [table,credential,field] of [['oc_api_clients','oc_api_credentials','client'],['oc_api_endpoints','oc_endpoint_credentials','endpoint']]) {
    for(const row of (await db.prepare(`SELECT id,data FROM ${table}`).all<{id:string;data:string}>()).results) {
      const value=JSON.parse(row.data)
      if(!names(value.name,email))continue
      value.name=without(value.name,email);value.active=false;value.revision++
      rewrite.push({sql:`INSERT INTO rer_erasure_guard(value) SELECT CASE WHEN EXISTS(SELECT 1 FROM ${table} WHERE id=? AND data=?) THEN 1 ELSE 0 END`,params:[row.id,row.data]},
        {sql:`UPDATE ${table} SET data=? WHERE id=?`,params:[JSON.stringify(value),row.id]},
        {sql:`DELETE FROM ${credential} WHERE ${field}=?`,params:[row.id]})
      automationChanged=true
    }
  }
  // Timeline display references are erasable; the permanent audit's random
  // named-member label is retained, with its identity association severed.
  const memberIds=new Set<string>([email,...ids]);
  const nativeMembers=(await db.prepare("SELECT id,data FROM oc_members").all<{id:string;data:string}>()).results
  for(const row of nativeMembers)if(names(JSON.parse(row.data).name,email))memberIds.add(row.id)
  for(const row of (await db.prepare("SELECT l.member_id FROM operator_members l JOIN oa_operators o ON o.id=l.operator_id WHERE lower(o.email)=?").bind(email).all<{member_id:string}>()).results)memberIds.add(row.member_id)
  for(const row of nativeMembers){
    const member=JSON.parse(row.data);
    if(member.role!=='stakeholder'||!memberIds.has(row.id))continue;
    member.name='Erased member';member.active=false;
    rewrite.push({sql:'INSERT INTO rer_erasure_guard(value) SELECT CASE WHEN EXISTS(SELECT 1 FROM oc_members WHERE id=? AND data=?) THEN 1 ELSE 0 END',params:[row.id,row.data]},
      {sql:'UPDATE oc_members SET data=? WHERE id=?',params:[JSON.stringify(member),row.id]},
      {sql:'DELETE FROM credentials WHERE member=?',params:[row.id]},
      {sql:'DELETE FROM sessions WHERE member=?',params:[row.id]});
    automationChanged=true;
  }
  for(const row of (await db.prepare('SELECT id,data FROM oc_schedule_records').all<{id:string;data:string}>()).results){
    const value=JSON.parse(row.data);
    if(memberIds.has(value.member)||memberIds.has(value.data.substitute)||memberIds.has(value.data.obligation?.creator)||mentions(value,email)){
      rewrite.push({sql:'INSERT INTO rer_erasure_guard(value) SELECT CASE WHEN EXISTS(SELECT 1 FROM oc_schedule_records WHERE id=? AND data=?) THEN 1 ELSE 0 END',params:[row.id,row.data]},
        {sql:'DELETE FROM oc_schedule_records WHERE id=?',params:[row.id]});automationChanged=true;
    }
  }
  for(const row of (await db.prepare('SELECT id,data FROM oc_business_services').all<{id:string;data:string}>()).results){
    const business=JSON.parse(row.data), state={members:[],businessServices:[business]} as unknown as import('../family/response-operations/domain').State;
    for(const id of memberIds){const lists=eraseBusinessMember(state,id,[email]);if(lists.length)rewrite.push(...forgetAuditIdentityQueries(lists));for(const list of lists)rewrite.push({sql:'INSERT OR IGNORE INTO oc_erasure_fences(id,epoch) VALUES(?,0)',params:[await subjectErasureIdentity('email-list',list)]});}
    const clean=JSON.stringify(scrub(business,email));
    if(clean!==row.data){rewrite.push({sql:'INSERT INTO rer_erasure_guard(value) SELECT CASE WHEN EXISTS(SELECT 1 FROM oc_business_services WHERE id=? AND data=?) THEN 1 ELSE 0 END',params:[row.id,row.data]},
      {sql:'UPDATE oc_business_services SET data=? WHERE id=?',params:[clean,row.id]});automationChanged=true}
  }
  for(const row of (await db.prepare('SELECT id,data FROM oc_alerts').all<{id:string;data:string}>()).results){
    const alert=JSON.parse(row.data);if(!alert.coordination)continue;
    for(const entry of alert.coordination.history)entry.text=scrub(entry.text,email);
    if(memberIds.has(alert.coordination.assignee)){alert.coordination.assignee=null;alert.coordination.snoozeDue=null;}
    if(JSON.stringify(alert)!==row.data){alert.revision=(alert.revision??1)+1;rewrite.push({sql:'INSERT INTO rer_erasure_guard(value) SELECT CASE WHEN EXISTS(SELECT 1 FROM oc_alerts WHERE id=? AND data=?) THEN 1 ELSE 0 END',params:[row.id,row.data]},
      {sql:'UPDATE oc_alerts SET data=? WHERE id=?',params:[JSON.stringify(alert),row.id]});automationChanged=true;}
  }
  for(const row of (await db.prepare('SELECT id,data FROM oc_incidents').all<{id:string;data:string}>()).results){
    const incident=JSON.parse(row.data);const wasManual=!!incident.manualPage;for(const key of ['manualPage','responderRequests'])if(incident[key])incident[key]=scrub(incident[key],email);for(const entry of incident.timeline)if(['manual-page','request-responders','respond-request','cancel-request'].includes(entry.kind)||wasManual&&entry.kind==='declared')entry.text=scrub(entry.text,email);for(const id of memberIds){eraseManualMember(incident,id);eraseDeadlineMember(incident,id);}let changed=false
    for(const entry of incident.timeline)if(entry.lifecycle?.member&&memberIds.has(entry.lifecycle.member)){entry.lifecycle.member=null;changed=true}
    if(changed||JSON.stringify(incident)!==row.data){incident.revision++;rewrite.push({sql:'INSERT INTO rer_erasure_guard(value) SELECT CASE WHEN EXISTS(SELECT 1 FROM oc_incidents WHERE id=? AND data=?) THEN 1 ELSE 0 END',params:[row.id,row.data]},
      {sql:'UPDATE oc_incidents SET data=? WHERE id=?',params:[JSON.stringify(incident),row.id]});automationChanged=true}
  }
  if(automationChanged)rewrite.push({sql:'INSERT INTO rer_erasure_guard(value) SELECT CASE WHEN EXISTS(SELECT 1 FROM workspace_control WHERE id=1 AND revision=?) THEN 1 ELSE 0 END',params:[workspace!.revision]},
    {sql:'UPDATE workspace_control SET revision=revision+1 WHERE id=1',params:[]})
  // A record names the person by any path (a typed field, any string in its own source, or its planned result such as a schedule's override, layer member or incumbent comparison): it is tombstoned too, so undo skips it as it skips a participant's.
  const {found:named, filenames} = await indirect(ctx, email, ids, rewritten)
  const related = {
    source: (record: any) => (record.kind === 'users' && mailOf(record.payload) === email) || refers(record.payload, email, ids) || mentions(record.payload, email) || named.has(sourceKey(record)),
    original(bytes: Uint8Array) {
      const raw = new TextDecoder().decode(bytes)
      try { const original = JSON.parse(raw); return refers(original, email, ids) || mentions(original, email) } catch { return names(raw, email) }
    },
  }
  const checkpoint = [...(await portability.redactionStatements()).map(toD1Sql),{sql:syncErasureFences,params:[]}]
  // Every erasure commit drops in-flight transfer copies, which may hold the person; the native erasure already does when there is one.
  const transfers = native ? [] : (await portability.invalidateTransfersStatements()).map(toD1Sql)
  let entry
  // The immutable audit labels stay, but erasure severs every identity lookup
  // for this imported person in the same commit as their retained records.
  const unlink = forgetAuditIdentityQueries([...memberIds])
  try { entry = await retireD1ImportCustody({ target: { kind: 'user', id: email }, values: [email, ...filenames], related }, [...native?.statements ?? transfers, ...rewrite, ...unlink], ctx, checkpoint) }
  catch (error) { if (/CHECK constraint|IMPORT_ATOMIC_GUARD/.test(String((error as Error).message))) fail('Imported data changed while the erasure was prepared; nothing was erased. Retry.', 409); throw error }
  // Follow-up index maintenance must not recreate the erased identity link.
  auditIdentity(db as unknown as D1Database, { subject: { kind: 'erased', id: crypto.randomUUID() } })
  await reindex(ctx)
  if (native) await erasure.deleteBlobs(native.operationId)
  const member = await db.prepare('SELECT 1 AS found FROM oa_operators WHERE lower(email)=?').bind(email).first()
  return { receiptId: entry.receiptId, recordsErased: entry.recordsErased, jobsRetired: entry.jobsRetired, streamsRetired: entry.streamsRetired, importedUser: user ? 'removed' : 'not applied', schedulesRewritten, nativeMember: member ? 'kept' : 'none' }
}
