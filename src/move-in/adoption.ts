import {scheduleChanges} from '../schedule-coordination/model'
import {workspaceRows,checkWorkspaceSize} from '../workspace-store'
import { fail } from '../family/response-operations/domain'
import {validatePolicy,policyServices} from '../family/response-operations/escalation'
import { validateSchedule,sharedServices } from '../family/response-operations/schedules'
import { pagingSnapshot, bound, putSchedule,putPolicy } from '../paging-store'

const completed = `EXISTS(SELECT 1 FROM ik_provenance p JOIN ik_jobs j ON j.id=p.job_id WHERE p.destination='oncall' AND p.target_kind='schedule' AND p.target_id=? AND p.reversed=0 AND j.state='completed')`

/** Adoption is an explicit native edit. Import undo must preserve it, including after restart. */
export function installAdoption(api:any,body:(c:any)=>Promise<any>) {
 async function snapshot(c:any) {
  const s=await pagingSnapshot(c.env.DB)
  const actor=s.workspace.members.find(m=>m.id===c.get('actor').id&&m.active)
  if(actor?.role!=='admin')fail('Current admin required',403)
  return s
 }
 api.get('/api/move-in/adoption',async(c:any)=>{
  const s=await snapshot(c)
  return c.json({services:s.workspace.services,members:s.workspace.members.filter(m=>m.active&&['admin','responder'].includes(m.role)),paging:'OFF'})
 })
 api.post('/api/move-in/adopt',async(c:any)=>{
  const s=await snapshot(c),input=await body(c),db=c.env.DB as D1Database
  if(!input||input.confirm!==true)fail('Review the service and every person mapping, then confirm schedule adoption',409)
  if(typeof input.id!=='string'||typeof input.revision!=='string'||typeof input.service!=='string'||!input.members||typeof input.members!=='object'||Array.isArray(input.members))fail('Supply the imported schedule revision, service and person mappings')
  const row=await db.prepare("SELECT revision,data FROM move_in_objects WHERE kind='schedule' AND id=?").bind(input.id).first<{revision:string;data:string}>()
  if(!row)fail('Unknown imported schedule',404)
  const value=JSON.parse(row.data)
  if(row.revision!==input.revision)fail('Imported schedule changed; reload and review again',409)
  if(value.adopted)fail('This schedule has already been adopted; edit it under Schedules',409)
  if(s.archive.schedules.some(v=>v.id===input.id))fail('A live schedule already uses this ID; keep or rename that schedule before adopting',409)
  const services=input.services===undefined?[input.service]:sharedServices(input.services,input.service)
  const source=validateSchedule(value.schedule)
  const people=[...new Set([...source.primary.members,...source.backup.members,...source.overrides.flatMap(o=>o.member===null?[]:[o.member])])]
  const imported=await db.prepare("SELECT id FROM move_in_objects WHERE kind='user'").all<{id:string}>()
  if(people.some(person=>!imported.results.some(user=>user.id===person)))fail('This schedule contains erased or missing person slots; keep it paused and create a new schedule with explicit gaps')
  const keys=Object.keys(input.members)
  if(keys.length!==people.length||keys.some(key=>!people.includes(key)))fail('Map every imported person exactly once; erased slots cannot be adopted')
  const mapped=people.map(person=>input.members[person])
  if(mapped.some(id=>typeof id!=='string'||!s.workspace.members.some(m=>m.id===id&&m.active&&['admin','responder'].includes(m.role))))fail('Every person must map to a current active responder or administrator; create missing members under Team first')
  if(new Set(mapped).size!==mapped.length)fail('Different imported people must map to different workspace members')
  const member=(id:string)=>input.members[id] as string
  const schedule=validateSchedule({...source,service:input.service,...(services.length>1?{services}:{}),revision:1,primary:{...source.primary,members:source.primary.members.map(member)},backup:{...source.backup,members:source.backup.members.map(member)},overrides:source.overrides.map(o=>({...o,member:o.member===null?null:member(o.member)}))},s.workspace)
  let policyRow:{revision:string;data:string}|null=null,policy:ReturnType<typeof validatePolicy>|undefined;
  if(input.policy!==undefined){
   if(typeof input.policy?.id!=='string'||typeof input.policy?.revision!=='string')fail('Supply the reviewed imported policy revision')
   policyRow=await db.prepare("SELECT revision,data FROM move_in_objects WHERE kind='policy' AND id=?").bind(input.policy.id).first<{revision:string;data:string}>()
   if(!policyRow||policyRow.revision!==input.policy.revision)fail('Imported policy changed; review again',409)
   const saved=JSON.parse(policyRow.data)
   if(saved.adopted)fail('This policy already has a native identity',409)
   if(!Array.isArray(saved.steps)||!saved.steps.length||saved.steps.length>2||saved.steps.some((step:any)=>step.scheduleId!==schedule.id))fail('This policy needs different rotas; keep it paused and review each target explicitly',409)
   if(services.some(service=>s.archive.policies.some(p=>policyServices(p).includes(service))))fail('A selected service already references a policy',409)
   policy=validatePolicy({id:input.policy.id,service:input.service,...(services.length>1?{services}:{}),scheduleId:schedule.id,revision:1,primaryWaitSeconds:saved.steps[0].delayMinutes*60,backupWaitSeconds:(saved.steps[1]?.delayMinutes??saved.steps[0].delayMinutes)*60,retrySeconds:10,maxAttempts:1,secondStep:saved.steps.length===1?'none':'primary'},schedule)
  }
  bound({...s.archive,schedules:[...s.archive.schedules,schedule],policies:[...s.archive.policies,...(policy?[policy]:[])]})
  scheduleChanges(s.workspace,[],[schedule],c.get('actor').id)
  checkWorkspaceSize(s.workspace)
  const token=crypto.randomUUID(),at=Date.now()
  const next={...value,adopted:{scheduleId:schedule.id,service:schedule.service,services,at:new Date(at).toISOString()}}
  // One batch publishes both the native schedule and the import edit marker. Concurrent undo,
  // erasure, member revocation, another adoption or schedule edits invalidate this whole write.
  const result=await db.batch([
   db.prepare(`UPDATE paging_control SET revision=revision+1,write_token=? WHERE id=1 AND revision=? AND EXISTS(SELECT 1 FROM workspace_control WHERE id=1 AND revision=?) AND EXISTS(SELECT 1 FROM oc_current_sessions s JOIN oc_members m ON m.id=s.member WHERE s.token=? AND s.member=? AND s.expires>? AND json_extract(m.data,'$.active')=1 AND json_extract(m.data,'$.role')='admin') AND EXISTS(SELECT 1 FROM move_in_objects WHERE kind='schedule' AND id=? AND revision=? AND data=?) AND NOT EXISTS(SELECT 1 FROM paging_schedules WHERE id=?) AND ${completed} ${policyRow?"AND EXISTS(SELECT 1 FROM move_in_objects WHERE kind='policy' AND id=? AND revision=? AND data=?) AND EXISTS(SELECT 1 FROM ik_provenance p JOIN ik_jobs j ON j.id=p.job_id WHERE p.target_kind='policy' AND p.target_id=? AND p.reversed=0 AND j.state='completed')":''}`)
    .bind(token,s.revision,s.workspace.revision,c.get('sessionDigest'),c.get('actor').id,at,input.id,row.revision,row.data,schedule.id,input.id,...(policyRow?[input.policy.id,policyRow.revision,policyRow.data,input.policy.id]:[])),
   putSchedule(db,schedule,token),
   ...(policy?[putPolicy(db,policy,token),db.prepare("UPDATE move_in_objects SET revision=?,data=? WHERE kind='policy' AND id=? AND EXISTS(SELECT 1 FROM paging_control WHERE id=1 AND write_token=?)").bind(`adopted-${token}`,JSON.stringify({...JSON.parse(policyRow!.data),adopted:{policyId:policy.id,services,scheduleId:schedule.id,at:new Date(at).toISOString()}}),input.policy.id,token)]:[]),
   db.prepare('UPDATE workspace_control SET revision=revision+1,write_token=? WHERE id=1 AND EXISTS(SELECT 1 FROM paging_control WHERE id=1 AND write_token=?)').bind(token,token),
   ...workspaceRows(db,s.workspace,token),
   db.prepare("UPDATE move_in_objects SET revision=?,data=? WHERE kind='schedule' AND id=? AND EXISTS(SELECT 1 FROM paging_control WHERE id=1 AND write_token=?)").bind(`adopted-${token}`,JSON.stringify(next),input.id,token),
  ])
  if(result[0].meta.changes!==1)fail('Import, membership or scheduling state changed, or the import is incomplete; finish importing, reload and review again',409)
  return c.json({schedule,...(policy?{policy}:{}),paging:'OFF',undo:'NATIVE_EDIT_CONFLICT'},201)
 })
}
