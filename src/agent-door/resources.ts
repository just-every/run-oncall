import type {ResourceDefinition,ResourceContext} from '../modules/agent-door/index.ts'
import type {Bindings} from '../auth.server'
import {readNative,nativeContext,refuse} from './native'
export function oncallResources(env:Bindings):ResourceDefinition[] {
 const definitions=[
  ['oncall://services/{id}','Service','services:read','services','read'],
  ['oncall://incidents/{id}','Incident','incidents:read','incidents','read'],
  ['oncall://incidents/{id}/review-material','Review material','incidents:read','reviews','read'],
  ['oncall://services/{id}/changes','Recent changes','incidents:read','changes','read'],
  ['oncall://schedules/{id}/coverage','Coordination coverage','schedules:read','schedules','coverage'],
  ['oncall://actions/{id}','Follow-up','actions:read','actions','read'],
  ['oncall://automation/outbox/{id}','Minimal event outcome','automation:read','automation','outbox'],
 ]
 return definitions.map(([uriTemplate,name,scope,area,verb])=>({uriTemplate,name,scope,classes:['standard'],mimeType:'application/json',
  classify:()=>[{class:'standard',facts:{measure:1}}],
  async read(uri:string,ctx:ResourceContext) {
   try {
    const prefix=uriTemplate.slice(0,uriTemplate.indexOf('{')),suffix=uriTemplate.slice(uriTemplate.indexOf('}')+1)
    if(!uri.startsWith(prefix)||suffix&&!uri.endsWith(suffix))return null
    const id=decodeURIComponent(uri.slice(prefix.length,suffix?-suffix.length:undefined))
    if(!id||id.includes('/'))return null
    let data
    if(area==='actions') {
     const n=await nativeContext(env,ctx,scope),i=n.state.incidents.find(i=>n.services.includes(i.service)&&i.actions.some(a=>a.id===id))
     if(!i)return null
     data=await readNative(env,ctx,area,verb,{id,incident:i.id})
    } else if(verb==='outbox') {
     const n=await nativeContext(env,ctx,scope,true)
     data=n.state.apiOutbox?.find(o=>o.id===id&&n.services.includes(o.service))??refuse('not_found')
    } else data=await readNative(env,ctx,area,verb,area==='changes'?{service:id}:{id})
    return {json:data,untrusted:true}
   }catch{return null}
  },
 }))
}
