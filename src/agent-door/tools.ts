import catalogue from './catalogue.json'
import {isNativeClient} from './people'
import {nativeContext,nativeRevision,nativeFailure,readNative,mutateNative,service,incident,refuse} from './native'
import {pagingSnapshot} from '../paging-store'
import {reviewSchedule} from '../schedule-coverage/review'
import {eraseNativeSubject} from '../subject-erasure'
import type {ToolDefinition,ToolContext,ClassAndFacts} from '../modules/agent-door/index.ts'
import type {Bindings} from '../auth.server'
export function oncallTools(env:Bindings):ToolDefinition[] {
 return catalogue.map(definition=>{
  const [,area,verb]=definition.name.split('.')
  const base=definition as unknown as ToolDefinition
  return {...base,untrusted:true,
   async classify(args,ctx) {
    const n=await nativeContext(env,ctx,base.scope,['access','clients','endpoints','teams','automation','privacy','witness','imports'].includes(area))
    if(area==='incidents'&&verb!=='list') {if(verb==='declare'||verb==='page')service(n,args.service);else incident(n,args.id)}
    if(area==='notes'||area==='actions'&&verb!=='list')incident(n,args.incident)
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
     return [{class:'access',facts:{measure:1,direction:widensMember(old,args)?'widens':'narrows'}}]
    }
    if(area==='teams')return [{class:'access',facts:{measure:1,direction:teamWidens(n.state.teams?.find(t=>t.id===args.id),args)?'widens':'narrows'}}]
    if(area==='services'&&verb==='ownership')return [{class:'access',facts:{measure:1,direction:ownership(n,args,ctx.person.id).widens?'widens':'narrows'}}]
    return base.classes.map(c=>({class:c,facts:{measure:1,...(c==='sensitive'?{kind:'staff-access'}:{}),...(c==='access'?{direction:'narrows' as const}:{}),...(c==='security'?{setting:area+':credential-revocation'}:{})}}))
   },
   ...(!base.readOnly?{
    revision:(args:Record<string,unknown>,ctx:ToolContext)=>nativeRevision(env,ctx,area,args,base.scope),
    async summary(args:Record<string,any>,ctx:ToolContext) {
     const n=await nativeContext(env,ctx,base.scope)
     if(area==='automation') {
      const item=n.state.apiOutbox?.find(o=>o.id===args.id&&n.services.includes(o.service)),endpoint=n.state.apiEndpoints?.find(e=>e.id===item?.endpoint)
      if(!item||!endpoint)return refuse('not_found')
      return {target:{id:item.id,name:item.event+' for '+item.service},recipients:[endpoint.url],items:[JSON.stringify(item.payload),'Native recipient revision '+endpoint.revision,'Agent: '+ctx.actor.label]}
     }
     return {target:{id:String(args.id??args.incident??args.service??''),name:String(args.title??args.name??area+' '+verb)},...(args.role?{role:args.role}:{}),items:[JSON.stringify(args),'Prepared by '+ctx.actor.label]}
    },
   }:{}),
   ...(base.classes.some(c=>c==='access'||c==='security')?{
    async authority(args:Record<string,any>,ctx:ToolContext) {
     const n=await nativeContext(env,ctx,base.scope)
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
      const n=await nativeContext(env,ctx,base.scope,true),p=await pagingSnapshot(env.DB)
      data={state:n.state,schedules:p.archive.schedules,paging:'OFF'}
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
      ctx.emit('record.erased','oncall://incidents/'+String(args.id))
     } else data=base.readOnly?await readNative(env,ctx,area,verb,args):await mutateNative(env,ctx,area,verb,args)
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
