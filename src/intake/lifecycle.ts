import { admit, fail, type State } from '../family/response-operations/domain.ts';
import { intakeSourceIdentity, type IntakeReceipt, type IntakeSource } from './model.ts';
import type { CompatibleInput, CompatibleProvider } from './provider-types.ts';

// Compatible senders identify an outage, not a transport observation. Receipt
// order chooses the open generation; identical later triggers can reopen it.
export function receiveCompatible(state:State,source:IntakeSource,provider:CompatibleProvider,input:CompatibleInput,at=new Date().toISOString()):IntakeReceipt {
  const service=state.services.find(s=>s.id===source.service);if(!service)fail('Unknown integration service');
  const identity=intakeSourceIdentity(source.id),open=state.alerts.find(a=>a.source===identity&&a.service===service.id&&a.environment===service.environment&&a.key===input.key&&a.state==='active');
  let alert=open?.id??null,generation=open?.generation??null,event:string|null=null;
  let outcome:IntakeReceipt['outcome']='no-effect';
  const id=crypto.randomUUID();
  if(input.action==='trigger'||input.action==='recover'&&open) {
    generation??=crypto.randomUUID();
    const result=admit(state,{source:identity,eventId:id,service:service.id,environment:service.environment,key:input.key,generation,intent:input.action==='trigger'?'trigger':'recover',severity:input.severity,title:input.title||state.events.find(e=>open?.events.includes(e.id)&&e.intent==='trigger')!.title,observedAt:input.observedAt??at,evidence:input.links[0]??''},at);
    alert=result.alert;event=result.event.id;
    outcome=input.action==='recover'?'recovered':open?'deduplicated':'opened';
  } else if(open) outcome=input.action==='acknowledge'?'acknowledged':'noted';
  const receipt:IntakeReceipt={...input,id,source:source.id,provider,service:service.id,generation,event,alert,acceptedAt:at,outcome};
  (state.intakeReceipts??=[]).push(receipt);
  state.audit.push({id:crypto.randomUUID(),at,actor:'source:'+identity,kind:'compatible-intake',text:`${provider} ${input.action}: ${outcome}; receipt ${id}`});
  return receipt;
}
