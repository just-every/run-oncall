import type {Decision} from '../family/response-operations/domain';
export function CorrelationExplanation({decision}:{decision:Decision|null|undefined}){
 const value=decision?.correlation;if(!value)return null;
 return <div style={{overflowWrap:'anywhere'}}><p><strong>{value.held?'Flapping held':value.group?'Correlated signal':'Unmatched correlation'}</strong>{value.group&&<> · group {value.group}</>}</p><p>{value.reason}</p>{value.originalEvent&&<p>Original event {value.originalEvent} · original service rule v{value.originalVersion} · current service rule v{decision?.version}.</p>}</div>;
}
