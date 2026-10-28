import {fail,type Incident,type State,type Entry} from '../family/response-operations/domain.ts';
import {deadlineActor} from './model.ts';
function shape(v:any,keys:string[]) {if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).length!==keys.length||keys.some(k=>!Object.hasOwn(v,k)))fail('Invalid deadline record');}
const date=(v:any)=>typeof v==='string'&&Number.isFinite(Date.parse(v));
export function validateTimeoutHistory(rows:any) {
 if(!Array.isArray(rows)||!rows.length||rows.length>100)fail('Invalid timeout policy history');
 rows.forEach((r,n)=>{shape(r,['version','minutes','by','at']);if(r.version!==n+1||!Number.isSafeInteger(r.minutes)||r.minutes<0||r.minutes>1440||typeof r.by!=='string'||!date(r.at))fail('Invalid timeout policy');});
}
export function validDeadlineEntry(incident:Incident,entry:Entry) {
 if(!['deadline-fired','deadline-cancelled'].includes(entry.kind))return false;
 const deadline=incident.deadlines?.find(d=>entry.id===entry.kind+':'+d.id);
 if(!deadline)return false;
 const agent=entry.metadata?.agent;
 const agentActor=!!agent&&agent.for?.id===agent.sponsor&&entry.actor===(agent.client??agent.agent?.id)&&deadline.actor===entry.actor;
 return (entry.actor===deadlineActor||agentActor)&&deadline.state===(entry.kind==='deadline-fired'?'fired':'cancelled')&&entry.at===deadline.endedAt&&entry.text===`${deadline.kind}: ${deadline.minutes} minutes, due ${deadline.dueAt}: ${deadline.outcome}; paging OFF`;
}
export function validateDeadlines(state:State) {
 const member=(id:string)=>state.members.some(m=>m.id===id)||state.apiClients?.some(c=>c.id===id);
 const creator=(incident:Incident,id:string,deadline:string)=>member(id)||incident.timeline.some(entry=>{
  const agent=entry.metadata?.agent;
  return entry.id==='deadline:'+deadline&&entry.actor===id&&agent?.agent?.id===id&&agent.for?.id===agent.sponsor&&state.members.some(row=>row.id===agent.sponsor);
 });
 for(const s of state.services)if(s.ackTimeouts!==undefined){validateTimeoutHistory(s.ackTimeouts);if(s.ackTimeouts.some(r=>!member(r.by)))fail('Invalid timeout author');}
 for(const i of state.incidents)if(i.deadlines!==undefined){if(!Array.isArray(i.deadlines)||i.deadlines.length>500||new Set(i.deadlines.map(d=>d.id)).size!==i.deadlines.length||i.deadlines.filter(d=>d.state==='pending').length>1)fail('Invalid deadline history');for(const d of i.deadlines){
  shape(d,['id','kind','state','actor','createdAt','dueAt','minutes','level','policyVersion','endedAt','outcome','obligation']);
  if(typeof d.id!=='string'||d.id.length>100||!['snooze','acknowledgment-timeout'].includes(d.kind)||!['pending','fired','cancelled','held'].includes(d.state)||!creator(i,d.actor,d.id)||!date(d.createdAt)||!date(d.dueAt)||!Number.isSafeInteger(d.minutes)||d.minutes<1||d.minutes>1440||Date.parse(d.dueAt)!==Date.parse(d.createdAt)+d.minutes*60000||![0,1,null].includes(d.level)||!Number.isSafeInteger(d.policyVersion)||d.policyVersion<0||d.endedAt!==null&&!date(d.endedAt)||typeof d.outcome!=='string'||d.outcome.length>1000||d.state==='fired'&&(!d.endedAt||Date.parse(d.endedAt)<Date.parse(d.dueAt)))fail('Invalid persisted deadline');
  if(d.obligation){const o=d.obligation;shape(o,['id','state','paging','automatic','label','target','urgency','creator','at','outcome']);shape(o.target,['kind','id']);if(d.state!=='fired'||o.id!=='deadline-obligation:'+d.id||!['recorded','stopped'].includes(o.state)||o.paging!=='off'||o.automatic!==false||o.label!=='no sender'||o.target.kind!=='user'||!member(o.target.id)||o.creator!==d.actor||!['high','low'].includes(o.urgency)||!date(o.at)||typeof o.outcome!=='string')fail('Invalid deadline obligation');}
 }}
}
export function eraseDeadlineMember(incident:Incident,id:string) {for(const d of incident.deadlines??[]){if(d.actor===id&&d.state==='pending'){d.state='cancelled';d.outcome='Creator erased; no re-trigger obligation';}if(d.obligation?.target.id===id)d.obligation=null;}}
