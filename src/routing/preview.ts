import {correlationLabels,labelsForEvent} from '../orchestration/correlation.ts';
import {serviceUrgency} from '../urgency/model.ts';
import { fail, route, type State } from '../family/response-operations/domain.ts';
import type { IntakeSource } from '../intake/model.ts';
import type { RoutingPreview, RoutingVersion } from './types.ts';
import { evaluateRouting } from './engine.ts';
import { routingDate } from './definition.ts';

export function previewRouting(state:State,source:IntakeSource,draft:RoutingVersion,input:any):RoutingPreview {
  if(input.receiptIds!==undefined&&(!Array.isArray(input.receiptIds)||input.receiptIds.length>10000||input.receiptIds.some((id:unknown)=>typeof id!=='string')||new Set(input.receiptIds).size!==input.receiptIds.length))fail('Choose up to 10,000 distinct receipt IDs');
  if(input.from!==undefined&&!routingDate(input.from)||input.to!==undefined&&!routingDate(input.to)||input.from&&input.to&&Date.parse(input.from)>Date.parse(input.to))fail('Choose a valid routing replay time window');
  if(input.receiptIds!==undefined&&(input.from!==undefined||input.to!==undefined))fail('Choose receipt IDs or a time window');
  const all=(state.intakeReceipts??[]).filter(r=>r.source===source.id),ids=input.receiptIds as string[]|undefined;
  if(ids?.some(id=>!all.some(r=>r.id===id)))fail('Replay receipt does not belong to this routed key');
  const receipts=all.filter(r=>(!ids||ids.includes(r.id))&&(!input.from||Date.parse(r.acceptedAt)>=Date.parse(input.from))&&(!input.to||Date.parse(r.acceptedAt)<=Date.parse(input.to))).sort((a,b)=>a.acceptedAt.localeCompare(b.acceptedAt)||a.id.localeCompare(b.id));
  if(receipts.length>10000)fail('Replay supports at most 10,000 receipts');
  const warnings:string[]=[];
  const proposedState=structuredClone(state),selected=new Set(receipts.map(r=>r.event));proposedState.events=proposedState.events.filter(e=>!selected.has(e.id));
  const decisions=receipts.map(receipt=>{
    const proposed=evaluateRouting(state,source.id,source.routing!,draft,receipt.routingInput!),historical=structuredClone(receipt.routing!);
    const service=state.services.find(row=>row.id===proposed.service),original=state.events.find(e=>e.id===receipt.event);
    const historicalUrgency=original?.urgency??null,proposedUrgency=service&&!receipt.incomplete?serviceUrgency(state,service.id,receipt.severity,new Date().toISOString()):null;
    if(service&&!receipt.incomplete){const id=receipt.event??receipt.routing?.serviceDecision?.event??'receipt:'+receipt.id,at=new Date().toISOString(),signal={source:'intake:'+source.id,eventId:original?.eventId??receipt.id,service:service.id,environment:service.environment,key:receipt.key,generation:receipt.generation??'replay:'+receipt.id,intent:receipt.action==='recover'?'recover' as const:'trigger' as const,severity:receipt.severity,title:receipt.title,observedAt:receipt.observedAt??receipt.acceptedAt,evidence:receipt.links[0]??''};
     const decision=route(proposedState,signal,at,id,original?labelsForEvent(state,original):correlationLabels(receipt.details));proposed.serviceDecision={event:id,...decision};proposedState.events.push({...signal,id,acceptedAt:at,decision,...(proposedUrgency?{urgency:proposedUrgency}:{}),routingSnapshot:{policies:state.policies,members:state.members,evaluatedAt:at}});
    }
    const changed=JSON.stringify(historical.serviceDecision)!==JSON.stringify(proposed.serviceDecision)||historical.service!==proposed.service||historical.rule!==proposed.rule||historical.kind!==proposed.kind||JSON.stringify(historical.dynamic)!==JSON.stringify(proposed.dynamic)||JSON.stringify(historical.evaluated)!==JSON.stringify(proposed.evaluated);
    return {receipt:receipt.id,historical,proposed,historicalUrgency,proposedUrgency,changed:changed||JSON.stringify(historicalUrgency&&{urgency:historicalUrgency.urgency,version:historicalUrgency.version,reason:historicalUrgency.reason,rule:historicalUrgency.rule})!==JSON.stringify(proposedUrgency&&{urgency:proposedUrgency.urgency,version:proposedUrgency.version,reason:proposedUrgency.reason,rule:proposedUrgency.rule})};
  });
  // Test a hypothetical recovery for each open generation, including those
  // outside the replay selection. A resolve must stay on its original service.
  for(const alert of state.alerts.filter(a=>a.source==='intake:'+source.id&&a.state==='active')) {
    const receipt=[...all].reverse().find(r=>r.alert===alert.id&&r.action==='trigger');
    if(!receipt?.routingInput)continue;
    const input=structuredClone(receipt.routingInput);
    if(input.event&&typeof input.event==='object'&&!Array.isArray(input.event))(input.event as Record<string,unknown>).action='recover';
    if(receipt.provider==='pagerduty-v2')input.event_action='resolve';
    if(receipt.provider==='pagerduty-v1')input.event_type='resolve';
    if(receipt.provider==='native')input.intent='recover';
    if(receipt.provider==='splunk')input.message_type='RECOVERY';
    const proposed=evaluateRouting(state,source.id,source.routing!,draft,input);
    if(proposed.service===alert.service)continue;
    const warning=`Open generation ${alert.id} (${alert.key}) on ${alert.service}: hypothetical resolve routes to ${proposed.service??'unrouted'}`;
    warnings.push(warning);
    for(const decision of decisions)if(all.find(r=>r.id===decision.receipt)?.alert===alert.id)Object.assign(decision,{warning});
  }
  return {baseVersion:draft.version,decisions,warnings};
}
