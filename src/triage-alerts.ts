import {changeAlertUrgency} from './urgency/model.ts';
import {authority,fail,text,type Alert,type Entry,type Member,type State} from './family/response-operations/domain.ts';
export type AlertCoordination={state:'open'|'acknowledged'|'closed';assignee:string|null;snoozeDue:string|null;history:Entry[]};
export function coordinateAlert(state:State,actor:Member,input:any,at:string){
 authority(state,actor);const alert=state.alerts.find(a=>a.id===input.id);if(!alert)fail('Unknown alert-only item',404);
 if(state.incidents.some(i=>i.alerts.includes(alert.id)))fail('Alert belongs to a declared incident; coordinate that incident',409);
 if((alert.revision??1)!==input.revision)fail('Alert changed. Reload before applying your edit.',409);
 const held=alert.coordination??={state:'open',assignee:alert.owner,snoozeDue:null,history:[]};
 if(held.state==='closed'||alert.state==='recovered')fail('Alert-only item is already closed',409);
 if(held.history.length>=10000)fail('Alert coordination history capacity reached',429);
 if(input.action==='acknowledge'){held.state='acknowledged';held.assignee=actor.id;held.snoozeDue=null;}
 else if(input.action==='resolve'){
  held.state='closed';held.snoozeDue=null;
  if(alert.obligation)Object.assign(alert.obligation,{state:'stopped',outcome:'stopped by human resolution',receipt:null});
 }else if(input.action==='reassign'){
  if(input.member!==null&&!state.members.some(m=>m.id===input.member&&m.active&&['admin','responder'].includes(m.role)))fail('Choose an active responder',400);
  held.assignee=input.member;
 }else if(input.action==='set-priority'){
  if(input.priority!==null&&!/^P[1-5]$/.test(input.priority))fail('Choose a priority');alert.priority=input.priority??undefined;
 }else if(input.action==='set-urgency'){
  changeAlertUrgency(state,actor,alert.id,{revision:alert.urgencyRevision??0,urgency:input.urgency,reason:input.reason},at);
 }else if(input.action==='snooze'){
  if(held.state!=='acknowledged')fail('Snooze requires acknowledgment',409);
  if(!Number.isSafeInteger(input.minutes)||input.minutes<1||input.minutes>1440)fail('Snooze must be 1–1440 minutes');held.snoozeDue=new Date(Date.parse(at)+input.minutes*60000).toISOString();
 }else fail('Alert-only items cannot be merged; select declared incidents');
 const reason=input.action==='resolve'?(input.reason===''||input.reason===undefined?'':text(input.reason,'Resolution note',3000)):text(input.reason,'Reason',3000);
 held.history.push({id:crypto.randomUUID(),at,actor:actor.id,kind:'bulk-'+input.action,operationId:input.operationId,text:`${input.action}${reason?': '+reason:''}${input.action==='snooze'?`; due ${held.snoozeDue}, not sent (no timer)`:''}; paging OFF`});
 alert.revision=(alert.revision??1)+1;return alert;
}
export function validateAlertCoordination(state:State,alert:Alert){
 if(alert.revision!==undefined&&(!Number.isSafeInteger(alert.revision)||alert.revision<1))fail('Invalid alert revision');
 const row=alert.coordination;if(row===undefined)return;
 if(!row||Object.keys(row).sort().join()!==['state','assignee','snoozeDue','history'].sort().join()||!['open','acknowledged','closed'].includes(row.state)||row.assignee!==null&&!state.members.some(m=>m.id===row.assignee)||row.snoozeDue!==null&&!Number.isFinite(Date.parse(row.snoozeDue))||!Array.isArray(row.history)||row.history.length>10000)fail('Invalid alert coordination');
 for(const entry of row.history)if(!entry||Object.keys(entry).sort().join()!==['id','at','actor','kind','operationId','text'].sort().join()||typeof entry.id!=='string'||!entry.id||!Number.isFinite(Date.parse(entry.at))||!state.members.some(m=>m.id===entry.actor)||!['bulk-acknowledge','bulk-resolve','bulk-reassign','bulk-set-priority','bulk-set-urgency','bulk-snooze'].includes(entry.kind)||typeof entry.operationId!=='string'||!entry.operationId||typeof entry.text!=='string'||entry.text.length>4000)fail('Invalid alert coordination attribution');
}
