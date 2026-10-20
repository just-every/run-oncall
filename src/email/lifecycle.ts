import { admit, type State } from '../family/response-operations/domain';
import { decideEmail } from './rules';
import { emailAlertUrgency } from '../urgency/model';
import type { EmailAddress, EmailReceipt, EmailSample, EmailVersion } from './types';
export function applyEmail(state:State,address:EmailAddress,version:EmailVersion,sample:EmailSample,receipt:EmailReceipt) {
  const decision=decideEmail(version,sample,receipt.id);receipt.decision=decision;
  if(decision.action==='quarantine'){receipt.outcome='quarantined';receipt.diagnostic=decision.reason;return;}
  const source='email:'+address.id,open=state.alerts.find(a=>a.source===source&&a.service===address.service&&a.environment===address.environment&&a.key===decision.key&&a.state==='active');
  if(decision.action==='resolve'&&(!decision.key||!open)) {receipt.outcome='no-effect';receipt.diagnostic=decision.key?'resolve_matched_no_open_generation':'resolve_extracted_nothing';return;}
  const generation=open?.generation??crypto.randomUUID();
  const result=admit(state,{source,eventId:receipt.id,service:address.service,environment:address.environment,key:decision.key!,generation,intent:decision.action==='resolve'?'recover':'trigger',title:sample.subject.trim().slice(0,300)||'Email alert',severity:decision.severity,observedAt:receipt.at,evidence:''},receipt.at,true);
  const alert=state.alerts.find(a=>a.id===result.alert)!;
  Object.assign(receipt,{alert:alert.id,event:result.event.id,generation,obligation:open?state.emailReceipts?.find(r=>r.alert===open.id&&r.obligation)?.obligation??null:'email-obligation:'+generation,outcome:decision.action==='resolve'?'recovered':open?'deduplicated':'opened',diagnostic:decision.reason});
  if(decision.action==='trigger') {
    if(decision.priority)alert.priority=decision.priority;
    if(decision.urgency)emailAlertUrgency(state,alert,receipt,decision.urgency,!open);
  } else receipt.stop='stopped by source recovery';
  // This is an explicit, non-automatic obligation while paging is OFF. An email
  // recovery changes only this source generation, never a declared incident.
  state.audit.push({id:crypto.randomUUID(),at:receipt.at,actor:'source:'+source,kind:'email-intake',text:`Receipt ${receipt.id}; ${receipt.outcome}; ${receipt.stop??'paging OFF; no automatic escalation'}`});
}
