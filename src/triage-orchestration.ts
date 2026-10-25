import {coordinateAlert} from './triage-alerts.ts';
import {authority,command,fail,type Incident,type Alert,type Member,type State} from './family/response-operations/domain.ts';
import {matchingItems,type BulkResult} from './family/response-operations/triage.ts';
type Selected={id:string;revision:number;kind?:string};
export type CoordinationTask={id:string;source:string;revision:number;index:number;step:'reassign'|'declare'|'notify'};
/** Version 1 expands the saved selection into two ordered steps in existing oc_triage custody. */
export const coordinationTasks=(items:Selected[],reassign=false):CoordinationTask[]=>items.flatMap((item,index)=>[
 ...(reassign?[{id:`step:${index}:reassign`,source:item.id,revision:item.revision,index,step:'reassign' as const}]:[]),
 {id:`step:${index}:declare`,source:item.id,revision:item.revision+(reassign?1:0),index,step:'declare' as const},
 {id:`step:${index}:notify`,source:item.id,revision:item.revision,index,step:'notify' as const},
]);
export function validateCoordination(state:State,actor:Member,input:any){
 authority(state,actor);
 if(!Array.isArray(input.items)||!input.items.length||input.items.length>25||new Set(input.items.map((item:any)=>item?.id)).size!==input.items.length||input.items.some((item:any)=>!item||item.kind!=='alert'||typeof item.id!=='string'||!Number.isSafeInteger(item.revision)||item.revision<1)||input.confirmedCount!==input.items.length||input.allMatching)fail('Confirm 1–25 selected alerts for this recorded workflow',409);
 if(!state.members.some(member=>member.id===input.member&&member.active&&['admin','responder'].includes(member.role)))fail('Choose a current responder for the recorded notification',409);
 if(typeof input.reason!=='string'||!input.reason.trim()||input.reason.length>1000)fail('Provide a bounded workflow reason',409);
}
export function applyCoordinationStep(state:State,actor:Member,task:CoordinationTask,member:string,reason:string,results:BulkResult[],operationId:string,at:string,templateVersion?:number|null):Incident|Alert{
 authority(state,actor);
 if(task.step==='reassign')return coordinateAlert(state,actor,{id:task.source,revision:task.revision,action:'reassign',member,reason,operationId},at);
 if(task.step==='declare'){
  const alert=state.alerts.find(row=>row.id===task.source);
  if(!alert)fail('Selected alert is no longer retained',409);
  if((alert.revision??1)!==task.revision)fail('Selected alert changed; review a new workflow',409);
  if(alert.service===null||alert.state!=='active'||alert.coordination?.state==='closed')fail('Declaration requires an active service-bound alert',409);
  const selected=matchingItems(state,actor,{kind:'alerts'}).find(row=>row.id===alert.id);if(!selected)fail('Selected alert already belongs to an incident',409);
  const service=state.services.find(s=>s.id===alert.service)!,history=service.incidentTemplates;
  if(templateVersion!==undefined)service.incidentTemplates=templateVersion===null?undefined:history?.filter(t=>t.version<=templateVersion);
  try {return command(state,actor,{type:'declare',service:alert.service,alerts:[alert.id],title:selected.title,summary:'Declared from a selected alert by a recorded coordination workflow; impact requires human assessment.',severity:selected.severity},at) as Incident;}finally{if(templateVersion!==undefined){if(history===undefined)delete service.incidentTemplates;else service.incidentTemplates=history;}}
 }
 const declared=results.find(result=>result.id===`step:${task.index}:declare`&&result.ok&&result.kind==='workflow');
 if(!declared?.incident)fail('Declaration did not commit; no responder obligation was recorded',409);
 const incident=state.incidents.find(row=>row.id===declared.incident);
 if(!incident||incident.revision!==declared.revision)fail('Declared incident changed; review before recording a notification',409);
 // Named users need no escalation-policy lookup. This is OC-068's existing recorded obligation, never a sender.
 return command(state,actor,{type:'request-responders',incident:incident.id,revision:incident.revision,users:[member],message:reason},at) as Incident;
}
export function coordinationPreview(state:State,actor:Member,input:any){
 validateCoordination(state,actor,input);
 let working=structuredClone(state);const results:BulkResult[]=[],comparison:any[]=[];
 for(const task of coordinationTasks(input.items)){
  const proposed=structuredClone(working);
  try{
   const incident=applyCoordinationStep(proposed,actor,task,input.member,input.reason,results,'preview',new Date().toISOString()) as Incident;
   results.push({id:task.id,ok:true,revision:incident.revision,kind:'workflow',step:task.step,incident:incident.id});working=proposed;
   comparison.push({position:comparison.length+1,alert:task.source,step:task.step,ok:true,...(task.step==='declare'?{service:incident.service,templateVersion:incident.template?.version??null,checklist:incident.template?.checklist.map(({id,text})=>({id,text}))??[]}:{member:input.member,obligation:'recorded',label:'no sender',paging:'OFF',automatic:false})});
  }catch(error){
   results.push({id:task.id,ok:false,kind:'workflow',step:task.step,error:error instanceof Error?error.message:'Step refused'});
   comparison.push({position:comparison.length+1,alert:task.source,step:task.step,ok:false,error:error instanceof Error?error.message:'Step refused'});
  }
 }
 return {version:1,effects:false,comparison};
}
