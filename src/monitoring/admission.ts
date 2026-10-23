import { recordAlertObligation } from '../alert-obligation.ts';
import { admit, fail, type State } from '../family/response-operations/domain.ts';
import { intakeReceiptCapacity } from '../workspace-profile.ts';
import { intakeSourceIdentity, type IntakeReceipt, type IntakeSource } from '../intake/model.ts';
import { evaluateRouting } from '../routing/engine.ts';
import { sanitizeRoutingInput } from '../routing/input.ts';
import type { RoutingExplanation } from '../routing/types.ts';
import type { MonitoringEvent, MonitoringMetadata, IncompleteEvidence } from './types.ts';

type AdmissionOptions={provider:IntakeReceipt['provider'];monitoring?:MonitoringMetadata;incomplete?:IncompleteEvidence;explanation?:RoutingExplanation;readmission?:boolean};
/** Provider generations are explicit. Native admission preserves recovered tombstones. */
export function receiveMonitoring(state:State,source:IntakeSource,input:MonitoringEvent,options:AdmissionOptions,at=new Date().toISOString()) {
  const routingInput=source.routing?sanitizeRoutingInput(input.routingInput):undefined;
  const routing=source.routing?structuredClone(options.explanation??evaluateRouting(state,source.id,source.routing,source.routing.versions.at(-1)!,routingInput!)):undefined;
  const service=routing?routing.service:source.service;
  const prior=!options.readmission?state.intakeReceipts?.find(r=>r.source===source.id&&r.service===service&&!r.routing?.readmission&&(options.incomplete?r.incomplete?.sha256===options.incomplete.sha256:r.monitoring?.eventId===input.eventId)):undefined;
  if(prior)return {receipt:prior,duplicate:true};
  if((state.intakeReceipts?.length??0)>=intakeReceiptCapacity)fail('Local intake receipt capacity reached; export before extending capacity',429);
  const id=crypto.randomUUID(),identity=intakeSourceIdentity(source.id);
  let event:string|null=null,alert:string|null=null,generation:string|null=null,outcome:IntakeReceipt['outcome']='unrouted';
  if(service!==null) {
    const destination=state.services.find(s=>s.id===service);if(!destination)fail('Unknown integration service');
    const previous=state.alerts.find(a=>a.source===identity&&a.service===service&&a.key===input.key&&a.generation===input.generation);
    const result=admit(state,{source:identity,eventId:id,service,environment:destination.environment,key:input.key,generation:input.generation,intent:input.intent,severity:input.severity,title:input.title,observedAt:input.observedAt,evidence:input.links[0]??''},at);
    generation=input.generation;event=result.event.id;alert=result.alert;
    outcome=input.intent==='recover'?'recovered':previous?'deduplicated':'opened';
    if(routing)routing.serviceDecision={event,...structuredClone(result.event.decision)};
  }
  if(service===null&&options.incomplete) {
    const queued:import('../family/response-operations/domain').Alert={id:crypto.randomUUID(),source:identity,service:null,environment:'',key:input.key,generation:input.generation,state:'active',events:[],owner:source.routing!.owner,suppressed:false};
    state.alerts.push(queued);alert=queued.id;generation=input.generation;
    recordAlertObligation(queued);
  }
  const receipt:IntakeReceipt={id,source:source.id,provider:options.provider,service,generation,event,alert,acceptedAt:at,outcome,action:input.intent==='recover'?'recover':'trigger',key:input.key,title:input.title,severity:input.severity,priority:null,observedAt:input.observedAt,sender:source.provider,links:structuredClone(input.links),details:structuredClone(input.details),truncated:input.truncated,...(routing?{routing,routingInput}:{}),...(options.monitoring?{monitoring:structuredClone(options.monitoring)}:{}),...(options.incomplete?{incomplete:structuredClone(options.incomplete)}:{})};
  (state.intakeReceipts??=[]).push(receipt);
  state.audit.push({id:crypto.randomUUID(),at,actor:'source:'+identity,kind:options.incomplete?'incomplete-intake':'monitoring-intake',text:`${source.provider} ${input.intent}: ${outcome}; receipt ${id}`});
  return {receipt,duplicate:false};
}
