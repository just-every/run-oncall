import { finishResponseAdmission } from '../response-policy/model.ts';
import type { State } from '../family/response-operations/domain.ts';
import type { IntakeReceipt, IntakeSource } from '../intake/model.ts';
import { receiveMonitoring } from './admission.ts';
import { raiseIncompleteUrgency } from '../urgency/model.ts';
import type { IncompleteEvidence, MonitoringEvent } from './types.ts';
import type { RoutingExplanation } from '../routing/types.ts';

export function incompleteRouting(source:IntakeSource):RoutingExplanation|undefined {
  const version=source.routing?.versions.at(-1);
  return version?{key:source.id,version:version.version,rule:null,kind:'catch-all',service:version.catchAll,evaluated:[],diagnostics:['Incomplete intake uses the published catch-all; integration owner notified in audit'],serviceDecision:null}:undefined;
}

export function retainIncomplete(state:State,source:IntakeSource,provider:IntakeReceipt['provider'],evidence:IncompleteEvidence) {
  const at=new Date().toISOString(),owner=source.routing?.owner??source.createdBy;
  const input:MonitoringEvent={eventId:'incomplete:'+evidence.sha256,key:'incomplete:'+evidence.sha256,generation:'incomplete:'+evidence.sha256,intent:'trigger',title:'Incomplete intake: '+source.name,severity:'critical',observedAt:at,details:{incomplete:evidence,ownerNotice:{owner,paging:'off',state:'recorded'}},links:[],routingInput:{incomplete:true},truncated:true};
  const explanation=incompleteRouting(source);
  const result=receiveMonitoring(state,source,input,{provider,incomplete:evidence,explanation},at);
  const alert=result.duplicate?undefined:state.alerts.find(a=>a.id===result.receipt.alert);
  if(alert) {raiseIncompleteUrgency(state,alert,result.receipt);finishResponseAdmission(state,alert,state.events.find(e=>e.id===result.receipt.event)??null,result.receipt.id);}
  if(!result.duplicate)state.audit.push({id:crypto.randomUUID(),at,actor:'source:'+source.id,kind:'intake-owner-notice',text:`Integration owner ${owner}: incomplete intake receipt ${result.receipt.id}; ${evidence.bytes} bytes; dropped ${evidence.dropped??'unknown'} alerts; coordination notice recorded; paging remains OFF`});
  return result;
}
export function incompleteEvidence(request:{bytes:number;sha256:string;unreadBytes:number;incomplete:boolean;diagnostics:string[]},readableIds:string[],dropped:number|null,diagnostics:string[]):IncompleteEvidence {
  const evidence:IncompleteEvidence={bytes:request.bytes,sha256:request.sha256,readableIds:[...new Set(readableIds)].slice(0,64),dropped:request.incomplete?null:dropped,unreadBytes:request.unreadBytes,diagnostics:[...request.diagnostics,...diagnostics,...(readableIds.length>64?[`Readable identity list bounded to 64 of ${readableIds.length}`]:[])].slice(0,30).map(s=>s.slice(0,500))};
  while(new TextEncoder().encode(JSON.stringify(evidence)).length>7000) {
    if(evidence.diagnostics.length>1)evidence.diagnostics.pop();else evidence.readableIds.pop();
  }
  return evidence;
}
