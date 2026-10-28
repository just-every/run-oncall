import {randomBytes} from 'node:crypto'
export default async function initialize({request,origin,email,displayName,token,claim,returnTo,fixtures}) {
 const response=await request(new URL(claim.path,origin).href,{method:'POST',redirect:'manual',headers:{origin,'content-type':'application/json'},body:JSON.stringify({token:claim.token,displayName,returnTo})})
 if(response.status!==303)throw Error('Native owner claim failed: HTTP '+response.status)
 const cookie=response.headers.getSetCookie().map(v=>v.split(';')[0]).join('; ')
 async function call(path,body) {
  const r=await request(new URL(path,origin).href,{method:body===undefined?'GET':'POST',headers:{origin,cookie,'content-type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})})
  if(!r.ok)throw Error('Native owner fixture '+path+' failed: HTTP '+r.status)
  return r.json()
 }
 const workspace=await call('/api/workspace')
 if(!workspace.member)throw Error('Native owner did not acquire a domain member binding')
 const owner=workspace.member.id
 const finished=await request(new URL('/setup',origin).href,{method:'POST',redirect:'manual',headers:{origin,cookie,'content-type':'application/x-www-form-urlencoded'},body:'confirm=yes'})
 if(finished.status!==303)throw Error('Native owner setup confirmation failed: HTTP '+finished.status)
 await call('/api/command',{type:'service',id:'agent-service',name:'Payments API',environment:'production',owner,runbook:['Inspect independent source evidence','Coordinate through the existing pager','Record what is known and uncertain'],pager:'',dependencies:[]})
 await call('/api/command',{type:'service',id:'agent-foreign',name:'Search API',environment:'production',owner,runbook:[],pager:''})
 const password='synthetic-agent-workspace-password'
 await call('/api/members',{name:'Mara Chen',role:'responder',password})
 await call('/api/members',{name:'Elliot Reid',role:'viewer',password})
 await call('/api/members',{name:'Avery Grant',role:'admin',password})
 const schedule=await call('/api/paging/schedules',{id:'agent-page-coverage',name:'Existing pager coordination',service:'agent-service',revision:0,timezone:'UTC',validFrom:'2026-01-01T00:00:00.000Z',validUntil:null,
  primary:{anchorLocal:'2026-01-01T00:00',periodDays:1,members:[owner],ambiguity:'earlier'},backup:{anchorLocal:'2026-01-01T00:00',periodDays:1,members:[],ambiguity:'earlier'},overrides:[]})
 await call('/api/paging/policies',{service:'agent-service',scheduleId:schedule.id,revision:0,primaryWaitSeconds:180,backupWaitSeconds:300,retrySeconds:10,maxAttempts:3})
 const receiverKey=randomBytes(32).toString('hex')
 const receiver=await call('/api/automation/clients',{name:'Approved receiver',key:randomBytes(32).toString('hex'),services:['agent-service'],permissions:['incidents:read']})
 await call('/api/automation/clients',{name:'Retiring client',key:randomBytes(32).toString('hex'),services:['agent-service'],permissions:['incidents:read']})
 await call('/api/automation/endpoints',{name:'Approved minimal response receiver',key:receiverKey,client:receiver.id,services:['agent-service'],url:'https://8.8.8.8/events',approve:true})
 await call('/api/automation/endpoints',{name:'Retiring recipient',key:receiverKey,client:receiver.id,services:['agent-service'],url:'https://8.8.8.8/retiring',approve:true})
 const erasureClient=await call('/api/automation/clients',{name:'Disposable credential-erasure receiver',key:randomBytes(32).toString('hex'),services:['agent-service'],permissions:['incidents:read']})
 await call('/api/automation/endpoints',{name:'Disposable credential-erasure recipient',key:randomBytes(32).toString('hex'),client:erasureClient.id,services:['agent-service'],url:'https://8.8.8.8/erasure',approve:true})
 await fixtures?.set('https://8.8.8.8',{key:receiverKey})
 return response
}
