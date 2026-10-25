import {fail,type Decision,type Event,type Policy,type Signal,type State} from '../family/response-operations/domain.ts';
export type CorrelationRule={field:string;windowSeconds:number;includeDependencies:boolean;flappingCount:number};
export type CorrelationDecision={group:string|null;originalEvent:string|null;originalPolicy:string|null;originalVersion:number|null;field:string;windowSeconds:number;startedAt:string;relationship:'service'|'dependency'|'unmatched';held:boolean;occurrences:number;reason:string};
const fields=['field','windowSeconds','includeDependencies','flappingCount'];
export function validateCorrelation(value:any):CorrelationRule {
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==fields.length||fields.some(k=>!Object.hasOwn(value,k))||typeof value.field!=='string'||! /^(key|title|labels\.[a-zA-Z0-9_.-]{1,64})$/.test(value.field)||!Number.isSafeInteger(value.windowSeconds)||value.windowSeconds<1||value.windowSeconds>86400||typeof value.includeDependencies!=='boolean'||!Number.isSafeInteger(value.flappingCount)||value.flappingCount!==0&&(value.flappingCount<2||value.flappingCount>100))fail('Grouping needs a declared key/title/label, a 1–86400 second window, dependency choice and flapping count 0 or 2–100');
 return {field:value.field,windowSeconds:value.windowSeconds,includeDependencies:value.includeDependencies,flappingCount:value.flappingCount};
}
/** Use existing bounded provider context; never copy label values into grouping metadata. */
export function correlationLabels(value:any):Record<string,string> {
 const labels:Record<string,string>={},ambiguous=new Set<string>();
 const put=(key:string,value:unknown)=>{if(!/^[a-zA-Z0-9_.-]{1,64}$/.test(key)||typeof value!=='string'||!value||value.length>200||/secret|token|password|authorization|cookie|credential|signature/i.test(key))return;if(Object.hasOwn(labels,key)&&labels[key]!==value)ambiguous.add(key);else Object.defineProperty(labels,key,{value,enumerable:true,configurable:true});};
 for(const map of [value?.labels,value?.custom_details,value?.details?.labels])if(map&&typeof map==='object'&&!Array.isArray(map))for(const [key,v] of Object.entries(map))put(key,v);
 const tags=Array.isArray(value?.tags)?value.tags:typeof value?.tags==='string'?value.tags.split(','):[];
 for(const tag of tags)if(typeof tag==='string'){const colon=tag.indexOf(':');if(colon>0)put(tag.slice(0,colon).trim(),tag.slice(colon+1).trim());}
 for(const key of ambiguous)delete labels[key];return labels;
}
export function labelsForEvent(state:State,event:Event){const receipt=state.intakeReceipts?.find(r=>r.event===event.id);return {...correlationLabels(receipt?.details),...correlationLabels(receipt?.routingInput)};}
export function correlate(state:State,signal:Signal,policy:Policy,decision:Decision,id:string,labels?:Record<string,string>):Decision {
 const rule=policy.correlation!;const time=Date.parse(signal.observedAt),service=state.services.find(s=>s.id===signal.service)!;
 const eventById=new Map(state.events.map(e=>[e.id,e])),receiptByEvent=new Map((state.intakeReceipts??[]).filter(r=>r.event).map(r=>[r.event,r]));
 const retainedLabels=(event:Event)=>{const receipt=receiptByEvent.get(event.id);return {...correlationLabels(receipt?.details),...correlationLabels(receipt?.routingInput)};};
 const same=(event:Event)=>event.source===signal.source&&event.eventId===signal.eventId;
 const value=(event:Signal,provided?:Record<string,string>)=>{if(rule.field==='key')return event.key;if(rule.field==='title')return event.title;const labels=provided??retainedLabels(event as Event),name=rule.field.slice(7);return Object.hasOwn(labels,name)?labels[name]:undefined;};
 const match=value(signal,labels??(state.events.find(same)?retainedLabels(state.events.find(same)!):{}));
 const related=(event:Event)=>event.environment===signal.environment&&(event.service===signal.service||rule.includeDependencies&&(service?.dependencies?.includes(event.service)||state.services.find(s=>s.id===event.service)?.dependencies?.includes(signal.service)));
 const candidates=state.events.filter(e=>!same(e)&&e.intent==='trigger'&&related(e)&&e.decision.correlation?.group&&e.decision.correlation.field===rule.field&&e.decision.correlation.windowSeconds===rule.windowSeconds&&value(e)===match);
 const eligible=candidates.flatMap(e=>{const root=eventById.get(e.decision.correlation!.originalEvent!);return root&&time>=Date.parse(root.observedAt)&&time<Date.parse(root.observedAt)+rule.windowSeconds*1000?[root]:[];}).sort((a,b)=>a.observedAt.localeCompare(b.observedAt)||a.acceptedAt.localeCompare(b.acceptedAt)||a.id.localeCompare(b.id));
 const root=match===undefined?undefined:eligible[0];
 const generations=new Set(state.events.filter(e=>!same(e)&&e.source===signal.source&&e.key===signal.key&&e.intent==='trigger'&&Date.parse(e.observedAt)<=time&&Date.parse(e.observedAt)>time-rule.windowSeconds*1000).map(e=>e.generation));if(signal.intent==='trigger')generations.add(signal.generation);
 const recovered=new Set(state.events.filter(e=>e.source===signal.source&&e.key===signal.key&&e.intent==='recover'&&Date.parse(e.observedAt)<=time&&Date.parse(e.observedAt)>time-rule.windowSeconds*1000).map(e=>e.generation));
 const completed=[...generations].filter(g=>g!==signal.generation).every(g=>recovered.has(g));
 const held=completed&&match!==undefined&&signal.intent==='trigger'&&rule.flappingCount>0&&generations.size>=rule.flappingCount&&decision.owner!==null;
 const group=match===undefined||signal.intent==='recover'&&!root?null:root?.id??id,relationship=group===null?'unmatched':root&&root.service!==signal.service?'dependency':'service';
 const reason=match===undefined?`Declared ${rule.field} is missing or ambiguous; signal remains visible`:group===null?'Recovery is outside an eligible correlation window; its own generation remains visible':root?`Joined original event ${root.id}: ${rule.field} matches inside its ${rule.windowSeconds}s event-time window; original service rule v${root.decision.version}, current v${policy.version}${relationship==='dependency'?'; declared direct dependency '+root.service+' at workspace revision '+state.revision:''}`:`Started group ${id}: no eligible original inside the ${rule.windowSeconds}s event-time window`;
 const correlation:CorrelationDecision={group,originalEvent:group,originalPolicy:group===null?null:root?.decision.policy??policy.id,originalVersion:group===null?null:root?.decision.version??policy.version,field:rule.field,windowSeconds:rule.windowSeconds,startedAt:root?.observedAt??signal.observedAt,relationship,held,occurrences:generations.size,reason:reason+(held?`; flapping held: ${generations.size} trigger generations; no automatic sender`:'')};
 return {...decision,...(held?{action:'suppress' as const}:{}),correlation};
}
export function validateCorrelationDecision(value:any){
 const keys=['group','originalEvent','originalPolicy','originalVersion','field','windowSeconds','startedAt','relationship','held','occurrences','reason'];
 if(!value||Object.keys(value).length!==keys.length||keys.some(k=>!Object.hasOwn(value,k))||!['service','dependency','unmatched'].includes(value.relationship)||typeof value.held!=='boolean'||!Number.isSafeInteger(value.occurrences)||value.occurrences<0||value.occurrences>10000||typeof value.reason!=='string'||value.reason.length>1000||typeof value.startedAt!=='string'||!Number.isFinite(Date.parse(value.startedAt))||new Date(value.startedAt).toISOString()!==value.startedAt||! /^(key|title|labels\.[a-zA-Z0-9_.-]{1,64})$/.test(value.field)||!Number.isSafeInteger(value.windowSeconds)||value.windowSeconds<1||value.windowSeconds>86400)fail('Invalid correlation explanation');
 for(const key of ['group','originalEvent','originalPolicy'])if(value[key]!==null&&(typeof value[key]!=='string'||!value[key]||value[key].length>500))fail('Invalid correlation identity');
 if(value.originalVersion!==null&&(!Number.isSafeInteger(value.originalVersion)||value.originalVersion<1)||value.group!==value.originalEvent||(value.group===null)!==(value.originalVersion===null)||(value.group===null)!==(value.originalPolicy===null))fail('Invalid original correlation version');
}

export function validateCorrelationEvents(state:State){
 const events=new Map(state.events.map(e=>[e.id,e]));
 for(const event of state.events){const value=event.decision.correlation;if(!value)continue;
  const policy=event.routingSnapshot.policies.find(p=>p.id===event.decision.policy&&p.version===event.decision.version);
  if(!policy?.correlation||value.field!==policy.correlation.field||value.windowSeconds!==policy.correlation.windowSeconds||value.held&&(event.decision.action!=='suppress'||!event.decision.owner))fail('Invalid frozen correlation policy');
  if(value.group===null)continue;
  const root=events.get(value.originalEvent!);
  if(!root||root.intent!=='trigger'||root.decision.correlation?.group!==root.id||root.observedAt!==value.startedAt||root.environment!==event.environment||value.originalPolicy!==root.decision.policy||value.originalVersion!==root.decision.version||Date.parse(event.observedAt)<Date.parse(root.observedAt)||Date.parse(event.observedAt)>=Date.parse(root.observedAt)+value.windowSeconds*1000||value.relationship!==(root.service===event.service?'service':'dependency')||root.service!==event.service&&!policy.correlation.includeDependencies)fail('Invalid correlation original or event-time window');
 }
}
