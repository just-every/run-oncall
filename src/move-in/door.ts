import { createImportDoorHandler, type ImportDoorSource } from '../modules/import-kit/src/door/index'
import type { ImportMapping, ParsedRecord } from '../modules/import-kit/src/types'
import { ownerClaimConfig, type Bindings } from '../auth.server'
import { mapping } from './mapping'
import { savedExportRecords, type Vendor } from './source'
import { targets } from './target'
import { IMPORT_DOOR_KEY } from './door-key'
import { auditIdentity } from '../audit-store'
import { expireInterruptedImports, importAttempt } from './import-lifecycle'

const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
/** The saved-export bounds both mounts read a bundle under. */
export const DOOR_LIMITS = { maxBytes: 512 * 1024, maxRecordBytes: 512 * 1024, maxRecords: 500 }
const sources: Record<Vendor, true> = { opsgenie: true, pagerduty: true, splunk: true, jsm: true, betterstack: true }

/** Oncall's one server-owned allow-list, shared by the owner's move-in screen
 * (owner-door.ts) and Business: one import namespace per vendor. A
 * listed vendor gets fresh per-request state, because its mapping needs the whole
 * parsed bundle (users and overrides belong to schedules); anything else is null. */
export function importSource(name: string): ImportDoorSource | null {
 if (!Object.hasOwn(sources, name)) return null
 const vendor = name as Vendor, parsed: ParsedRecord[] = [], now = Date.now()
 let prepared: ImportMapping | undefined
 return {
  parse(value) {
   const records = savedExportRecords(vendor, value)
   parsed.push(...records)
   return records
  },
  mapping: { version: 'oncall-move-in-1', map(record) {
   prepared ??= mapping(vendor, { records: parsed.map(item => ({ ...item, location: { artifact: 'saved-export', pointer: item.pointer } })) }, now)
   return prepared.map(record)
  } },
 }
}

/** The active administrator member the configured owner signs in as: the
 * principal of Oncall's ordinary import journal and undo. */
async function ownerMember(env: Bindings, email: string) {
 return env.DB.prepare(`SELECT m.id FROM oa_operators o JOIN operator_members l ON l.operator_id=o.id JOIN oc_members m ON m.id=l.member_id
  WHERE o.role='owner' AND o.status='active' AND o.email=? AND json_extract(m.data,'$.active')=1 AND json_extract(m.data,'$.role')='admin'`).bind(email).first<{ id: string }>()
}

/** The Business grant mount. It answers 404 until a trusted key ring is configured
 * and the owner opts in; the kit verifies each grant, then resolves its namespace
 * through `importSource`, refusing an unlisted one with 403 unknown_import_source. */
export async function importDoorResponse(request: Request, env: Bindings): Promise<Response | null> {
 if (!new URL(request.url).pathname.startsWith('/api/rer/import/')) return null
 const claim = ownerClaimConfig(env)
 if (!claim) return Response.json({ error: 'not_found' }, { status: 404, headers })
 const owner = await ownerMember(env, claim.expectedEmail)
 if (!owner) {
  const setting = await env.DB.prepare('SELECT enabled FROM ik_door_settings WHERE installation_id=?').bind(IMPORT_DOOR_KEY).first<{ enabled: number }>()
  return Response.json({ error: setting?.enabled === 1 ? 'owner_workspace_required' : 'not_found' }, { status: setting?.enabled === 1 ? 409 : 404, headers })
 }
 let planId: unknown
 if (new URL(request.url).pathname === '/api/rer/import/apply') {
  try { const body = await request.clone().text(); if (body.length <= 100_000) planId = JSON.parse(body).planId } catch { /* The door owns input refusals. */ }
 }
 const attempt = typeof planId === 'string' ? importAttempt(env.DB, { planId }) : undefined
 const door = createImportDoorHandler({ database: attempt?.database ?? env.DB, targets, claim, installationId: IMPORT_DOOR_KEY, ownerPrincipalId: owner.id,
  destination: 'oncall', format: 'json', limits: DOOR_LIMITS, async source(namespace) {
   const listed = importSource(namespace)
   if (!listed) return null
   // The kit calls this resolver only after signature, action and origin binding.
   auditIdentity(env.DB, { actor: { kind: 'service', id: namespace }, source: { kind: 'import-source', id: namespace } })
   await expireInterruptedImports(env.DB)
   return listed
  } })
 const response = await door(request)
 await attempt?.finish(response?.ok === true)
 return response
}
