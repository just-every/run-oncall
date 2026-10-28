import {CorrelationExplanation} from '../orchestration/Explanation';
import type {Decision,Event} from '../family/response-operations/domain';

/** Keep the frozen explanation intact; resolve record references only for display. */
export function DecisionExplanation({decision,events}:{decision:Decision|null|undefined;events:Event[]}) {
 if(!decision)return null;
 const name=(id:string)=>events.find(e=>e.id===id||e.eventId===id)?.title??'Retained event';
 const explain=(value:string)=>value.replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,name);
 const value={...decision,...(decision.transformation?{transformation:{...decision.transformation,event:name(decision.transformation.event),reason:explain(decision.transformation.reason)}}:{}),...(decision.correlation?{correlation:{...decision.correlation,group:decision.correlation.group?'Matching signals':null,originalEvent:decision.correlation.originalEvent?name(decision.correlation.originalEvent):null,reason:explain(decision.correlation.reason)}}:{})};
 return <CorrelationExplanation decision={value}/>;
}
