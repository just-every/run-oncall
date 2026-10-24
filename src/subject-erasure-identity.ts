import { fail, type State } from './family/response-operations/domain.ts'
export async function subjectErasureIdentity(kind:string,id:string) {
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(['native-subject-erasure-v1',kind,id])))
 return Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('')
}
export async function hasErasedSubject(state:State) {
 const fences=new Set(state.erasureFences?.map(f=>f.id))
 for(const [kind,rows] of [['incident',state.incidents],['client',state.apiClients],['endpoint',state.apiEndpoints],['intake',state.intakeSources],['change',state.changeSources]] as const)
  for(const row of rows??[])if(fences.has(await subjectErasureIdentity(kind,row.id)))return true
 return false
}

export async function requireNewSubjectIdentity(state:State,kind:string,id:string) {
 const digest=await subjectErasureIdentity(kind,id)
 if(state.erasureFences?.some(f=>f.id===digest))fail('This subject identity was erased; choose a new ID',410)
}

/** Handoff archives may keep orphan sources, so ordinary reference validation
 * cannot authorize a copy of an explicitly erased incident or handoff. */
export async function requireHandoffErasureFence(state:State,archive:{records:{id:string;source:{incident:{id:string}}}[]}) {
 const fences=new Set((state.erasureFences??[]).map(f=>f.id))
 for(const row of archive.records)if(fences.has(await subjectErasureIdentity('incident',row.source.incident.id))||fences.has(await subjectErasureIdentity('handoff',row.id)))fail('Handoff predates the subject erasure fence; nothing was restored',409)
}
