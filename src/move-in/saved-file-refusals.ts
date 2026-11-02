import { bundleBytes, uploadRow } from '../modules/import-kit/src/door/uploads'
import { sql, transact } from '../modules/import-kit/src/door/store'
import type { DoorRequest } from '../modules/import-kit/src/door/types'
import type { D1Sql } from '../modules/import-kit/src/d1/types'
import { Fault } from '../family/response-operations/domain'
import { fileSource, type Vendor } from './source'
import { mapping } from './mapping'
import { duplicateTargets, Refusal } from './refusals'
import { IMPORT_DOOR_KEY } from './door-key'

/** A door plan that failed on the file itself, named as the saved-file reader names it: a credential field, unreadable JSON or two records that become one object. */
export async function sourceRefusal(read: DoorRequest, uploadId: string, vendor: Vendor): Promise<Fault | null> {
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
export async function withdrawUpload(db: D1Database, session: D1Sql, vendor: string, uploadId: unknown) {
 if (typeof uploadId !== 'string') return
 const scope = [IMPORT_DOOR_KEY, vendor]
 await transact(db, session, [
  sql('DELETE FROM ik_door_chunks WHERE upload_id IN (SELECT id FROM ik_door_uploads WHERE id=? AND installation_id=? AND namespace=?)', uploadId, ...scope),
  sql('DELETE FROM ik_door_uploads WHERE id=? AND installation_id=? AND namespace=?', uploadId, ...scope),
  sql(`DELETE FROM ik_door_scopes WHERE installation_id=? AND namespace=? AND NOT EXISTS(SELECT 1 FROM ik_door_uploads WHERE installation_id=? AND namespace=?)
   AND NOT EXISTS(SELECT 1 FROM ik_door_plans WHERE installation_id=? AND namespace=?)`, ...scope, ...scope, ...scope),
 ])
}

