import assert from 'node:assert/strict'
import {randomBytes} from 'node:crypto'

// A real night rota and human transitions through the emitted HTTP doors.
export async function nightResponseScenario(w) {
 let cookie
 const req=async(path,data,as=cookie,status=200)=>{
  const result=await w.request(path,data,as);assert.equal(result.status,status,JSON.stringify(result.value));return result.value
 }
 let sourceAt='2030-10-29T02:00:00.000Z'
 const at=async value=>{sourceAt=value;await w.time(Date.parse(value))},service='synthetic-oncall-370',zone='America/New_York'
 await at('2030-10-29T02:00:00.000Z')
 const setup=await w.request('/api/setup',{name:'synthetic-oncall-370-owner',password:'synthetic-oncall-370-owner-password'});assert.equal(setup.status,200);cookie=setup.cookie
 const owner=(await req('/api/session')).member
 const responder=async name=>{
  const member=await req('/api/members',{name,role:'responder',password:'synthetic-oncall-370-password'},cookie,201)
  const login=await w.request('/api/login',{name,password:'synthetic-oncall-370-password'});assert.equal(login.status,200)
  return {...member,cookie:login.cookie}
 }
 const night=await responder('Synthetic night responder'),relief=await responder('Synthetic night relief')
 await req('/api/command',{type:'service',id:service,name:'Synthetic night response',environment:'production',owner:owner.id,runbook:[],pager:''})
 await req('/api/paging/schedules',{id:service,name:'Synthetic New York night',service,revision:0,timezone:zone,
  validFrom:'2030-10-29T02:00:00.000Z',validUntil:'2030-10-29T10:00:00.000Z',
  primary:{anchorLocal:'2030-10-28T22:00',periodDays:1,members:[night.id],ambiguity:'earlier'},
  backup:{anchorLocal:'2030-10-28T22:00',periodDays:1,members:[owner.id],ambiguity:'earlier'},
  overrides:[{id:'synthetic-oncall-370-relief',role:'primary',start:'2030-10-29T08:00:00.000Z',end:'2030-10-29T10:00:00.000Z',member:relief.id}]})
 const key=randomBytes(32).toString('hex');await req('/api/sources',{id:service,key,scopes:[service]})
 const signal=async(eventId,generation,intent='trigger')=>{
  const result=await w.request('/api/ingress/'+service,{source:service,eventId,service,environment:'production',key:service,generation,intent,severity:'warning',title:'Synthetic night backlog',observedAt:sourceAt,evidence:'https://monitor.example.test/night'},undefined,{authorization:'Bearer '+key})
  assert.equal(result.status,201);return result.value
 }
 const declare=(title,alerts=[])=>req('/api/command',{type:'declare',service,severity:'warning',title,summary:'Synthetic controlled response timeline',alerts})
 const transition=(incident,state,person=owner,evidence)=>req('/api/command',{type:'transition',incident:incident.id,revision:incident.revision,state,summary:'Synthetic human response',...(evidence?{evidence}:{})},person.cookie??cookie)
 await at('2030-10-29T02:30:00.000Z');await signal('synthetic-oncall-370-a','synthetic-oncall-370-a')
 const alert=(await req('/api/state')).alerts.find(row=>row.source===service)
 let late=await declare('Synthetic late night acknowledgement',[alert.id])
 await at('2030-10-29T02:35:00.000Z');await signal('synthetic-oncall-370-repeat','synthetic-oncall-370-a')
 await at('2030-10-29T04:05:00.000Z');late=await transition(late,'acknowledged',night)
 const acknowledgement=late.timeline.at(-1)
 await at('2030-10-29T04:10:00.000Z');late=await transition(late,'mitigating')
 await at('2030-10-29T04:20:00.000Z');late=await transition(late,'recovered',owner,'https://monitor.example.test/night-recovery')
 await at('2030-10-29T04:25:00.000Z');await signal('synthetic-oncall-370-recover','synthetic-oncall-370-a','recover')
 late=(await req('/api/state')).incidents.find(row=>row.id===late.id)
 await at('2030-10-29T04:30:00.000Z');late=await transition(late,'resolved')
 await at('2030-10-29T08:00:00.000Z');let quick=await declare('Synthetic relief acknowledgement')
 await at('2030-10-29T08:05:00.000Z');quick=await transition(quick,'acknowledged',relief)
 await at('2030-10-29T10:00:00.000Z');let outside=await declare('Synthetic acknowledgement after coverage')
 await at('2030-10-29T10:15:00.000Z');outside=await transition(outside,'acknowledged',night)
 await at('2030-10-29T10:30:00.000Z');const open=await declare('Synthetic unacknowledged night incident')
 await at('2030-10-29T10:35:00.000Z');const unknown=await declare('Synthetic resolved without acknowledgement')
 await at('2030-10-29T10:40:00.000Z');await req('/api/triage/bulk',{operationId:'synthetic-oncall-370-resolve',action:'resolve',items:[{id:unknown.id,revision:unknown.revision}],reason:'Synthetic human recovery',evidence:'https://monitor.example.test/night-repair'})
 const observed='2030-10-29T11:00:00.000Z';await at(observed)
 const query=new URLSearchParams({from:'2030-10-29T02:00:00.000Z',to:observed,service,at:observed})
 return {cookie,headers:setup.headers,service,zone,night,relief,owner,late,quick,outside,open,unknown,acknowledgement,query,observed,req}
}

