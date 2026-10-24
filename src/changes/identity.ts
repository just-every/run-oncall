import type { State } from '../family/response-operations/domain.ts'

// A separate namespace distinguishes provider retry identities from the
// portability journal's row and checkpoint digests. No event value is retained.
export async function changeErasureIdentity(source: string, eventId: string) {
 const bytes=new TextEncoder().encode(JSON.stringify(['change-event-erasure-v1',source,eventId]))
 const digest=await crypto.subtle.digest('SHA-256',bytes)
 return Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('')
}

/** Metadata alone cannot authorize an old row: a current journal paired with
 * old data must still refuse the erased provider identity before publication. */
export async function hasErasedChange(state: State) {
 const fences=new Set((state.erasureFences??[]).map(row=>row.id))
 if(!fences.size)return false
 for(const change of state.changes??[])if(fences.has(await changeErasureIdentity(change.source,change.eventId)))return true
 return false
}
