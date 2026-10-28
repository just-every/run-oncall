import {fail,type State,type Member,type AgentAttribution} from '../family/response-operations/domain.ts';
import {validateAgentAttribution} from '../reviews/review-controls.ts';
import {coverage,preview,validateSchedule,type Schedule} from '../family/response-operations/schedules.ts';
import type {RecordedResponseObligation} from '../alert-obligation';
export type ScheduleRecord={id:string;kind:'swap'|'policy'|'reminder'|'subscription'|'notice';member:string;active:boolean;revision:number;at:string;data:Record<string,any>;preparedBy?:AgentAttribution};
export const records=(state:State)=>state.scheduleRecords??=[];
export const responsive=(state:State,id:string)=>state.members.some(m=>m.id===id&&m.active&&['admin','responder'].includes(m.role));
export function record(state:State,kind:ScheduleRecord['kind'],member:string,data:Record<string,any>):ScheduleRecord {
 if(records(state).length>=10000)fail('Schedule coordination history capacity reached',429);
 const row:ScheduleRecord={id:crypto.randomUUID(),kind,member,active:true,revision:1,at:new Date().toISOString(),data};records(state).push(row);return row;
}
export function swapState(row:ScheduleRecord,now=Date.now()){return row.data.status==='pending'&&Date.parse(row.data.start)<=now?'overdue':row.data.status;}
export function swapSchedule(state:State,schedule:Schedule,requester:string,substitute:string,role:'primary'|'backup',start:string,end:string):Schedule {
 const from=Date.parse(start),to=Date.parse(end);
 if(!['primary','backup'].includes(role)||!Number.isSafeInteger(from)||!Number.isSafeInteger(to)||from>=to||to-from>31*86400000)fail('Choose a valid swap interval of at most 31 days');
 if(!responsive(state,requester)||!responsive(state,substitute)||requester===substitute)fail('Choose one different active substitute');
 const before=preview(schedule,state.members,from,to);
 if(before.some(window=>window[role]!==requester))fail('Requester must hold the entire interval; no gap or different holder may be replaced',409);
 const override={id:crypto.randomUUID(),role,start:new Date(from).toISOString(),end:new Date(to).toISOString(),member:substitute};
 const changed=validateSchedule({...schedule,revision:schedule.revision+1,overrides:[...schedule.overrides,override]},state);
 const after=preview(changed,state.members,from,to),other=role==='primary'?'backup':'primary';
 for(const at of new Set([...before,...after].map(window=>window.at))){const prior=coverage(schedule,state.members,at),next=coverage(changed,state.members,at);if(next[role]!==substitute||next[other]!==prior[other])fail('Swap would create ambiguous or overlapping coverage or a new gap',409);}
 return changed;
}
export function scheduleChanges(state:State,before:Schedule[],after:Schedule[],actor?:string,preparedBy?:AgentAttribution) {
 for(const next of after){
  const old=before.find(s=>s.id===next.id);if(old&&JSON.stringify(old)===JSON.stringify(next))continue;
  const ids=new Set([state.services.find(s=>s.id===next.service)?.owner,...[old,next].flatMap(s=>s?[...s.primary.members,...s.backup.members,...s.overrides.map(o=>o.member)]:[])]);
  for(const member of ids)if(member&&state.members.some(row=>row.id===member)){
   const key=next.id+':'+next.revision+':'+member;
   if(records(state).some(r=>r.kind==='notice'&&r.data.key===key))continue;
   const obligation:RecordedResponseObligation={id:crypto.randomUUID(),reason:'schedule-change',state:'recorded',paging:'off',automatic:false,label:'no sender',target:{kind:'user',id:member},urgency:'low',creator:actor??member,at:new Date().toISOString(),outcome:'not deliverable: no verified channel; no sender'};
   const row=record(state,'notice',member,{key,schedule:next.id,service:next.service,obligation});
   if(preparedBy)row.preparedBy=preparedBy;
  }
 }
}
export function reminderDue(state:State,row:ScheduleRecord,schedules:Schedule[],now=Date.now()) {
 const candidates=schedules.flatMap(schedule=>preview(schedule,state.members,now,now+31*86400000).flatMap((window,index,windows)=>{
  if(index===0)return [];
  const held=(v:typeof window)=>v.primary===row.member||v.backup===row.member;
  return held(window)!==held(windows[index-1])?[window.at-Number(row.data.leadMinutes)*60000]:[];
 }));
 return candidates.length?new Date(Math.min(...candidates)).toISOString():null;
}
export function holdScheduleRecords(state:State){for(const row of state.scheduleRecords??[]){row.active=false;if(row.kind==='subscription')row.data.hash=null;}}
export function validateScheduleRecords(state:State){
 const rows=state.scheduleRecords;if(rows===undefined)return;
 if(!Array.isArray(rows)||rows.length>10000||new Set(rows.map(r=>r?.id)).size!==rows.length)fail('Invalid schedule coordination records');
 const unique=new Set<string>(),subscriptionCounts=new Map<string,number>();
 for(const row of rows)if(row?.kind==='subscription')subscriptionCounts.set(row.member,(subscriptionCounts.get(row.member)??0)+1);
 for(const r of rows){
  if(!r||Object.keys(r).filter(k=>k!=='preparedBy').sort().join()!==['id','kind','member','active','revision','at','data'].sort().join()||typeof r.id!=='string'||!r.id.length||r.id.length>100||!state.members.some(m=>m.id===r.member)||typeof r.active!=='boolean'||!Number.isSafeInteger(r.revision)||r.revision<1||!Number.isFinite(Date.parse(r.at))||!r.data||typeof r.data!=='object'||Array.isArray(r.data))fail('Invalid schedule record identity');
  if(r.preparedBy)validateAgentAttribution(r.preparedBy);
  const identity=r.kind==='policy'?'policy:'+r.data.schedule:r.kind==='reminder'?'reminder:'+r.member:r.kind==='notice'?'notice:'+r.data.key:r.kind==='subscription'&&r.data.hash?'hash:'+r.data.hash:null;
  if(identity){if(unique.has(identity))fail('Duplicate schedule coordination setting or capability');unique.add(identity);}
  if(r.kind==='subscription'&&(subscriptionCounts.get(r.member)??0)>20)fail('Too many calendar subscriptions');
  const d=r.data,keys=(names:string[])=>Object.keys(d).sort().join()===names.sort().join();
  if(r.kind==='swap'){
   if(!keys(['schedule','scheduleRevision','substitute','role','start','end','status','approved','override'])||typeof d.schedule!=='string'||!Number.isSafeInteger(d.scheduleRevision)||!state.members.some(m=>m.id===d.substitute)||!['primary','backup'].includes(d.role)||!Number.isFinite(Date.parse(d.start))||!Number.isFinite(Date.parse(d.end))||Date.parse(d.end)<=Date.parse(d.start)||!['pending','accepted','declined','cancelled'].includes(d.status)||typeof d.approved!=='boolean'||d.override!==null&&typeof d.override!=='string')fail('Invalid swap custody');
  }else if(r.kind==='subscription'){
   if(!keys(['scope','target','hash'])||!['schedule','service','own'].includes(d.scope)||typeof d.target!=='string'||!(d.hash===null&&!r.active||typeof d.hash==='string'&&/^[a-f0-9]{64}$/.test(d.hash)))fail('Invalid calendar subscription');
  }else if(r.kind==='reminder'){
   if(!keys(['leadMinutes','channel'])||!Number.isSafeInteger(d.leadMinutes)||d.leadMinutes<0||d.leadMinutes>10080||!['email','sms','voice','push'].includes(d.channel))fail('Invalid reminder setting');
  }else if(r.kind==='policy'){
   if(!keys(['schedule','swapApproval'])||typeof d.schedule!=='string'||!['none','admin'].includes(d.swapApproval))fail('Invalid swap approval policy');
  }else if(r.kind==='notice'){
   const o=d.obligation;if(!keys(['key','schedule','service','obligation'])||typeof d.key!=='string'||typeof d.schedule!=='string'||typeof d.service!=='string'||!o||Object.keys(o).sort().join()!==['id','reason','state','paging','automatic','label','target','urgency','creator','at','outcome'].sort().join()||o.reason!=='schedule-change'||o.paging!=='off'||o.automatic!==false||o.label!=='no sender'||o.state!=='recorded'||!o.target||Object.keys(o.target).sort().join()!=='id,kind'||o.target.kind!=='user'||o.target.id!==r.member||!(state.members.some(m=>m.id===o.creator)||state.apiClients?.some(client=>client.id===o.creator))||o.urgency!=='low'||!Number.isFinite(Date.parse(o.at))||o.outcome!=='not deliverable: no verified channel; no sender')fail('Invalid schedule-change obligation');
  }else fail('Invalid schedule record kind');
 }
}
