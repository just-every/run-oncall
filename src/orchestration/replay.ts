import {route,type State,type Signal,type Event} from '../family/response-operations/domain.ts';
import {serviceUrgency} from '../urgency/model.ts';
import {labelsForEvent} from './correlation.ts';
/** Evaluate in supplied order on a private copy. No admission or audit write runs. */
export function replayService(state:State,signals:Signal[],at:string){
 const proposed=structuredClone(state),identity=(s:Signal)=>JSON.stringify([s.source,s.eventId]),selected=new Set(signals.map(identity));
 proposed.events=proposed.events.filter(e=>!selected.has(identity(e)));
 return signals.map((signal,index)=>{
  const historical=state.events.find(e=>identity(e)===identity(signal)),id=historical?.id??'preview:'+index;
  const decision=route(proposed,signal,at,id,historical?labelsForEvent(state,historical):undefined),urgency=state.services.some(s=>s.id===signal.service)?serviceUrgency(state,signal.service,signal.severity,at):null;
  proposed.events.push({...signal,id,acceptedAt:at,decision,...(urgency?{urgency}:{}),routingSnapshot:{policies:proposed.policies,members:proposed.members,evaluatedAt:at}} as Event);
  // Provider labels remain in their original receipt. The original event id
  // makes those receipts available to later proposed grouping decisions.
  return {eventId:signal.eventId,historical:historical?.decision??null,historicalEvaluation:historical?.routingSnapshot??null,historicalUrgency:historical?.urgency??null,proposed:decision,proposedUrgency:urgency,proposedEvaluation:at};
 });
}
