import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';

// Only native HTTP creates these records and their retained operation receipts.
// Each policy phase gets its own credential, scope, records and operation keys.
export default async function prepare({phase,request,origin,cookie}) {
 const send=async(path,input,{token,status=200,headers={}}={})=>{
  const response=await request(new URL(path,origin).href,{method:input===undefined?'GET':'POST',redirect:'manual',headers:{Origin:origin,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{Cookie:cookie}),...headers},...(input===undefined?{}:{body:JSON.stringify(input)})});
  assert.equal(response.status,status,`Native phase fixture refused ${path}`);
  return {body:await response.json(),headers:response.headers};
 };
 const owner=(await send('/api/workspace')).body.member;
 const service='receipt-'+randomUUID();
 await send('/api/command',{type:'service',id:service,name:'Receipt coordination '+phase,environment:'test',owner:owner.id,runbook:[],pager:''});
 const token=randomBytes(32).toString('hex');
 const client=(await send('/api/automation/clients',{name:'Phase receipt client '+phase,key:token,services:[service],permissions:['services:read','services:write','schedules:read','schedules:write','incidents:read','incidents:write','actions:read','actions:write']},{status:201})).body;
 const clients={receipts:{token,clientId:client.id,agent:{id:'oncall-client:'+client.id,name:client.name,specialist:'oncall-responder'}}};
 if(phase==='initial')return {clients};
 const receipts={};
 const mutate=async(family,input)=>{
  const key=randomUUID();
  const response=await send('/api/v1/'+family,input,{token,status:201,headers:{'Idempotency-Key':key}});
  receipts[family]=key;
  assert.ok(response.body.id&&response.body.entity,'Native mutation must retain an operation and target');
  return response.body;
 };
 const saved=await send('/api/v1/services/'+service,undefined,{token});
 await mutate('services',{type:'service',...saved.body,name:'Retained service receipt '+phase,etag:saved.headers.get('etag')?.replaceAll('"','')});
 const anchor='2026-01-01T00:00';
 await mutate('schedules',{schedule:{id:randomUUID(),name:'Receipt coordination rota',service,revision:0,timezone:'UTC',validFrom:anchor+':00.000Z',validUntil:null,primary:{anchorLocal:anchor,periodDays:1,members:[owner.id],ambiguity:'earlier'},backup:{anchorLocal:anchor,periodDays:1,members:[],ambiguity:'earlier'},overrides:[]}});
 const declared=await mutate('incidents',{type:'declare',service,title:'Receipt custody '+phase,summary:'Internal coordination; paging remains OFF',severity:'warning'});
 const incident=(await send('/api/v1/incidents/'+declared.entity,undefined,{token})).body;
 await mutate('actions',{type:'action',incident:incident.id,revision:incident.revision,title:'Review retained phase receipt',owner:owner.id,due:'2026-12-01',priority:'P1',completionPolicy:'human-review'});
 return {values:{receipts},clients};
}
