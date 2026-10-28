import {parsePTO} from './schedule-coverage/pto-ics'
import {requireTeamCoverage} from './teams/model';
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
 for(const action of ['pto-review','pto-apply'] as const) api.post(`/api/schedules/:id/${action}`,async(c:any)=>{
  const s=await pagingSnapshot(c.env.DB),actor=s.workspace.members.find(m=>m.id===c.get('actor').id&&m.active)
  const old=s.archive.schedules.find(v=>v.id===c.req.param('id'));if(!old)fail('Unknown schedule',404)
  if(!actor)fail('Access revoked',401)
  requireTeamCoverage(s.workspace,actor,old.service)
  const input=await body(c)
  const allowed=['revision','member','content','entries','from','to',...(action==='pto-apply'?['digest','confirmed']:[])]
  if(!input||Object.keys(input).some(k=>!allowed.includes(k))||Object.hasOwn(input,'entries')===Object.hasOwn(input,'content'))fail('Choose PTO entries or an ICS upload')
  if(input.revision!==old.revision)fail('Schedule changed; review again',409)
  if(actor.role!=='admin'&&input.member!==actor.id)fail('Only an administrator can record another member’s PTO',403)
  if(!s.workspace.members.some(m=>m.id===input.member&&m.active&&['admin','responder'].includes(m.role)))fail('Choose an active responder')
  const result=Object.hasOwn(input,'content')?await parsePTO(input.content,input.member,old.timezone,old.pto??[]):{entries:input.entries,refused:[]}
  if(!Array.isArray(result.entries)||!result.entries.length)fail('No valid PTO entries to review'+(result.refused.length?': line '+result.refused[0].line+' '+result.refused[0].reason:''))
  if(result.entries.some((e:any)=>e.member!==input.member))fail('All PTO entries must belong to the chosen person')
  const review=await reviewSchedule(old,{...old,pto:[...(old.pto??[]),...result.entries]},s.workspace,input.from,input.to)
  if(action==='pto-review')return c.json({...review,import:result})
  if(input.confirmed!==true||input.digest!==review.digest)fail('Review changed or confirmation missing; review again',409)
  const archive={...s.archive,schedules:s.archive.schedules.map(v=>v.id===old.id?review.schedule:v)}
  await commitPaging(c.env.DB,s,archive,token=>[putSchedule(c.env.DB,review.schedule,token)],{digest:c.get('sessionDigest'),member:actor.id},{scheduleChange:true})
  return c.json({schedule:review.schedule,coverage:review.coverage,import:result})
 })
 for(const action of ['review','apply'] as const) api.post(`/api/schedules/:id/${action}`,async(c:any)=>{
  const s=await pagingSnapshot(c.env.DB),actor=s.workspace.members.find(m=>m.id===c.get('actor').id&&m.active)
  const old=s.archive.schedules.find(v=>v.id===c.req.param('id'));if(!old)fail('Unknown schedule',404)
  if(!actor)fail('Access revoked',401)
  requireTeamCoverage(s.workspace,actor,old.service)
  const input=await body(c)
  const allowed=action==='review'?['schedule','from','to']:['schedule','from','to','digest','confirmed']
  if(!input||Object.keys(input).some(k=>!allowed.includes(k)))fail('Unknown schedule review fields')
  if(actor.role!=='admin'&&JSON.stringify(input.schedule?.companyDates)!==JSON.stringify(old.companyDates))fail('Only an administrator can author company dates',403)
  if(actor.role!=='admin'&&input.schedule?.pto?.some((entry:any)=>!old.pto?.some(prior=>prior.id===entry.id)&&entry.member!==actor.id))fail('Only an administrator can record another member’s PTO',403)
  const review=await reviewSchedule(old,input.schedule,s.workspace,input.from,input.to)
  if(action==='review')return c.json(review)
  if(input.confirmed!==true||typeof input.digest!=='string'||input.digest!==review.digest)fail('Review changed or confirmation missing; review again',409)
  const archive={...s.archive,schedules:s.archive.schedules.map(v=>v.id===old.id?review.schedule:v)}
  await commitPaging(c.env.DB,s,archive,token=>[putSchedule(c.env.DB,review.schedule,token)],{digest:c.get('sessionDigest'),member:actor.id},{scheduleChange:true})
  return c.json({schedule:review.schedule,coverage:review.coverage})
 })
 api.post('/api/schedules/:id/overrides',async(c:any)=>{
  const s=await pagingSnapshot(c.env.DB),actor=s.workspace.members.find(m=>m.id===c.get('actor').id&&m.active)
  const old=s.archive.schedules.find(v=>v.id===c.req.param('id'));if(!old)fail('Unknown schedule',404)
  if(!actor)fail('Access revoked',401)
  requireTeamCoverage(s.workspace,actor,old.service)
  const input=await body(c);if(input.revision!==old.revision)fail('Schedule changed; reload',409)
  const schedule=validateSchedule({...old,revision:old.revision+1,overrides:[...old.overrides,input.override]},s.workspace)
  const archive={...s.archive,schedules:s.archive.schedules.map(v=>v.id===schedule.id?schedule:v)}
  await commitPaging(c.env.DB,s,archive,token=>[putSchedule(c.env.DB,schedule,token)],{digest:c.get('sessionDigest'),member:actor.id},{scheduleChange:true})
  return c.json(schedule)
 })
}
