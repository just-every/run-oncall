import {fail,type Policy,type State} from '../family/response-operations/domain.ts';

/** A private copy of the workspace as if the open, unpublished coordination rule were published. Nothing is saved. */
export function withDraftPolicy(state:State,draft:any):State {
 if(!state.services.some(s=>s.id===draft?.service))fail('Unknown service');
 if(!['route','suppress'].includes(draft.action)||!['*','critical','warning','info'].includes(draft.severity))fail('Invalid routing rule');
 if(draft.action==='route'&&!state.members.some(m=>m.id===draft.owner&&m.active&&['admin','responder'].includes(m.role)))fail('Route requires active responder');
 const copy=structuredClone(state),old=copy.policies.find(p=>p.service===draft.service&&p.severity===draft.severity);
 const rule:Policy={...old,id:old?.id??'draft:'+draft.service+':'+draft.severity,version:(old?.version??0)+1,service:draft.service,severity:draft.severity,action:draft.action,owner:draft.owner??'',reason:'Unpublished draft'};
 if(old)copy.policies[copy.policies.indexOf(old)]=rule;else copy.policies.push(rule);
 copy.policies.sort((a,b)=>Number(a.severity==='*')-Number(b.severity==='*'));
 return copy;
}
