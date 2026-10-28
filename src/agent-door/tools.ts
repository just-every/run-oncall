import catalogue from './catalogue.json'
import {isNativeClient} from './people'
import {nativeContext,nativeRevision,nativeFailure,readNative,mutateNative,service,incident,refuse,touchClient} from './native'
import {pagingSnapshot} from '../paging-store'
import {reviewSchedule} from '../schedule-coverage/review'
import {eraseNativeSubject} from '../subject-erasure'
import type {ToolDefinition,ToolContext,ClassAndFacts} from '../modules/agent-door/index.ts'
import type {Bindings} from '../auth.server'
import {canonical} from '../modules/agent-door/policy/document.ts'
async function erasureClasses(env:Bindings,n:Awaited<ReturnType<typeof nativeContext>>,args:Record<string,any>):Promise<ClassAndFacts[]> {
 const client=args.kind==='client'?n.state.apiClients?.find(c=>c.id===args.id):undefined
 const endpoints=(n.state.apiEndpoints??[]).filter(e=>args.kind==='endpoint'?e.id===args.id:args.kind==='client'&&e.client===args.id).map(e=>e.id)
 const exists=args.kind==='incident'?n.state.incidents.some(i=>i.id===args.id):args.kind==='client'?!!client:endpoints.length>0
 if(!exists)return refuse('not_found')
 const pending=(n.state.apiOutbox??[]).filter(o=>(args.kind==='incident'?o.incident===args.id:endpoints.includes(o.endpoint)||args.kind==='client'&&o.client===args.id)&&['queued','failed','sending','uncertain'].includes(o.status))
 const keys=await env.DB.prepare('SELECT (SELECT COUNT(*) FROM oc_api_credentials WHERE client=?) + (SELECT COUNT(*) FROM oc_endpoint_credentials WHERE endpoint IN (SELECT value FROM json_each(?))) AS n').bind(client?.id??'',JSON.stringify(endpoints)).first<{n:number}>()
 const classes:ClassAndFacts[]=[{class:'destructive',facts:{measure:1}}]
 if(client?.active&&client.permissions.length)classes.push({class:'access',facts:{measure:1,direction:'narrows'}})
 if(keys?.n)classes.push({class:'security',facts:{measure:1,setting:'credential-erasure'}})
 if(pending.length){const services=[...new Set(pending.map(o=>o.service))].sort();classes.push({class:'live',facts:{measure:services.length,service:services.join(', ')}})}
 return classes
}
async function nativeWitness(env:Bindings,ctx:ToolContext,scope:string) {
 const n=await nativeContext(env,ctx,scope,true),p=await pagingSnapshot(env.DB)
 if(!env.SESSION_SECRET)return refuse('storage_unavailable')
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.SESSION_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign'])
 const fingerprint=async(value:unknown)=>Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode('oncall-native-witness/v1\0'+canonical(value))))).map(b=>b.toString(16).padStart(2,'0')).join('')
 const records=async(input:Record<string,unknown>)=>Object.fromEntries(await Promise.all(Object.entries(input).map(async([kind,value])=>[kind,Array.isArray(value)?await Promise.all(value.map(record=>fingerprint({kind,record}))):await fingerprint({kind,value})])))
 const tables=['oc_agent_outbox','oc_agent_deadlines','oc_agent_transport','oc_api_credentials','oc_endpoint_credentials']
 const custody=Object.fromEntries(await Promise.all(tables.map(async table=>[table,await Promise.all((await env.DB.prepare('SELECT * FROM '+table+' ORDER BY 1').all()).results.map(record=>fingerprint({table,record})))])))
 // Keyed fingerprints cover every field without disclosing protected content
 // or enabling dictionary guesses about people, intake or credential records.
 return {state:{revision:n.state.revision,records:await records(n.state as unknown as Record<string,unknown>)},paging_records:await records(p.archive as unknown as Record<string,unknown>),custody,paging:'OFF'}
}
export function oncallTools(env:Bindings):ToolDefinition[] {
 return catalogue.map(definition=>{
  const [,area,verb]=definition.name.split('.')
  const base=definition as unknown as ToolDefinition
  const adminOnly=['access','clients','endpoints','teams','automation','privacy','witness','imports'].includes(area)||area==='services'&&!base.readOnly
  return {...base,untrusted:true,
   async classify(args,ctx) {
    const n=await nativeContext(env,ctx,base.scope,adminOnly)
    if(!base.readOnly&&!['admin','responder'].includes(n.member.role))return refuse('insufficient_role')
    if(area==='privacy')return erasureClasses(env,n,args)
    if(area==='incidents'&&(verb==='resolve'||verb==='update'&&args.field==='state'&&args.value==='resolved')) {
     incident(n,args.id)
     return [{class:'commitment',facts:{measure:1,currency:'XXX',counterparty:'internal'}}]
    }
    if(area==='incidents'&&verb==='update'){incident(n,args.id);return [{class:'standard',facts:{measure:1}}]}
    if(area==='incidents'&&verb!=='list') {if(verb==='declare'||verb==='page')service(n,args.service);else incident(n,args.id)}
    if(area==='notes'||area==='actions'&&verb!=='list')incident(n,args.incident,area==='actions')
    if(area==='deadlines') {
     const i=incident(n,args.incident),d=i.deadlines?.find(d=>d.id===args.id)
     if(!d)return refuse('not_found')
     return [{class:'standard',facts:{measure:d.state==='pending'&&Date.parse(d.dueAt)<=Date.now()?1:0}}]
    }
    if(area==='services'&&verb!=='list')service(n,args.id)
    if(area==='schedules') {
     if(verb==='list')return [{class:'standard',facts:{measure:1}}]
     if(verb==='create'){const s=service(n,(args.schedule as any)?.service);return [{class:'live',facts:{measure:1,service:s.id}}]}
     const s=(await pagingSnapshot(env.DB)).archive.schedules.find(s=>s.id===args.id&&n.services.includes(s.service))
     if(!s)return refuse('not_found')
     return [{class:base.classes[0],facts:{measure:1,...(base.classes.includes('live')?{service:s.service}:{})}}]
    }
    if(area==='automation'&&verb!=='read') {
     const item=n.state.apiOutbox?.find(o=>o.id===args.id&&n.services.includes(o.service))
     if(!item)return refuse('not_found')
     const endpoint=n.state.apiEndpoints?.find(e=>e.id===item.endpoint)
     if(!endpoint)return refuse('not_found')
     return [{class:'external',facts:{measure:1,counterparty:'known'}}]
    }
    if(area==='access'&&verb==='update') {
     const old=n.state.members.find(m=>m.id===args.id)
     if(!old)return refuse('not_found')
     const classes:ClassAndFacts[]=[{class:'access',facts:{measure:1,direction:widensMember(old,args)?'widens':'narrows'}}]
     const eligible=(m:{active:boolean;role:string})=>m.active&&['admin','responder'].includes(m.role)
     if(eligible(old)!==eligible({...old,role:typeof args.role==='string'?args.role:old.role,active:typeof args.active==='boolean'?args.active:old.active})) {
      const at=ctx.now(),schedules=(await pagingSnapshot(env.DB)).archive.schedules.filter(s=>(!s.validUntil||Date.parse(s.validUntil)>at)&&(s.primary.members.includes(old.id)||s.backup.members.includes(old.id)||s.overrides.some(o=>o.member===old.id&&Date.parse(o.end)>at)||s.layers?.some(l=>(!l.end||Date.parse(l.end)>at)&&l.rotation.members.includes(old.id))))
      if(schedules.length){const services=[...new Set(schedules.map(s=>s.service))].sort();classes.push({class:'live',facts:{measure:services.length,service:services.join(', ')}})}
     }
     return classes
    }
    if(area==='teams')return [{class:'access',facts:{measure:1,direction:teamWidens(n.state.teams?.find(t=>t.id===args.id),args)?'widens':'narrows'}}]
    if(area==='services'&&verb==='ownership')return [{class:'access',facts:{measure:1,direction:ownership(n,args,ctx.person.id).widens?'widens':'narrows'}}]
    return base.classes.map(c=>({class:c,facts:{measure:1,...(c==='sensitive'?{kind:'staff-access'}:{}),...(c==='access'?{direction:'narrows' as const}:{}),...(c==='security'?{setting:area+':credential-revocation'}:{})}}))
   },
   ...(!base.readOnly?{
    revision:(args:Record<string,unknown>,ctx:ToolContext)=>nativeRevision(env,ctx,area,args,base.scope),
    async summary(args:Record<string,any>,ctx:ToolContext) {
     const n=await nativeContext(env,ctx,base.scope,adminOnly)
     if(area==='privacy') {
      const classes=await erasureClasses(env,n,args)
      const target=args.kind==='incident'?n.state.incidents.find(i=>i.id===args.id):args.kind==='client'?n.state.apiClients?.find(c=>c.id===args.id):n.state.apiEndpoints?.find(e=>e.id===args.id)
      return {target:{id:String(args.id),name:(target as any)?.name??(target as any)?.title??String(args.kind)+' erasure'},items:['Erase the native subject and its dependent local custody',JSON.stringify(classes),'Native workspace revision '+n.state.revision,'Prepared by '+ctx.actor.label]}
     }
     if(area==='automation') {
      const item=n.state.apiOutbox?.find(o=>o.id===args.id&&n.services.includes(o.service)),endpoint=n.state.apiEndpoints?.find(e=>e.id===item?.endpoint)
      if(!item||!endpoint)return refuse('not_found')
      return {target:{id:item.id,name:item.event+' for '+item.service},recipients:[endpoint.url],items:[JSON.stringify(item.payload),'Operation revision '+item.revision+'; '+item.status,'Native recipient revision '+endpoint.revision,'Prepared by '+ctx.actor.label]}
     }
     const targetId=String(args.id??args.incident??args.service??'')
     const nativeIncident=n.state.incidents.find(i=>i.id===(args.incident??args.id))
     const nativeAction=nativeIncident?.actions.find(a=>a.id===args.id)
     const nativePerson=n.state.members.find(m=>m.id===args.id)
     const nativeService=n.state.services.find(s=>s.id===(args.id??args.service))
     const nativeClient=n.state.apiClients?.find(c=>c.id===args.id)
     const nativeEndpoint=n.state.apiEndpoints?.find(c=>c.id===args.id)
     const targetName=nativeAction?.title??nativeIncident?.title??nativePerson?.name??nativeService?.name??nativeClient?.name??nativeEndpoint?.name??String(args.title??args.name??area+' '+verb)
     const {operation_id:_operation,...effect}=args
     return {target:{id:targetId,name:targetName},...(args.role?{role:args.role}:{}),items:[JSON.stringify(effect),...(nativeIncident?['Native incident revision '+nativeIncident.revision]:[]),'Prepared by '+ctx.actor.label]}
    },
   }:{}),
   ...(base.classes.some(c=>c==='access'||c==='security')?{
    async authority(args:Record<string,any>,ctx:ToolContext) {
     const n=await nativeContext(env,ctx,base.scope,adminOnly)
     if(area==='privacy'){await erasureClasses(env,n,args);return {subject:String(args.id),widens:false}}
     if(area==='access') {
      // Both ID and an OA-backed current address resolve to the same native subject.
      const old=n.state.members.find(m=>m.id===args.id)
      if(!old)return refuse('not_found')
      return {subject:old.id,widens:widensMember(old,args)}
     }
     if(area==='services') {
      return ownership(n,args,ctx.person.id)
     }
     if(area==='teams') {
      const old=n.state.teams?.find(t=>t.id===args.id)
      const self=(args.managers??[]).includes(ctx.person.id)&&!old?.managers.includes(ctx.person.id)
      return {subject:self?ctx.person.id:String(args.id??'new-team'),widens:teamWidens(old,args)}
     }
     return {subject:String(args.id),widens:false}
    },
   }:{}),
   async run(args,ctx) {
    return nativeFailure(async()=>{
     let data:any
     if(area==='witness') {
      data=await nativeWitness(env,ctx,base.scope)
     } else if((area==='clients'||area==='endpoints')&&verb==='read') {
      const n=await nativeContext(env,ctx,base.scope,true)
      const record=(area==='clients'?n.state.apiClients:n.state.apiEndpoints)?.find(c=>c.id===args.id)
      if(!record)return refuse('not_found')
      const {url,...safe}=record as typeof record&{url?:string}
      data={...safe,grants:record.active?(area==='clients'?(record as any).permissions.map((p:string)=>p):['signed-events:send']):[]}
     } else if(area==='schedules'&&verb==='review') {
      const n=await nativeContext(env,ctx,base.scope),p=await pagingSnapshot(env.DB),s=p.archive.schedules.find(s=>s.id===args.id&&n.services.includes(s.service))
      if(!s)return refuse('not_found')
      data=await reviewSchedule(s,args.schedule,n.state,Number(args.from),Number(args.to))
     } else if(area==='privacy') {
      const n=await nativeContext(env,ctx,base.scope,true)
      if(isNativeClient(ctx.clientId))return refuse('insufficient_scope')
      const c={env,req:{param:(key:string)=>args[key]},get:(key:string)=>key==='actor'?n.member:undefined,json:(value:unknown)=>value}
      data=await eraseNativeSubject(c,{body:async()=>({...args,confirmation:'erase '+args.id}),state:async()=>n.state,guard:()=>n.guard})
      ctx.emit('record.erased',args.kind==='incident'?'oncall://incidents/'+String(args.id):'oncall://services/'+n.services[0],{kind:args.kind})
     } else data=base.readOnly?await readNative(env,ctx,area,verb,args):await mutateNative(env,ctx,area,verb,args)
     if(base.readOnly)await touchClient(env,ctx)
     const id=data?.id??args.id
     const uri=area==='incidents'&&id?'oncall://incidents/'+id:area==='services'&&id?'oncall://services/'+id:area==='actions'&&id?'oncall://actions/'+id:area==='schedules'&&id?'oncall://schedules/'+id+'/coverage':undefined
     return {result:{data:JSON.parse(JSON.stringify(data)),paging:'OFF'},...(!uri||area==='privacy'?{}:{resources:[{uri,name:base.title}]})}
    })
   },
  }
 })
}
function widensMember(old:{role:string;active:boolean},args:Record<string,any>) {
 const grants:Record<string,Set<string>>={admin:new Set(['read','coordinate','manage']),responder:new Set(['read','coordinate']),viewer:new Set(['read']),stakeholder:new Set(['status'])}
 return args.active&&(!old.active||[...grants[args.role]??[]].some(g=>!grants[old.role]?.has(g)))
}
function teamWidens(old:{members:string[];managers:string[];active:boolean}|undefined,args:Record<string,any>) {
 return !!args.active&&(!old?.active||(args.members??[]).some((id:string)=>!old.members.includes(id))||(args.managers??[]).some((id:string)=>!old.managers.includes(id)))
}
function ownership(n:import('./native').NativeContext,args:Record<string,any>,sponsor:string) {
 const service=n.state.services.find(s=>s.id===args.id),old=n.state.teams?.find(t=>t.id===service?.team),next=n.state.teams?.find(t=>t.id===args.team)
 const eligible=(team:typeof old)=>team?.active?team.managers.filter(id=>n.state.members.some(m=>m.id===id&&m.active&&m.role==='responder')):[]
 const prior=eligible(old),added=eligible(next).filter(id=>!prior.includes(id))
 return {subject:added.includes(sponsor)?sponsor:String(args.team??'unassigned'),widens:added.length>0}
}
