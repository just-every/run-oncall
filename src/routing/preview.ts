import { fail, type State } from '../family/response-operations/domain.ts';
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
  const receipts=all.filter(r=>(!ids||ids.includes(r.id))&&(!input.from||Date.parse(r.acceptedAt)>=Date.parse(input.from))&&(!input.to||Date.parse(r.acceptedAt)<=Date.parse(input.to))).sort((a,b)=>a.acceptedAt.localeCompare(b.acceptedAt));
  if(receipts.length>10000)fail('Replay supports at most 10,000 receipts');
  const warnings:string[]=[];
  const decisions=receipts.map(receipt=>{
    const proposed=evaluateRouting(state,source.id,source.routing!,draft,receipt.routingInput!),historical=structuredClone(receipt.routing!);
    const changed=historical.service!==proposed.service||historical.rule!==proposed.rule||historical.kind!==proposed.kind||JSON.stringify(historical.dynamic)!==JSON.stringify(proposed.dynamic)||JSON.stringify(historical.evaluated)!==JSON.stringify(proposed.evaluated);
    return {receipt:receipt.id,historical,proposed,changed};
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
