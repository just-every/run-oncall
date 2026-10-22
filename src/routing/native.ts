import { auditIdentity } from '../audit-store';
import { fail, signalInput, admit, type State } from '../family/response-operations/domain';
import { presentedSourceKey, refuseKeyEcho, type NativeSource } from '../native-sources';
import { intakeHash } from '../intake/credentials';
import { intakeSourceIdentity, type IntakeReceipt, type IntakeSource } from '../intake/model';
import type { IntakeDependencies } from '../monitoring/credentials';
import { evaluateRouting } from './engine';
import { sanitizeRoutingInput } from './input';
import type { RoutingExplanation } from './types';

// Native source+eventId identity survives routing changes. The fingerprint covers
// normalized native content and the bounded raw-field projection used by rules.
export function receiveNativeRouting(state:State,source:IntakeSource,signal:ReturnType<typeof signalInput>,fingerprint:string,routingInput:Record<string,unknown>,explanation?:RoutingExplanation) {
  const previous=state.intakeReceipts?.find(r=>r.source===source.id&&r.native?.eventId===signal.eventId&&!r.routing?.readmission);
  if(previous&&!explanation?.readmission) {
    if(previous.native!.fingerprint!==fingerprint)fail('Event identity already accepted with different content',409);
    return {receipt:previous,duplicate:true};
  }
  if((state.intakeReceipts?.length??0)>=10000)fail('Local intake receipt capacity reached; export before extending capacity',429);
  const routing=structuredClone(explanation??evaluateRouting(state,source.id,source.routing!,source.routing!.versions.at(-1)!,routingInput));
  if(routing.service!==null&&!source.routing!.scope.includes(routing.service))fail('Routing service outside key scope',403);
  const at=new Date().toISOString(),service=routing.service===null?null:state.services.find(s=>s.id===routing.service);
  if(routing.service!==null&&!service)fail('Unknown integration service');
  const native={eventId:signal.eventId,sourceGeneration:signal.generation,fingerprint};
  const receipt:IntakeReceipt={id:crypto.randomUUID(),source:source.id,provider:'native',service:service?.id??null,generation:null,event:null,alert:null,acceptedAt:at,outcome:service?'no-effect':'unrouted',action:signal.intent==='recover'?'recover':'trigger',key:signal.key,title:signal.title,severity:signal.severity,priority:null,observedAt:signal.observedAt,sender:signal.source,links:signal.evidence?[signal.evidence]:[],details:{},truncated:false,routing,routingInput:structuredClone(routingInput),native};
  if(service) {
    const generation=state.alerts.find(a=>a.source===intakeSourceIdentity(source.id)&&a.service===service.id&&a.environment===service.environment&&a.key===signal.key&&a.generation===signal.generation);
    const open=generation?.state==='active'?generation:undefined;
    if(signal.intent==='trigger'||open) {
      const admitted=admit(state,{...signal,source:intakeSourceIdentity(source.id),service:service.id,environment:service.environment,eventId:routing.readmission?'native-readmit:'+routing.readmission.operationId:signal.eventId},at);
      receipt.id=admitted.event.id;receipt.event=admitted.event.id;receipt.alert=admitted.alert;receipt.generation=signal.generation;
      receipt.outcome=signal.intent==='recover'?'recovered':generation?'deduplicated':'opened';
      routing.serviceDecision={event:admitted.event.id,...structuredClone(admitted.event.decision)};
    } else {
      const services=state.alerts.filter(a=>a.source===intakeSourceIdentity(source.id)&&a.key===signal.key&&a.state==='active').map(a=>a.service);
      routing.diagnostics.push(`resolve matched no open generation; key open on services: ${[...new Set(services)].join(', ')||'none'}`);
    }
  }
  (state.intakeReceipts??=[]).push(receipt);
  state.audit.push({id:crypto.randomUUID(),at,actor:'source:'+intakeSourceIdentity(source.id),kind:'native-routed-intake',text:`Native ${signal.intent}: ${receipt.outcome}; receipt ${receipt.id}`});
  return {receipt,duplicate:false};
}

export async function nativeRoutedIngress(c:any,deps:IntakeDependencies,raw:string) {
  const identity=c.req.param('source');
  if(!identity.startsWith('intake:'))fail('Invalid source credential',401);
  const state=await deps.load(c.env.DB),source=state.intakeSources?.find(s=>intakeSourceIdentity(s.id)===identity&&s.provider==='native'&&s.routing&&s.active);
  const credential=source?await c.env.DB.prepare('SELECT key_digest AS digest,signing_custody FROM oc_intake_credentials WHERE source=?').bind(source.id).first() as Omit<NativeSource,'scopes'|'signing_secret'>|null:null;
  if(!source||!credential)fail('Invalid source credential',401);
  if((source.authentication==='signed')!==(credential.signing_custody!==null))fail('Source key custody is incomplete',503);
  const key=await presentedSourceKey(c,{...credential,signing_secret:null,scopes:JSON.stringify(source.routing!.scope)},raw);
  auditIdentity(c.env.DB,{actor:{kind:'intake-source',id:source.id},source:{kind:'intake-source',id:source.id}});
  if(new TextEncoder().encode(raw).length>65536)fail('Request too large',413);
  let input:any;try {input=JSON.parse(raw);} catch {fail('Invalid JSON');}
  const signal=signalInput(input);
  if(signal.source!==identity)fail('"source" must match the source ID in the URL');
  refuseKeyEcho([JSON.stringify(input)],key);
  const routingInput=sanitizeRoutingInput({...input,summary:signal.title,source:signal.source,severity:signal.severity,event:{action:signal.intent,summary:signal.title,severity:signal.severity}},key);
  const fingerprint=await intakeHash(JSON.stringify({signal,routingInput}));
  const result=receiveNativeRouting(state,source,signal,fingerprint,routingInput);
  if(!result.duplicate)await deps.save(c.env.DB,state,state.revision,{sql:'EXISTS(SELECT 1 FROM oc_intake_credentials WHERE source=? AND key_digest=? AND signing_custody IS ?)',values:[source.id,credential.digest,credential.signing_custody]});
  const receipt=result.receipt;
  return c.json({duplicate:result.duplicate,id:receipt.id,eventId:receipt.native!.eventId,service:receipt.service,observedAt:receipt.observedAt,acceptedAt:receipt.acceptedAt},result.duplicate?200:201);
}
