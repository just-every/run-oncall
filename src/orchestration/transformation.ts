import {labelsForEvent} from './correlation.ts';
import {fail,type Alert,type Decision,type Policy,type Signal,type State} from '../family/response-operations/domain.ts';
type Severity=Signal['severity'];
type Priority='P1'|'P2'|'P3'|'P4'|'P5';
export type Transformation={field:string;values:Record<string,{severity?:Severity;priority?:Priority}>;allowLowering:boolean;reason:string};
export type TransformationDecision={event:string;field:string;matched:boolean;originalSeverity:Severity;originalPriority:Priority|null;severity:Severity;priority:Priority|null;lowering:boolean;blocked:boolean;reason:string};
const severities=['info','warning','critical'];
const priorities=['P5','P4','P3','P2','P1'];
export function validateTransformation(value:any):Transformation {
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).sort().join(',')!=='allowLowering,field,reason,values'||typeof value.field!=='string'||! /^(severity|priority|labels\.[a-zA-Z0-9_.-]{1,64})$/.test(value.field)||typeof value.allowLowering!=='boolean'||typeof value.reason!=='string'||!value.reason.trim()||value.reason.length>300)fail('Transformation needs a declared severity, priority or label, an explicit lowering choice and a reason');
 if(!value.values||typeof value.values!=='object'||Array.isArray(value.values)||Object.keys(value.values).length<1||Object.keys(value.values).length>30)fail('Transformation needs 1–30 declared values');
 for(const [key,result] of Object.entries(value.values) as [string,any][]){
  if(!key||key.length>200||!result||typeof result!=='object'||Array.isArray(result)||!Object.keys(result).length||Object.keys(result).some(k=>!['severity','priority'].includes(k))||result.severity!==undefined&&!severities.includes(result.severity)||result.priority!==undefined&&!priorities.includes(result.priority))fail('Invalid transformation value');
 }
 return structuredClone(value);
}
export function transform(state:State,signal:Signal,policy:Policy,event:string,labels?:Record<string,string>):TransformationDecision|undefined {
 const rule=policy.transformation;if(!rule)return;
 const originalPriority=signal.priority??null,key=rule.field==='severity'?signal.severity:rule.field==='priority'?originalPriority:labels&&Object.hasOwn(labels,rule.field.slice(7))?labels[rule.field.slice(7)]:undefined;
 const selected=key!==null&&key!==undefined&&Object.hasOwn(rule.values,key)?rule.values[key]:undefined;
 let severity=selected?.severity??signal.severity,priority=selected?.priority??originalPriority;
 const lowering=severities.indexOf(severity)<severities.indexOf(signal.severity)||priority!==null&&originalPriority!==null&&priorities.indexOf(priority)<priorities.indexOf(originalPriority);
 let blocked=false;
 if(!rule.allowLowering){if(severities.indexOf(severity)<severities.indexOf(signal.severity)){severity=signal.severity;blocked=true;}if(priority!==null&&originalPriority!==null&&priorities.indexOf(priority)<priorities.indexOf(originalPriority)){priority=originalPriority;blocked=true;}}
 const open=state.alerts.find(a=>a.state==='active'&&a.source===signal.source&&a.service===signal.service&&a.environment===signal.environment&&a.key===signal.key&&a.generation===signal.generation);
 if(open){const floor=alertSeverity(state,open);if(severities.indexOf(severity)<severities.indexOf(floor)){severity=floor;blocked=true;}if(open.priority&&(priority===null||priorities.indexOf(priority)<priorities.indexOf(open.priority))){priority=open.priority;blocked=true;}}
 return {event,field:rule.field,matched:!!selected,originalSeverity:signal.severity,originalPriority,severity,priority,lowering,blocked,reason:`${rule.reason}; service rule v${policy.version}; ${selected?'declared value matched':'no declared value matched'}; ${blocked?'lowering held at source or open-alert floor':lowering?'explicit versioned lowering':'severity/priority retained or raised'}`};
}
export function alertSeverity(state:State,alert:Alert):Severity {
 return (['critical','warning','info'] as const).find(v=>alert.events.some(id=>{const e=state.events.find(e=>e.id===id);return e&&(e.decision.transformation?.severity??e.severity)===v;}))??'critical';
}
export function validateTransformationEvents(state:State){
 for(const event of state.events){
  const policy=event.routingSnapshot.policies.find(p=>p.id===event.decision.policy&&p.version===event.decision.version),value=event.decision.transformation;
  if(!policy?.transformation){if(value)fail('Unexpected transformation explanation');continue;}
  if(event.decision.action==='unmatched'&&!value)continue;
  if(!value||value.event!==event.id||value.originalSeverity!==event.severity||value.originalPriority!==(event.priority??null)||value.field!==policy.transformation.field||!severities.includes(value.severity)||value.priority!==null&&!priorities.includes(value.priority)||typeof value.matched!=='boolean'||typeof value.lowering!=='boolean'||typeof value.blocked!=='boolean'||typeof value.reason!=='string'||value.reason.length>600||!value.reason.startsWith(policy.transformation.reason+'; service rule v'+policy.version+';')||Object.keys(value).sort().join(',')!=='blocked,event,field,lowering,matched,originalPriority,originalSeverity,priority,reason,severity')fail('Invalid frozen transformation explanation');
  const expected=transform({...state,alerts:[]},event,policy,event.id,labelsForEvent(state,event))!;
  if(value.field!==expected.field||value.matched!==expected.matched||value.lowering!==expected.lowering||!value.blocked&&Object.keys(expected).some(key=>(value as any)[key]!==(expected as any)[key])||value.blocked&&(severities.indexOf(value.severity)<severities.indexOf(expected.severity)||expected.priority!==null&&(value.priority===null||priorities.indexOf(value.priority)<priorities.indexOf(expected.priority))))fail('Transformation does not match its frozen rule');
 }
}
