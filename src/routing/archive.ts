import { fail, type State } from '../family/response-operations/domain.ts';
import type { IntakeReceipt, IntakeSource } from '../intake/model.ts';
import { exact, routingDate, routingRules, routingScope } from './definition.ts';
import { evaluateRouting } from './engine.ts';
import { validateRoutingInput } from './input.ts';

export function validateRoutingSource(state:State,source:IntakeSource) {
  if(source.routing===undefined)return;
  if(!source.routing)fail('Invalid routed key definition');
  const routing=source.routing;exact(routing,['scope','owner','versions']);routingScope(state,routing.scope);
  if(source.service!==routing.scope[0]||!state.members.some(m=>m.id===routing.owner)||!Array.isArray(routing.versions)||!routing.versions.length||routing.versions.length>10000)fail('Invalid routed key definition');
  routing.versions.forEach((version,index)=>{
    exact(version,['version','rules','catchAll','publishedBy','publishedAt']);
    if(version.version!==index+1||!state.members.some(m=>m.id===version.publishedBy)||!routingDate(version.publishedAt)||index>0&&Date.parse(version.publishedAt)<Date.parse(routing.versions[index-1].publishedAt))fail('Invalid routing version history');
    routingRules(routing.scope,version.rules,version.catchAll);
  });
}
export function validateRoutingReceipt(state:State,source:IntakeSource,receipt:IntakeReceipt) {
  if(!source.routing) {
    if(receipt.routing!==undefined||receipt.routingInput!==undefined)fail('Unexpected routing receipt');
    return;
  }
  const route=receipt.routing;if(!route||receipt.routingInput===undefined)fail('Missing immutable routing explanation');
  validateRoutingInput(receipt.routingInput);
  exact(route,['key','version','rule','kind','service','evaluated','diagnostics','serviceDecision'],['dynamic','readmission']);
  const version=source.routing.versions.find(v=>v.version===route.version);
  if(!version||route.key!==source.id||route.service!==receipt.service||receipt.service!==null&&!source.routing.scope.includes(receipt.service)||!['rule','dynamic','catch-all','readmission'].includes(route.kind)||Date.parse(receipt.acceptedAt)<Date.parse(version.publishedAt))fail('Invalid routing receipt version or scope');
  if(!Array.isArray(route.diagnostics)||route.diagnostics.length>10||route.diagnostics.some(v=>typeof v!=='string'||v.length>2000))fail('Invalid routing diagnostics');
  if(route.dynamic) {
    exact(route.dynamic,['field','value'],['serviceName']);
    if(typeof route.dynamic.field!=='string'||typeof route.dynamic.value!=='string'||route.dynamic.value.length>32768||route.dynamic.serviceName!==undefined&&(typeof route.dynamic.serviceName!=='string'||route.dynamic.serviceName.length>200))fail('Invalid dynamic routing evidence');
  }
  // Retain the historical name used by a dynamic name route, even after renames.
  const snapshot=route.dynamic?.serviceName&&receipt.service?{...state,services:state.services.map(s=>s.id===receipt.service?{...s,name:route.dynamic!.serviceName!}:s)}:state;
  const expected=receipt.incomplete?{key:source.id,version:version.version,rule:null,kind:'catch-all',service:version.catchAll,evaluated:[],dynamic:undefined}:evaluateRouting(snapshot,source.id,source.routing,version,receipt.routingInput);
  if(JSON.stringify(expected.evaluated)!==JSON.stringify(route.evaluated)||expected.rule!==route.rule||JSON.stringify(expected.dynamic)!==JSON.stringify(route.dynamic))fail('Invalid routing rule evidence');
  if(route.kind==='readmission') {
    exact(route.readmission,['receipt','operationId','by']);
    const readmit=route.readmission!,original=state.intakeReceipts?.find(r=>r.id===readmit.receipt);
    if(!original||original===receipt||original.source!==source.id||original.outcome!=='unrouted'||receipt.service===null||!state.members.some(m=>m.id===readmit.by)||typeof readmit.operationId!=='string'||!readmit.operationId.length||readmit.operationId.length>100||Date.parse(original.acceptedAt)>Date.parse(receipt.acceptedAt)||JSON.stringify(original.routingInput)!==JSON.stringify(receipt.routingInput)||JSON.stringify(original.monitoring)!==JSON.stringify(receipt.monitoring)||JSON.stringify(original.incomplete)!==JSON.stringify(receipt.incomplete)||JSON.stringify(original.native)!==JSON.stringify(receipt.native)||['action','key','title','severity','priority','observedAt','sender','links','details','truncated'].some(k=>JSON.stringify(original[k as keyof IntakeReceipt])!==JSON.stringify(receipt[k as keyof IntakeReceipt])))fail('Invalid routing re-admission link');
    if(state.intakeReceipts?.some(r=>r!==receipt&&r.source===source.id&&r.routing?.readmission?.operationId===readmit.operationId))fail('Duplicate routing re-admission operation');
  } else if(route.readmission!==undefined||expected.kind!==route.kind||expected.service!==route.service)fail('Invalid routing decision');
  if(route.serviceDecision!==null) {
    exact(route.serviceDecision,['event','policy','version','action','owner','reason'],['correlation','transformation']);
    const reference=route.serviceDecision,event=state.events.find(e=>e.id===reference.event&&e.service===receipt.service&&e.source==='intake:'+source.id&&e.key===receipt.key&&e.generation===receipt.generation);
    if(!event||Date.parse(event.acceptedAt)>Date.parse(receipt.acceptedAt)||receipt.event!==null&&event.id!==receipt.event||JSON.stringify(event.decision)!==JSON.stringify({policy:reference.policy,version:reference.version,action:reference.action,owner:reference.owner,reason:reference.reason,...(reference.correlation?{correlation:reference.correlation}:{})}))fail('Invalid service orchestration decision reference');
  } else if(receipt.event!==null)fail('Missing service orchestration decision reference');
}
