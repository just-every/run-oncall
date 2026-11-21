#!/usr/bin/env node
// Synthetic saved responses only. No provider requests, clock or randomness.
import {createHash} from 'node:crypto'
import {mkdir,writeFile,readFile} from 'node:fs/promises'
import {resolve} from 'node:path'
import {fileURLToPath} from 'node:url'

export const schema = {
 url:'https://github.com/PagerDuty/api-schema/blob/main/reference/REST/openapiv3.json',
 readAt:'2026-11-17',version:'2.0.0',sha256:'cbae7d77f588e8fb5b14118003c9b8a71f274c57719ddc39eb8e77a71994f6d8',
}
const hash=bytes=>createHash('sha256').update(bytes).digest('hex')
const id=(kind,n)=>`synthetic-oncall-${kind}-${n+1}`
const ref=(kind,n)=>({id:id(({escalation_policy:'policy',event_orchestration:'orchestration'})[kind]??kind,n),type:kind+'_reference'})
const at='2026-11-01T09:00:00Z',until='2026-11-03T09:00:00Z'
const range=(n,fn)=>Array.from({length:n},(_,i)=>fn(i))
const integrationType=i=>i%4===3?'generic_email_inbound_integration':i%2?'events_api_v2_inbound_integration':'generic_events_api_inbound_integration'
export function generatePagerDutyFixture() {
 const bundle={},bindings=[],counts={}
 const add=(kind,rows,wrap=kind,{paged=true,parent,detail=false}={})=>{
  counts[kind]=rows.length
  if(detail)bundle[kind]=rows.map((row,i)=>{
   if(parent)bindings.push({pointer:`/${kind}/${i}/${wrap}`,parentKind:parent(i).kind,parentId:parent(i).id})
   return {[wrap]:row}
  })
  else {
   // Parent-scoped endpoints have one response per parent; account lists use
   // two real offset pages, including a short final page and nullable total.
   const groups=new Map()
   if(parent)rows.forEach((row,i)=>{const key=JSON.stringify(parent(i));if(!groups.has(key))groups.set(key,{rows:[],index:i});groups.get(key).rows.push(row)})
   const pages=parent?[...groups.values()]:range(Math.ceil(rows.length/25),i=>({rows:rows.slice(i*25,(i+1)*25),index:i}))
   bundle[kind]=pages.map(({rows:items,index},page)=>{
    if(parent)items.forEach((_,j)=>bindings.push({pointer:`/${kind}/${page}/${wrap}/${j}`,parentKind:parent(index).kind,parentId:parent(index).id}))
    return {[wrap]:items,...(paged?{limit:25,offset:parent?0:index*25,more:parent?false:(index+1)*25<rows.length,total:null}:{})}
   })
  }
 }
 const users=range(60,i=>({id:id('user',i),type:'user',name:`Synthetic responder ${i+1}`,email:`synthetic-oncall-${i+1}@example.test`,time_zone:i%2?'America/New_York':'UTC',role:'user',
  teams:[ref('team',i%6)],contact_methods:[0,1].map(n=>({id:id('contact',i*2+n),type:n?'sms_contact_method_reference':'phone_contact_method_reference'})),
  notification_rules:[{id:id('notification',i),type:'assignment_notification_rule_reference'}]}))
 add('users',users)
 add('teams',range(6,i=>({id:id('team',i),type:'team',name:`Synthetic team ${i+1}`,description:'Synthetic account inventory'})))
 // These endpoints have their own wrappers; the response has no parent user.
 add('contact_methods',range(120,i=>({id:id('contact',i),type:i%2?'sms_contact_method':'phone_contact_method',label:i%2?'SMS':'Voice',country_code:Math.floor(i/2)%3===0?354:1,address:Math.floor(i/2)%3===0?`555${String(Math.floor(i/2)+1).padStart(4,'0')}`:`202555${String(Math.floor(i/2)+100).padStart(4,'0')}`,enabled:true,blacklisted:false})), 'contact_methods', {paged:false,parent:i=>({kind:'users',id:id('user',Math.floor(i/2))})})
 add('notification_rules',range(60,i=>({id:id('notification',i),type:'assignment_notification_rule',start_delay_in_minutes:i%2?5:0,urgency:i%2?'low':'high',contact_method:{id:id('contact',i*2),type:'phone_contact_method_reference'}})), 'notification_rules',{paged:false,parent:i=>({kind:'users',id:id('user',i)})})
 add('schedules',range(12,i=>({id:id('schedule',i),type:'schedule',name:`Synthetic rota ${i+1}`,time_zone:'UTC',description:'Daily saved coverage; no native authority',
  schedule_layers:[{id:id('layer',i),name:'Daily primary',start:at,rotation_virtual_start:at,rotation_turn_length_seconds:86400,users:[0,1].map(n=>({user:ref('user',i*2+n)})),restrictions:[]}],
  final_schedule:{name:'Final Schedule',start:at,end:until,rendered_schedule_entries:[{start:at,end:'2026-11-02T09:00:00Z',user:ref('user',i*2)},{start:'2026-11-02T09:00:00Z',end:until,user:ref('user',i*2+1)}]}})), 'schedule',{detail:true})
 add('overrides',range(12,i=>({id:id('override',i),start:'2026-12-01T09:00:00Z',end:'2026-12-01T10:00:00Z',user:ref('user',i*2+1)})), 'overrides',{paged:false,parent:i=>({kind:'schedules',id:id('schedule',i)})})
 add('escalation_policies',range(12,i=>({id:id('policy',i),type:'escalation_policy',name:`Synthetic escalation ${i+1}`,num_loops:0,escalation_rules:[{id:id('rule',i),escalation_delay_in_minutes:i===0?0:5,targets:[ref('schedule',i)]}],teams:[ref('team',i%6)]})))
 add('services',range(24,i=>({id:id('service',i),type:'service',name:`Synthetic service ${i+1}`,description:'Source service only',escalation_policy:ref('escalation_policy',i%12),teams:[ref('team',i%6)],
  integrations:[0,1].map(n=>({id:id('integration',i*2+n),type:integrationType(i*2+n)+'_reference'})),acknowledgement_timeout:1800,auto_resolve_timeout:14400,
  alert_grouping_parameters:{type:'time',config:{timeout:300}},incident_urgency_rule:{type:'constant',urgency:'high'},support_hours:{type:'fixed_time_per_day',time_zone:'UTC',start_time:'09:00:00',end_time:'17:00:00',days_of_week:[1,2,3,4,5]},
  ...(i===0?{future_setting:{'a/b~c':true}}:{})})))
 add('integrations',range(48,i=>({id:id('integration',i),type:integrationType(i),name:`Synthetic integration ${i+1}`,
  ...(i%4===3?{email_incident_creation:'use_rules',email_filter_mode:'all-email',email_parsing_fallback:'open_new_incident',email_parsers:['trigger','resolve'].map(action=>({action,match_predicate:{type:'contains',part:'subject',matcher:action==='trigger'?'FAILED':'OK',children:[]},value_extractors:[{type:'regex',part:'subject',value_name:'incident_key',regex:'(synthetic-oncall-[a-z0-9-]+)'}]}))}:{}),service:ref('service',Math.floor(i/2))})), 'integration',{detail:true,parent:i=>({kind:'services',id:id('service',Math.floor(i/2))})})
 add('incidents',range(48,i=>({id:id('incident',i),type:'incident',title:`Synthetic incident ${i+1}`,incident_number:i+1,status:i%3===0?'triggered':i%3===1?'acknowledged':'resolved',created_at:at,last_status_change_at:until,service:ref('service',i%24),assignments:[{at,assignee:ref('user',i%60)}],urgency:i%2?'low':'high'})))
 add('log_entries',range(48,i=>({id:id('log',i),type:'annotate_log_entry',created_at:at,agent:ref('user',i%60),incident:ref('incident',i),note:`Synthetic retained timeline ${i+1}`})), 'log_entries',{parent:i=>({kind:'incidents',id:id('incident',i)})})
 add('business_services',range(6,i=>({id:id('business',i),type:'business_service',name:`Synthetic business service ${i+1}`,description:'Status inventory only',team:ref('team',i),point_of_contact:'Synthetic operator'})))
 // Subscriber responses use subscriber_id/type, not an invented id property.
 add('subscribers',range(18,i=>({subscriber_id:id('user',i),subscriber_type:'user'})), 'subscribers',{parent:i=>({kind:'business_services',id:id('business',Math.floor(i/3))})})
 add('maintenance_windows',range(6,i=>({id:id('maintenance',i),type:'maintenance_window',description:`Synthetic maintenance ${i+1}`,start_time:at,end_time:until,services:[ref('service',i)]})))
 add('event_orchestrations',range(6,i=>({id:id('orchestration',i),name:`Synthetic orchestration ${i+1}`,team:ref('team',i),routes:1,created_at:at})), 'orchestrations')
 add('orchestration_routers',range(6,i=>({type:'router',parent:ref('event_orchestration',i),sets:[{id:'start',rules:[{id:id('route',i),label:'Synthetic route',conditions:[{expression:"event.summary matches part 'synthetic'"}],actions:{route_to:id('service',i)}}]}],catch_all:{actions:{route_to:'unrouted'}},created_at:at,version:'synthetic-oncall-1'})), 'orchestration_path',{detail:true,parent:i=>({kind:'event_orchestrations',id:id('orchestration',i)})})
 add('automation_actions',range(6,i=>({id:id('action',i),type:'action',name:`Synthetic automation ${i+1}`,description:'Inert source definition; never execute',action_type:'script',action_data_reference:{script:'echo synthetic-oncall'},creation_time:at,modify_time:at,services:[ref('service',i)],only_invocable_on_unresolved_incidents:true,map_to_all_services:false,allow_invocation_manually:true,allow_invocation_from_event_orchestration:false})), 'actions',{paged:false})
 const actions=bundle.automation_actions[0].actions
 bundle.automation_actions=[{actions:actions.slice(0,3),limit:3,next_cursor:'synthetic-oncall-cursor-1'},{actions:actions.slice(3),limit:3,next_cursor:null}]
 bundle._bindings=bindings
 return {bundle,counts}
}
export async function writePagerDutyFixture(directory) {
 const {bundle,counts}=generatePagerDutyFixture(),account=JSON.stringify(bundle)+'\n'
 if(Buffer.byteLength(account)>512*1024||Object.values(counts).reduce((a,b)=>a+b,0)!==498)throw Error('Synthetic fixture no longer fits the existing import bounds')
 const manifest={schema,objects:Object.values(counts).reduce((a,b)=>a+b,0),byKind:counts,bytes:Buffer.byteLength(account),sha256:hash(account),
  endpoints:{users:'GET /users',contact_methods:'GET /users/{id}/contact_methods',notification_rules:'GET /users/{id}/notification_rules',teams:'GET /teams',schedules:'GET /schedules/{id}',overrides:'GET /schedules/{id}/overrides',escalation_policies:'GET /escalation_policies',services:'GET /services',integrations:'GET /services/{id}/integrations/{integration_id}',incidents:'GET /incidents',log_entries:'GET /incidents/{id}/log_entries',business_services:'GET /business_services',subscribers:'GET /business_services/{id}/subscribers',maintenance_windows:'GET /maintenance_windows',event_orchestrations:'GET /event_orchestrations',orchestration_routers:'GET /event_orchestrations/{id}/router',automation_actions:'GET /automation_actions/actions'},
  limitations:['Synthetic documented-shape data, not a customer export or live account receipt.','_bindings is Oncall packaging metadata outside every original endpoint response.','No keys, tokens, API calls, active paging, access grants or executable actions.','PTO, reviews and action items not returned by these endpoints remain missing data, not invented export objects.']}
 await mkdir(directory,{recursive:true})
 await writeFile(resolve(directory,'account.json'),account)
 await writeFile(resolve(directory,'manifest.json'),JSON.stringify(manifest,null,2)+'\n')
 return manifest
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
 const directory=process.argv[2]??'tests/fixtures/pagerduty-synthetic'
 if(process.argv[3]) {
  const bytes=await readFile(process.argv[3]);if(hash(bytes)!==schema.sha256)throw Error('Public schema digest differs; review format assumptions before regenerating')
 }
 const manifest=await writePagerDutyFixture(directory)
 console.log(JSON.stringify({objects:manifest.objects,bytes:manifest.bytes,sha256:manifest.sha256,directory}))
}
