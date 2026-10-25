import { fail, type State } from './family/response-operations/domain.ts'
export async function subjectErasureIdentity(kind:string,id:string) {
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(['native-subject-erasure-v1',kind,id])))
 return Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('')
}
export async function hasErasedSubject(state:State) {
 const fences=new Set(state.erasureFences?.map(f=>f.id))
 if(!fences.size)return false
 const known=new Map<string,boolean>()
 const erased=async(id:string)=>{if(!known.has(id))known.set(id,fences.has(await subjectErasureIdentity("member",id)));return known.get(id)!}
 for(const member of state.members)if(!member.erased&&await erased(member.id))return true
 for(const event of state.events)for(const member of event.routingSnapshot.members)if(await erased(member.id)&&!["Erased member","Erased integration"].includes(member.name))return true
 for(const [kind,rows] of [['incident',state.incidents],['client',state.apiClients],['endpoint',state.apiEndpoints],['intake',state.intakeSources],['change',state.changeSources],['email',state.emailAddresses],['workflow',state.triage?.filter(row=>row.kind==='bulk'&&row.workflow)]] as const)
  for(const row of rows??[])if(fences.has(await subjectErasureIdentity(kind,row.id)))return true
 return false
}

export async function requireNewSubjectIdentity(state:State,kind:string,id:string) {
 const digest=await subjectErasureIdentity(kind,id)
 if(state.erasureFences?.some(f=>f.id===digest))fail('This subject identity was erased; choose a new ID',410)
}

/** Handoff archives may keep orphan sources, so ordinary reference validation
 * cannot authorize a copy of an explicitly erased incident or handoff. */
export async function requireHandoffErasureFence(state:State,archive:{records:{id:string;source:{incident:{id:string}};history?:{actor:{id:string}|null}[]}[]}) {
 const fences=new Set((state.erasureFences??[]).map(f=>f.id))
 for(const row of archive.records){for(const entry of row.history??[])if(entry.actor&&fences.has(await subjectErasureIdentity('member',entry.actor.id)))fail('Handoff predates the member erasure fence; nothing was restored',409)
 if(fences.has(await subjectErasureIdentity('incident',row.source.incident.id))||fences.has(await subjectErasureIdentity('handoff',row.id)))fail('Handoff predates the subject erasure fence; nothing was restored',409)
 }
}
