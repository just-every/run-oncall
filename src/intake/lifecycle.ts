import {correlationLabels} from '../orchestration/correlation';
import {identityLimit} from './identity-bounds.ts';
import { finishResponseAdmission } from '../response-policy/model.ts';
import { admit, fail, type State } from '../family/response-operations/domain.ts';
import { intakeReceiptCapacity } from '../workspace-profile.ts';
import { intakeSourceIdentity, type IntakeReceipt, type IntakeSource } from './model.ts';
import type { CompatibleInput, CompatibleProvider } from './provider-types.ts';
import type { RoutingExplanation } from '../routing/types.ts';
import { evaluateRouting } from '../routing/engine.ts';
import { sanitizeRoutingInput } from '../routing/input.ts';

type RoutingAdmission={input:Record<string,unknown>;explanation?:RoutingExplanation};
// Service selection precedes identity and the existing per-service lifecycle.
export function receiveCompatible(state:State,source:IntakeSource,provider:CompatibleProvider,input:CompatibleInput,at=new Date().toISOString(),routing?:RoutingAdmission):IntakeReceipt {
  if((state.intakeReceipts?.length??0)>=intakeReceiptCapacity)fail('Local intake receipt capacity reached; export before extending capacity',429);
  const routingInput=source.routing?structuredClone(routing?.input??sanitizeRoutingInput({summary:input.title,source:input.sender,severity:input.severity,details:input.details})):undefined;
  const explanation=source.routing?structuredClone(routing?.explanation??evaluateRouting(state,source.id,source.routing,source.routing.versions.at(-1)!,routingInput!)):undefined;
  const selected=explanation?explanation.service:source.service;
  if(selected!==null&&!state.services.some(s=>s.id===selected))fail('Unknown integration service');
  const id=crypto.randomUUID();
  if(selected===null) {
    const receipt:IntakeReceipt={...input,id,source:source.id,provider,service:null,generation:null,event:null,alert:null,acceptedAt:at,outcome:'unrouted',routing:explanation,routingInput};
    (state.intakeReceipts??=[]).push(receipt);
    state.audit.push({id:crypto.randomUUID(),at,actor:'source:'+intakeSourceIdentity(source.id),kind:'compatible-intake',text:`${provider} ${input.action}: unrouted; receipt ${id}; integration owner ${source.routing!.owner}`});
    return receipt;
  }
  const service=state.services.find(s=>s.id===selected)!;
  const identity=intakeSourceIdentity(source.id),open=state.alerts.find(a=>a.source===identity&&a.service===service.id&&a.environment===service.environment&&a.key===input.key&&a.state==='active');
  let alert=open?.id??null,generation=open?.generation??null,event:string|null=null;
  let outcome:IntakeReceipt['outcome']='no-effect';
  if(input.action==='trigger'||input.action==='recover'&&open) {
    generation??=crypto.randomUUID();
    const result=admit(state,{source:identity,eventId:id,service:service.id,environment:service.environment,key:input.key,generation,intent:input.action==='trigger'?'trigger':'recover',severity:input.severity,title:input.title||state.events.find(e=>open?.events.includes(e.id)&&e.intent==='trigger')!.title,observedAt:input.observedAt??at,evidence:input.links[0]??''},at,false,identityLimit(provider),correlationLabels(input.details));
    alert=result.alert;event=result.event.id;
    outcome=input.action==='recover'?'recovered':open?'deduplicated':'opened';
  } else if(open) outcome=input.action==='acknowledge'?'acknowledged':'noted';
  if(explanation) {
    const decisionEvent=state.events.find(e=>e.id===(event??open?.events.at(-1)));
    explanation.serviceDecision=decisionEvent?{event:decisionEvent.id,...structuredClone(decisionEvent.decision)}:null;
    if(input.action==='recover'&&!open) {
      const services=state.alerts.filter(a=>a.source===identity&&a.key===input.key&&a.state==='active').map(a=>a.service);
      explanation.diagnostics.push(`resolve matched no open generation; key open on services: ${services.join(', ')||'none'}`);
    }
  }
  const receipt:IntakeReceipt={...input,id,source:source.id,provider,service:service.id,generation,event,alert,acceptedAt:at,outcome,...(explanation?{routing:explanation,routingInput}:{})};
  (state.intakeReceipts??=[]).push(receipt);
  if(alert&&event)finishResponseAdmission(state,state.alerts.find(a=>a.id===alert)!,state.events.find(e=>e.id===event)!,receipt.id);
  state.audit.push({id:crypto.randomUUID(),at,actor:'source:'+identity,kind:'compatible-intake',text:`${provider} ${input.action}: ${outcome}; receipt ${id}`});
  return receipt;
}
