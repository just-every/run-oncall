import { deliver } from './delivery'
import { fail, text, type Member } from './family/response-operations/domain'
import { coverage, preview, validateSchedule } from './family/response-operations/schedules'
import { acknowledge, cancel, replay, validatePolicy, type EscalationJob } from './family/response-operations/escalation'
import { validatePagingArchive, preparePagingImport } from './family/response-operations/paging-archive'
import { pagingSnapshot, commitPaging, putSchedule, putPolicy, putJob, replaceArchive, type PagingSnapshot } from './paging-store'

function exact(v:any,keys:string[]) {
  if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).some(k=>!keys.includes(k))) fail('Invalid or unknown scheduling request fields')
  return v
}
function clock(at:any) {
  if(!Number.isSafeInteger(at)||at<Date.UTC(2000,0,1)||at>=Date.UTC(2101,0,1)) fail('Evaluation clock must be epoch milliseconds from 2000 through 2100')
  return at as number
}
function actor(s:PagingSnapshot,id:string,admin=false):Member {
  const m=s.workspace.members.find(m=>m.id===id&&m.active)
  if(!m) fail('Access revoked',401)
  if(admin&&m.role!=='admin') fail('Current admin required',403)
  return m
}
function editable(m:Member) { if(m.role==='viewer') fail('Responder required',403) }
function knownJob(s:PagingSnapshot,id:string) {const j=s.archive.jobs.find(j=>j.id===id);if(!j) fail('Unknown escalation',404);return j}
function revision(j:EscalationJob,input:any) {if(!Number.isSafeInteger(input.revision)||j.revision!==input.revision) fail('Escalation changed; reload and retry',409)}
function replace<T>(list:T[],value:T,key:(v:T)=>string) {return [...list.filter(v=>key(v)!==key(value)),value]}
export function installPaging(api:any,body:(c:any,max?:number)=>Promise<any>) {
  function authority(c:any) {return {digest:c.get('sessionDigest'),member:c.get('actor').id}}
  async function context(c:any,admin=false) {const s=await pagingSnapshot(c.env.DB);const m=actor(s,c.get('actor').id,admin);return {s,m}}
  api.get('/api/paging/state',async(c:any)=>{const {s}=await context(c);return c.json({revision:s.revision,workspaceRevision:s.workspace.revision,paging:'OFF',...s.archive})})
  api.post('/api/paging/schedules',async(c:any)=>{
    const {s}=await context(c,true),v=await body(c)
    const old=s.archive.schedules.find(x=>x.id===v?.id)
    if(!v||typeof v!=='object'||Array.isArray(v)||!Number.isSafeInteger(v.revision)||v.revision<0) fail('Invalid schedule revision')
    if(v.revision!==(old?.revision??0)) fail('Schedule changed; reload and retry',409)
    if(old&&v.service!==old.service) fail('Schedule service identity is immutable; create a new schedule')
    const schedule=validateSchedule({...v,revision:v.revision+1},s.workspace)
    const next={...s.archive,schedules:replace(s.archive.schedules,schedule,x=>x.id)}
    await commitPaging(c.env.DB,s,next,token=>[putSchedule(c.env.DB,schedule,token)],authority(c))
    return c.json(schedule)
  })
  api.post('/api/paging/policies',async(c:any)=>{
    const {s}=await context(c,true),v=await body(c),old=s.archive.policies.find(x=>x.service===v?.service)
    if(!v||typeof v!=='object'||Array.isArray(v)||!Number.isSafeInteger(v.revision)||v.revision<0) fail('Invalid escalation policy revision')
    if(v.revision!==(old?.revision??0)) fail('Escalation policy changed; reload and retry',409)
    const schedule=s.archive.schedules.find(x=>x.id===v.scheduleId)
    if(!schedule||schedule.service!==v.service) fail('Policy schedule/service mapping invalid')
    const policy=validatePolicy({...v,revision:v.revision+1},schedule)
    const next={...s.archive,policies:replace(s.archive.policies,policy,x=>x.service)}
    await commitPaging(c.env.DB,s,next,token=>[putPolicy(c.env.DB,policy,token)],authority(c))
    return c.json(policy)
  })
  api.post('/api/paging/preview',async(c:any)=>{
    const {s}=await context(c),v=exact(await body(c),['scheduleId','from','to'])
    const schedule=s.archive.schedules.find(x=>x.id===v.scheduleId);if(!schedule) fail('Unknown schedule',404)
    return c.json(preview(schedule,s.workspace.members,clock(v.from),clock(v.to)))
  })
  api.post('/api/paging/jobs',()=>deliver())
  api.post('/api/paging/tick',()=>deliver())
  for(const action of ['ack','cancel'] as const) api.post(`/api/paging/jobs/:id/${action}`,async(c:any)=>{
    const {s,m}=await context(c),v=exact(await body(c),action==='cancel'?['revision','at','reason']:['revision','at'])
    editable(m);const old=knownJob(s,c.req.param('id'));revision(old,v);const at=clock(v.at)
    const job=action==='ack'?acknowledge(old,m,at):cancel(old,m,text(v.reason,'Cancellation reason',2000),at)
    const next={...s.archive,jobs:replace(s.archive.jobs,job,j=>j.id)}
    await commitPaging(c.env.DB,s,next,token=>[putJob(c.env.DB,job,token)],authority(c))
    return c.json(job)
  })
  api.get('/api/paging/jobs/:id/replay',async(c:any)=>{const {s}=await context(c);return c.json(replay(knownJob(s,c.req.param('id'))))})
  api.post('/api/paging/callbacks',()=>deliver())
  api.post('/api/paging/jobs/:id/resume',()=>deliver())
  api.get('/api/paging/archive',async(c:any)=>{const {s}=await context(c,true);return c.json(validatePagingArchive(s.archive))})
  api.post('/api/paging/restore',async(c:any)=>{
    // Compact archive capacity is 4 MiB; its fixed replacement envelope is
    // transport overhead, not stored application data.
    const {s}=await context(c,true),v=exact(await body(c,4*1024*1024+64),['mode','archive'])
    if(v.mode!=='replace') fail('Explicit module replacement required')
    const archive=validatePagingArchive(v.archive,s.workspace)
    const imported=preparePagingImport(archive,Date.now())
    await commitPaging(c.env.DB,s,imported,token=>replaceArchive(c.env.DB,imported,token),authority(c))
    return c.json(imported)
  })
}
