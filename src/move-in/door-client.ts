import {vendorName as provider} from './vendor-formats'
// The move-in screen's calls to the owner-session import door (owner-door.ts):
// upload the saved file's original bytes in checksummed chunks, plan, apply the
// reviewed fingerprint in bounded steps, and undo.
const CHUNK = 65536

/** The door answers a code; the screen says what happened and what to do. */
function sentence(code: string, vendor: string): string {
 const known: Record<string, string> = {
  import_door_plan_failed: 'This import failed and cannot be applied again. Undo it in Saved import journal if needed, then preview the file again.',
  import_door_apply_failed: 'The import stopped and nothing more was written. Undo it in Saved import journal if needed, then preview the file again.',
  import_door_apply_constraint: 'Oncall refused part of this import and nothing more was written. Undo it in Saved import journal if needed, then preview the file again.',
  import_door_apply_transient: 'Storage was busy and nothing more was written. Preview the file again in a moment.',
  plan_not_found: 'This preview was replaced by a newer one. Press Preview import again.',
  snapshot_withdrawn: 'An erasure removed this file from the import journal. Choose the export again and preview it.',
  source_erased: 'This file names a person who was erased, so it cannot be imported again.',
  erased_during_request: 'An erasure ran at the same time; nothing was written. Try again.',
  import_door_too_large: `This ${provider(vendor)} file is too large to import at once.`,
  plan_custody_mismatch: 'Another administrator owns this import; ask them to continue or undo it.',
  owner_required: 'Sign in again as an administrator.',
 }
 return known[code] ?? `The import was refused (${code}). Nothing was written.`
}

export class DoorRefusal extends Error {
 code: string
 constructor(message: string, code: string, public status?: number) { super(message); this.code = code }
}

export function doorClient(vendor: string) {
 return async (action: string, body: unknown): Promise<any> => {
  const response = await fetch('/api/operator/import/' + action, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Import-Source': vendor }, body: JSON.stringify(body) })
  const value: any = await response.json().catch(() => ({}))
  if (response.ok) return value
  // Oncall's own refusals carry a sentence and a code, and a session or request refusal is a sentence: both show as written.
  // The door's carry only its snake_case code, which the screen puts into words.
  const code = value.code ?? value.error ?? `http_${response.status}`
  throw new DoorRefusal(typeof value.error === 'string' && (value.code || !/^[a-z][a-z0-9_]*$/.test(value.error)) ? value.error : sentence(code, vendor), code, response.status)
 }
}
type Door = ReturnType<typeof doorClient>

const hex = async (bytes: Uint8Array) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes as Uint8Array<ArrayBuffer>))].map(b => b.toString(16).padStart(2, '0')).join('')
function base64(bytes: Uint8Array) {
 let binary = ''
 for (let at = 0; at < bytes.length; at += 8192) binary += String.fromCharCode(...bytes.subarray(at, at + 8192))
 return btoa(binary)
}

/** A file over the saved-export bound, said as the move-in screen always said it: past the 1 MiB request
 * that once carried the file as text, "Request too large"; under it, the import journal's refusal. */
function oversize(bytes: Uint8Array, name: string, vendor: string) {
 const sent = new TextEncoder().encode(JSON.stringify({ vendor, source: new TextDecoder().decode(bytes), filename: name })).length
 return sent > 1024 * 1024 ? 'Request too large' : "The import journal refused this request; check the job's state before trying again."
}

/** Upload the file's original bytes, then plan them (a source that already holds an import plans its catch-up). */
export async function previewFile(door: Door, bytes: Uint8Array, name: string, vendor: string) {
 const bundleSha256 = await hex(bytes), totalChunks = Math.ceil(bytes.length / CHUNK)
 let uploadId: string | undefined
 for (let index = 0; index < totalChunks; index++) {
  const chunk = bytes.subarray(index * CHUNK, (index + 1) * CHUNK)
  try { uploadId = (await door('uploads', { uploadId, name, bundleSha256, totalBytes: bytes.length, totalChunks, index, chunkSha256: await hex(chunk), base64: base64(chunk) })).uploadId }
  catch (error) { throw error instanceof DoorRefusal && error.code === 'quota_or_chunk_limit' ? new DoorRefusal(oversize(bytes, name, vendor), error.code, error.status) : error }
 }
 return door('plan', { uploadId })
}

/** Apply the reviewed plan in bounded steps until the job stops moving. */
export async function applyPlan(door: Door, planId: string, reviewedFingerprint: string) {
 let job
 do job = (await door('apply', { planId, reviewedFingerprint })).job
 while (['queued', 'applying'].includes(job.state))
 return job
}

/** Undo (or roll back) a door import in bounded steps until it is finished. */
export async function undoPlan(door: Door, planId: string) {
 let job
 do job = (await door('undo', { planId })).job
 while (['undoing', 'rolling_back'].includes(job?.state))
 return job
}
