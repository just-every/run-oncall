import {oncallAgentDoor} from './index'
import {localCredentials,oncallPeople} from './people'
import {changeHash} from '../changes/credentials'
import {fail} from '../family/response-operations/domain'
import type {Client} from '../automation/model'
import type {Bindings} from '../auth.server'
export async function compatibilityRead(c:any,family:string,incidentId?:string) {
 const client=c.get('apiClient') as Client
 const credential=await localCredentials(c.env,c.req.raw),person=credential?await oncallPeople(c.env).person(credential.sponsor.id):null
 if(!credential||!person?.active)fail('Invalid or revoked token',401)
 const id=c.req.param('id')
 const args=family==='actions'&&id?{id,incident:incidentId}:['services','incidents','schedules'].includes(family)&&id?{id}:{}
 const verb=family==='integrations'||family==='analytics'?'read':id?'read':'list'
 const answer=await oncallAgentDoor(c.env).invoke('oncall.'+family+'.'+verb,args,{...credential,person})
 if(answer.outcome!=='done')return compatibilityRefusal(c,answer)
 return null
}
function compatibilityRefusal(c:any,answer:any) {
 const status=answer.outcome==='pending'?202:['policy_unset','agents_paused','policy_unavailable','revision_conflict','idempotency_conflict','call_in_progress','review_changed'].includes(answer.code)?409:answer.code==='not_found'?404:answer.code==='unauthenticated'?401:answer.code==='invalid_arguments'?400:answer.code==='capacity_exhausted'?429:['execution_failed','output_invalid'].includes(answer.code)?503:403
 return c.json({code:answer.code??'approval_required',...(answer.approval?{approval:answer.approval}:{}),decision:answer.decision},status)
}
export async function compatibilityMutation(c:any,family:string,input:any,key:string) {
 const env=c.env as Bindings,client=c.get('apiClient') as Client
 const credential=await localCredentials(env,c.req.raw),person=credential?await oncallPeople(env).person(credential.sponsor.id):null
 if(!credential||!person?.active)fail('Invalid or revoked token',401)
 const {loadWorkspace}=await import('../workspace-store')
 const state=await loadWorkspace(env.DB),incident=state.incidents.find(i=>i.id===input.incident)
 const service=family==='services'?input.id:['declare','manual-page'].includes(input.type)?input.service:family==='schedules'?input.service:incident?.service
 if(!client.services.includes(service)||!state.services.some(s=>s.id===service))fail('Record not found in this client scope',404)
 if(input.dependencies?.some((id:string)=>!client.services.includes(id)))fail('Cross-service reference refused',404)
 const request=await changeHash(JSON.stringify([family,input])),keyHash=await changeHash(key)
 const retained=state.apiOperations?.find(o=>o.client===client.id&&o.key===keyHash)
 if(retained&&retained.request!==request)fail('Idempotency key already names different input',409)
 const doorKey=key+'-credential-'+client.revision
 const existing=await env.DB.prepare('SELECT id,request_hash,tool,args FROM oc_agent_transport WHERE client=? AND key_hash=?').bind(client.id,keyHash).first<{id:string;request_hash:string;tool:string|null;args:string}>()
 if(existing&&existing.request_hash!==request)fail('Idempotency key already names different input',409)
 if(existing?.tool) {
  const saved=JSON.parse(existing.args),args={...saved,idempotency_key:doorKey}
  if(retained&&saved.idempotency_key!==doorKey)delete args.expected_revision
  const answer=await oncallAgentDoor(env).invoke(existing.tool,args,{...credential,person})
  if(answer.outcome!=='done')return compatibilityRefusal(c,answer)
  const operation=(answer.result as {data:any}).data.operation
  if(!operation)fail('Native operation receipt unavailable; do not repeat with a new key',503)
  return c.json(operation,200)
 }
 if(family==='services'&&!retained) {
  const current=state.services.find(s=>s.id===service)!
  if(input.etag!==await changeHash(JSON.stringify({...current,dependencies:(current.dependencies??[]).filter(id=>client.services.includes(id))})))fail('Service changed; supply its current etag',409)
 }
 const operationId=existing?.id??retained?.id??crypto.randomUUID()
 let tool='',args:Record<string,any>={}
 if(family==='services'&&input.type==='service'){
  tool='services.update';args={...input}
  if(input.field!==undefined) {
   const current=state.services.find(s=>s.id===service)!
   if(!['name','owner','runbook','pager','team'].includes(input.field)||!retained&&JSON.stringify((current as any)[input.field]??null)!==JSON.stringify(input.from))fail('This value changed; reload before editing',409)
   if(input.field==='team'){tool='services.ownership';args={id:current.id,team:input.to}}
   else args={...current,[input.field]:input.to}
  }
 }
 if(family==='incidents') {
  const mapping:Record<string,string>={'declare':'declare','manual-page':'page','snooze':'snooze','cancel-deadline':'cancel','reassign':'reassign','assign-role':'role'}
  if(mapping[input.type]){tool='incidents.'+mapping[input.type];args={...input,id:input.incident}}
  if(input.type==='transition') {
   tool='incidents.'+(input.state==='acknowledged'?'acknowledge':input.state==='resolved'?'resolve':'update')
   args={id:input.incident,...input,field:'state',value:input.state}
  }
 }
 if(family==='actions'&&['action','complete'].includes(input.type)){tool='actions.'+(input.type==='action'?'create':'submit');args={...input,id:input.action}}
 if(family==='schedules') {
  const {pagingSnapshot}=await import('../paging-store'),old=(await pagingSnapshot(env.DB)).archive.schedules.find(s=>s.id===input.id)
  if(old&&(!client.services.includes(old.service)||old.service!==service))fail('Record not found in this client scope',404)
  // The retained API already uses an exact saved schedule revision. The native
  // coverage review is computed here, then checked again inside the typed tool.
  if(retained) {
   if(input.revision===0){tool='schedules.create';args={schedule:input}}
   else {const from=Date.parse(retained.at);tool='schedules.update';args={id:input.id,schedule:input,from,to:from+7*86400000,digest:request}}
  } else if(old) {
   const {reviewSchedule}=await import('../schedule-coverage/review'),from=Date.now(),to=from+7*86400000
   const review=await reviewSchedule(old,input,state,from,to)
   tool='schedules.update';args={id:old.id,schedule:input,from,to,digest:review.digest}
  } else {tool='schedules.create';args={schedule:input}}
 }
 if(!tool)fail('Action is not available in this API family',403)
 args={...args,operation_id:operationId,idempotency_key:doorKey,...(input.revision===undefined||retained?{}:{expected_revision:input.revision})}
 if(!existing)await env.DB.prepare('INSERT INTO oc_agent_transport(id,client,key_hash,request_hash,family,service,args,tool) VALUES(?,?,?,?,?,?,?,?)')
  .bind(operationId,client.id,keyHash,request,family,service,JSON.stringify(args),'oncall.'+tool).run()
 else {
  // Preserve exact preview time/digest and body on a retry.
  const saved=await env.DB.prepare('SELECT args FROM oc_agent_transport WHERE id=?').bind(operationId).first<{args:string}>()
  args=JSON.parse(saved!.args)
  if(retained&&args.idempotency_key!==doorKey)delete args.expected_revision
  args.idempotency_key=doorKey
  await env.DB.prepare('UPDATE oc_agent_transport SET tool=? WHERE id=? AND tool IS NULL AND request_hash=?').bind('oncall.'+tool,operationId,request).run()
 }
 const answer=await oncallAgentDoor(env).invoke('oncall.'+tool,args,{...credential,person})
 if(answer.outcome!=='done')return compatibilityRefusal(c,answer)
 const data=(answer.result as {data:any}).data
 const operation=data.operation??state.apiOperations?.find(o=>o.id===operationId)
 if(!operation)fail('Native operation receipt unavailable; do not repeat with a new key',503)
 return c.json(operation,existing||retained?200:201)
}
