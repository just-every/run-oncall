import { reviewSchedule } from './schedule-coverage/review'
import { pagingSnapshot, commitPaging, putSchedule } from './paging-store'
import { coverage, validateSchedule } from './family/response-operations/schedules'
import { fail } from './family/response-operations/domain'
import { calendar } from './calendar'
import { demoEffect } from './modules/demo/index.mjs'
import { sendDemoPage } from './demo-paging'
import { deliver } from './delivery'

function clock(value:string|undefined) {
 const at=value===undefined?Date.now():Date.parse(value)
 if(!Number.isSafeInteger(at)) fail('Use an ISO timestamp')
 return at
}
export function installSchedules(api:any,body:(c:any)=>Promise<any>) {
 api.post('/api/delivery',async(c:any)=>c.json(await demoEffect(deliver,()=>sendDemoPage(c,body))))
 api.get('/api/schedules/:id/now-next',async(c:any)=>{
  const s=await pagingSnapshot(c.env.DB),schedule=s.archive.schedules.find(v=>v.id===c.req.param('id'))
  if(!schedule) fail('Unknown schedule',404)
  const at=clock(c.req.query('at')),now=coverage(schedule,s.workspace.members,at)
  const next=Object.fromEntries(now.windows.map(w=>[w.role,w.end?coverage(schedule,s.workspace.members,Date.parse(w.end)):null]))
  return c.json({paging:'OFF',now,next})
 })
 api.get('/api/schedules/:id/calendar.ics',async(c:any)=>{
  const s=await pagingSnapshot(c.env.DB),schedule=s.archive.schedules.find(v=>v.id===c.req.param('id'))
  if(!schedule) fail('Unknown schedule',404)
  const from=clock(c.req.query('from')),to=c.req.query('to')?clock(c.req.query('to')):from+7*86400000
  return new Response(calendar(schedule,s.workspace.members,from,to),{headers:{'Content-Type':'text/calendar; charset=utf-8','Cache-Control':'private, no-store','Content-Disposition':'inline; filename="oncall.ics"'}})
 })
 for(const action of ['review','apply'] as const) api.post(`/api/schedules/:id/${action}`,async(c:any)=>{
  const s=await pagingSnapshot(c.env.DB),actor=s.workspace.members.find(m=>m.id===c.get('actor').id&&m.active)
  if(actor?.role!=='admin')fail('Current admin required',403)
  const old=s.archive.schedules.find(v=>v.id===c.req.param('id'));if(!old)fail('Unknown schedule',404)
  const input=await body(c)
  const allowed=action==='review'?['schedule','from','to']:['schedule','from','to','digest','confirmed']
  if(!input||Object.keys(input).some(k=>!allowed.includes(k)))fail('Unknown schedule review fields')
  const review=await reviewSchedule(old,input.schedule,s.workspace,input.from,input.to)
  if(action==='review')return c.json(review)
  if(input.confirmed!==true||typeof input.digest!=='string'||input.digest!==review.digest)fail('Review changed or confirmation missing; review again',409)
  const archive={...s.archive,schedules:s.archive.schedules.map(v=>v.id===old.id?review.schedule:v)}
  await commitPaging(c.env.DB,s,archive,token=>[putSchedule(c.env.DB,review.schedule,token)],{digest:c.get('sessionDigest'),member:actor.id})
  return c.json({schedule:review.schedule,coverage:review.coverage})
 })
 api.post('/api/schedules/:id/overrides',async(c:any)=>{
  const s=await pagingSnapshot(c.env.DB),actor=s.workspace.members.find(m=>m.id===c.get('actor').id&&m.active)
  if(actor?.role!=='admin') fail('Current admin required',403)
  const old=s.archive.schedules.find(v=>v.id===c.req.param('id'));if(!old)fail('Unknown schedule',404)
  const input=await body(c);if(input.revision!==old.revision)fail('Schedule changed; reload',409)
  const schedule=validateSchedule({...old,revision:old.revision+1,overrides:[...old.overrides,input.override]},s.workspace)
  const archive={...s.archive,schedules:s.archive.schedules.map(v=>v.id===schedule.id?schedule:v)}
  await commitPaging(c.env.DB,s,archive,token=>[putSchedule(c.env.DB,schedule,token)],{digest:c.get('sessionDigest'),member:actor.id})
  return c.json(schedule)
 })
}
