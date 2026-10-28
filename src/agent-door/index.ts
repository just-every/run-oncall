import {createAgentDoor,type Trust,type ToolContext} from '../modules/agent-door/index.ts'
import {oncallPeople,oncallSettings,localCredentials,clientScopes,memberMapping} from './people'
import {oncallTools} from './tools'
import {oncallResources} from './resources'
import {runtimeBindings,type Bindings} from '../auth.server'
import {nativeSession} from '../native-session'
import {admitted} from '../base/setup-state'
export function oncallAgentDoor(original:Bindings) {
 const env=runtimeBindings(original)
 const fields=[env.RER_OWNER_CLAIM_ISSUER,env.RER_OWNER_CLAIM_INSTALLATION_ID,env.RER_OWNER_CLAIM_PUBLIC_KEYS]
 let trust:Trust|null=null
 if(fields.some(Boolean)) {
  if(!fields.every(Boolean))throw Error('Incomplete installation agent trust')
  trust={issuer:fields[0]!,installationId:fields[1]!,appOrigin:env.AUTH_ORIGIN,publicKeys:JSON.parse(fields[2]!)}
 }
 return createAgentDoor({seed:'oncall',name:'Oncall',specialist:'on-call responder',db:env.DB,origin:env.AUTH_ORIGIN,trust,
  people:oncallPeople(env),localCredentials:request=>localCredentials(env,request),currentScopes:p=>clientScopes(env,p),
  tools:oncallTools(env),resources:oncallResources(env),
  notTools:[
   {clauses:['OC-018','OC-042','OC-049'],reason:'screen'},
   {clauses:['OC-021','OC-022','OC-038','OC-074'],reason:'import-door'},
   {clauses:['OC-018','OC-052'],reason:'installation'},
   {clauses:['OC-026','OC-029','OC-045','OC-063'],reason:'connector'},
  ],
  prompts:[{name:'oncall.response.shift',title:'Coordinate an incident',description:'Read the service, source evidence, changes and real coverage. Coordinate under company policy, submit follow-up evidence and inspect minimal signed-event outcomes. Paging stays OFF; human acceptance and observed recovery remain separate.',clauses:['OC-004','OC-036','OC-053'],
   messages:()=>[{role:'user',content:{type:'text',text:'Read current service/runbook/change evidence and coverage. Declare and acknowledge naming an active responder, record notes and follow-up evidence. Leave human-review work open. Review exact coverage before applying. Dispatch only an already authorized minimal event and report an authenticated receipt or uncertainty. Never page, fabricate recovery or accept a human review.'}}]}],
 })
}
export async function agentDoorResponse(request:Request,original:Bindings) {
 const env=runtimeBindings(original),path=new URL(request.url).pathname
 if(path==='/api/agent-members')return memberMapping(request,env)
 if(['/api/rer/business-settings','/rer-business-logo','/rer-business.css'].includes(path)) {
  const response=await oncallSettings(env).handle(request)
  if(response&&!response.ok&&response.headers.get('content-type')?.includes('application/json')) {
   const body=await response.json() as {error?:string}
   return Response.json({code:body.error??'settings_refused'},{status:response.status,headers:{'cache-control':'no-store'}})
  }
  return response
 }
 if(path==='/mcp'||path==='/api/rer/agent-policy'||path.startsWith('/agents')||path.startsWith('/.well-known/oauth-protected-resource'))return oncallAgentDoor(env).handle(request)
 return null
}
/** UI actions publish the same retained resource vocabulary, without agent credentials. */
export async function personChange(request:Request,response:Response,env:Bindings,input:any) {
 if(!response.ok||request.method!=='POST'||request.headers.has('authorization')||!input)return
 const path=new URL(request.url).pathname
 if(!['/api/command','/api/teams','/api/teams/ownership','/api/schedule-coordination','/api/paging/schedules'].includes(path)&&!/^\/api\/schedules\/[^/]+\/(?:apply|overrides)$/.test(path)&&!path.startsWith('/api/automation/'))return
 const session=await nativeSession(env,request)
 if(!session)return
 let output:any;try{output=await response.clone().json()}catch{return}
 if(output.changed===false)return
 const uris=new Set<string>()
 if(path==='/api/command') {
  if(input.type==='service')uris.add('oncall://services/'+output.id)
  else if(input.incident||input.type==='declare') {
   const id=input.incident??output.id
   uris.add('oncall://incidents/'+id);uris.add('oncall://incidents/'+id+'/review-material')
   if(['action','action-update','complete','accept-action'].includes(input.type)) {
    const action=input.action??(input.type==='action'?output.actions?.at(-1)?.id:undefined)
    if(action)uris.add('oncall://actions/'+action)
   }
  }
 } else if(path==='/api/teams/ownership')uris.add('oncall://services/'+output.id)
 else if(path==='/api/schedule-coordination') {if(output.record?.data.schedule)uris.add('oncall://schedules/'+output.record.data.schedule+'/coverage')}
 else if(path==='/api/paging/schedules'||path.startsWith('/api/schedules/'))uris.add('oncall://schedules/'+(path==='/api/paging/schedules'?output.id:path.split('/')[3])+'/coverage')
 else {
  for(const id of output.services??[])uris.add('oncall://services/'+id)
  if(path==='/api/teams') {
   const {loadWorkspace}=await import('../workspace-store')
   for(const service of (await loadWorkspace(env.DB)).services.filter(s=>s.team===output.id))uris.add('oncall://services/'+service.id)
  }
  if(path==='/api/automation/dispatch'&&output.id)uris.add('oncall://automation/outbox/'+output.id)
 }
 const person=await oncallPeople(env).person(session.member.id)
 // Use the origin admitted by the native HTTP door, including legacy native
 // password installations. Agent admission still uses its configured origin.
 const address=new URL(request.url)
 if(person?.active&&uris.size) {
  if(!admitted(request,env.AUTH_ORIGIN))throw Error('Native event origin is unavailable')
  const door=oncallAgentDoor({...env,AUTH_ORIGIN:address.origin})
  for(const uri of uris)if(!uri.includes('undefined'))await door.emit({type:'native.updated',uri,person,data:{revision:output.revision??output.schedule?.revision}})
 }
}