export function assertNightResponse(report,s,{from='2030-10-29T02:00:00.000Z',to=s.observed,uncovered=3600}={}) {
 assert.deepEqual([report.cohort.from,report.cohort.to,report.generatedAt,report.cohort.count],[from,to,s.observed,5])
 const late=report.incidents.find(row=>row.id===s.late.id)
 assert.equal(s.late.createdAt,'2030-10-29T02:30:00.000Z');assert.equal(s.acknowledgement.at,'2030-10-29T04:05:00.000Z')
 assert.deepEqual([late.mtta.status,late.mtta.seconds,late.mtta.sourceAt,late.mtta.sourceEntryId],['measured',5700,s.acknowledgement.at,s.acknowledgement.id])
 assert.equal(late.mtta.seconds,(Date.parse(s.acknowledgement.at)-Date.parse(s.late.createdAt))/1000)
 assert.deepEqual(['total','measured','censored','unknown','mean','p50','p90','p95'].map(key=>report.aggregates.mtta[key]),[5,3,1,1,2300,900,5700,5700])
 assert.deepEqual(report.aggregates.mtta.histogram.map(row=>row.count),[0,0,1,1,1,0,0])
 assert.deepEqual([report.incidents.find(row=>row.id===s.open.id).mtta.status,report.incidents.find(row=>row.id===s.open.id).mtta.seconds],['censored',1800])
 assert.deepEqual([report.incidents.find(row=>row.id===s.unknown.id).mtta.status,report.incidents.find(row=>row.id===s.unknown.id).mtta.seconds],['unknown',null])
 assert.deepEqual([late.mttr.seconds,late.recovery.seconds,late.sourceRecovery.seconds],[7200,6600,6900])
 assert.deepEqual(report.load.schedules.map(row=>[row.id,row.timezone,row.revision]),[[s.service,s.zone,1]])
 const night=report.load.responders.find(row=>row.member===s.night.id),relief=report.load.responders.find(row=>row.member===s.relief.id)
 assert.deepEqual([report.load.from,report.load.through,report.load.acknowledged,report.load.unacknowledged],[from,s.observed,3,2])
 assert.deepEqual([night.primarySeconds,relief.primarySeconds,report.load.responders.find(row=>row.member===s.owner.id).backupSeconds],[21600,7200,28800])
 assert.deepEqual([night.acknowledgements,night.outsideCoverage,night.acknowledgementShare,night.primaryShare,night.per24PrimaryHours,night.loadToCoverage],[2,1,2/3,3/4,8,(2/3)/(3/4)])
 assert.deepEqual([relief.acknowledgements,relief.outsideCoverage,relief.acknowledgementShare,relief.primaryShare,relief.per24PrimaryHours,relief.loadToCoverage],[1,0,1/3,1/4,12,(1/3)/(1/4)])
 assert.deepEqual(report.load.services.map(row=>[row.primarySeconds,row.uncoveredPrimarySeconds,row.incidents]),[[28800,uncovered,5]])
 assert.deepEqual([report.noise.alerts,report.noise.triggers,report.noise.repeatedAlerts,report.noise.noisyKeys],[1,2,1,1])
}

export const responseCsvRows=text=>text.trim().split('\r\n').map(line=>[...line.matchAll(/"((?:[^"]|"")*)"/g)].map(match=>match[1].replaceAll('""','"')))
