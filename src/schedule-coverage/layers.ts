import {fail} from '../family/response-operations/domain.ts';
import {resolveLocal, type Rotation, type CoverageMember} from '../family/response-operations/schedules.ts';

export type Layer = {id:string;name:string;role:'primary'|'backup';timezone:string;kind:'daily'|'weekly'|'custom'|'business';rotation:Rotation;start:string;end:string|null;weekdays:number[];startHour:number;endHour:number;holidayCalendars:('us-federal'|'company')[];holidayAction:'gap'|'next';ptoAction:'gap'|'next'};
export type CompanyDate = {id:string;name:string;date:string;timezone:string;revision:number};
export type PTO = {id:string;member:string|null;start:string;end:string;reason:string};
const DAY=86400000;
const resolved=new Map<string,number|null>();
function resolveMinute(local:string,zone:string,policy:'earlier'|'later'|'reject') {
 const wall=Date.parse(local+':00Z');if(wall<Date.UTC(2000,0,1)||wall>=Date.UTC(2101,0,1))return null;
 const key=zone+local+policy;
 if(resolved.has(key))return resolved.get(key)!;
 const value=resolveLocal(local,zone,policy);
 if(resolved.size>40000)resolved.clear();resolved.set(key,value);return value;
}
const formats=new Map<string,Intl.DateTimeFormat>();
export function localParts(zone:string,at:number) {
 let f=formats.get(zone);
 if(!f){try{f=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});}catch{fail('Invalid named timezone');}formats.set(zone,f);}
 return Object.fromEntries(f.formatToParts(at).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
}
function exact(v:any,keys:string[],label:string){if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).length!==keys.length||keys.some(k=>!Object.hasOwn(v,k)))fail(label+' has missing or unknown fields');return v;}
function text(v:any,label:string,max=200):string{if(typeof v!=='string'||!v.trim()||v!==v.trim()||v.length>max||/[\r\n]/.test(v))fail('Invalid '+label);return v;}
function zone(v:any){const z=text(v,'timezone',100);if(z!=='UTC'&&!z.includes('/'))fail('Use a named timezone');localParts(z,Date.UTC(2026,0,1));return new Intl.DateTimeFormat('en-US',{timeZone:z}).resolvedOptions().timeZone;}
function instant(v:any){if(typeof v!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(v))fail('Use an exact UTC timestamp');const n=Date.parse(v);if(!Number.isFinite(n)||n<Date.UTC(2000,0,1)||n>=Date.UTC(2101,0,1)||new Date(n).toISOString()!==(v.length===20?v.replace('Z','.000Z'):v))fail('Use a real UTC date in 2000–2100');return new Date(n).toISOString();}
function list(v:any,max:number,label:string):any[]{if(!Array.isArray(v)||v.length>max)fail(label+' exceeds maximum '+max);return v;}
function unique(v:{id:string}[],label:string){if(new Set(v.map(x=>x.id)).size!==v.length)fail('Duplicate '+label);}
export function validateAdditions(value:Record<string,unknown>,rotation:(v:unknown,label:string)=>Rotation,references:string[]) {
 const result:{layers?:Layer[];companyDates?:CompanyDate[];pto?:PTO[]}={};
 if(Object.hasOwn(value,'layers')){
  result.layers=list(value.layers,24,'Layers').map(raw=>{
   const v=exact(raw,['id','name','role','timezone','kind','rotation','start','end','weekdays','startHour','endHour','holidayCalendars','holidayAction','ptoAction'],'Layer');
   if(!['primary','backup'].includes(v.role)||!['daily','weekly','custom','business'].includes(v.kind))fail('Invalid layer role or rotation kind');
   const r=rotation(v.rotation,'layer rotation');
   if(v.kind==='daily'&&r.periodDays!==1||v.kind==='weekly'&&r.periodDays!==7)fail('Daily and weekly layers require matching rotation days');
   const weekdays=list(v.weekdays,7,'Weekdays');if(weekdays.some(d=>!Number.isInteger(d)||d<0||d>6)||new Set(weekdays).size!==weekdays.length)fail('Use unique weekdays from 0 through 6');
   if(!Number.isInteger(v.startHour)||!Number.isInteger(v.endHour)||v.startHour<0||v.endHour>24||v.endHour<=v.startHour)fail('Business hours require an increasing local hour range from 0 through 24');
   const calendars=list(v.holidayCalendars,2,'Holiday selections');if(calendars.some(c=>!['us-federal','company'].includes(c))||new Set(calendars).size!==calendars.length)fail('Invalid holiday selection');
   if(!['gap','next'].includes(v.holidayAction)||!['gap','next'].includes(v.ptoAction))fail('Choose gap or next layer for holidays and PTO');
   const start=instant(v.start),end=v.end===null?null:instant(v.end);if(end!==null&&end<=start)fail('Layer active window must be positive');
   return {id:text(v.id,'layer identifier',100),name:text(v.name,'layer name'),role:v.role,timezone:zone(v.timezone),kind:v.kind,rotation:r,start,end,weekdays,startHour:v.startHour,endHour:v.endHour,holidayCalendars:calendars,holidayAction:v.holidayAction,ptoAction:v.ptoAction};
  });unique(result.layers,'layer identifier');
 }
 if(Object.hasOwn(value,'companyDates')){
  result.companyDates=list(value.companyDates,366,'Company dates').map(raw=>{
   const v=exact(raw,['id','name','date','timezone','revision'],'Company date');
   if(typeof v.date!=='string'||!/^\d{4}-\d\d-\d\d$/.test(v.date)||!Number.isFinite(Date.parse(v.date+'T00:00:00Z'))||new Date(v.date+'T00:00:00Z').toISOString().slice(0,10)!==v.date||v.date<'2000-01-01'||v.date>'2100-12-31')fail('Invalid company date');
   if(!Number.isSafeInteger(v.revision)||v.revision<1)fail('Company date requires a positive revision');
   return {id:text(v.id,'company date identifier',100),name:text(v.name,'company date name'),date:v.date,timezone:zone(v.timezone),revision:v.revision};
  });unique(result.companyDates,'company date identifier');
 }
 if(Object.hasOwn(value,'pto')){
  result.pto=list(value.pto,1000,'PTO entries').map(raw=>{
   const v=exact(raw,['id','member','start','end','reason'],'PTO entry'),start=instant(v.start),end=instant(v.end);
   if(end<=start)fail('PTO must be a positive interval');
   const member=v.member===null?null:text(v.member,'PTO member',100);if(member!==null)references.push(member);
   if(typeof v.reason!=='string'||v.reason.length>500||/[\r\n]/.test(v.reason))fail('PTO reason must be at most 500 characters on one line');
   return {id:text(v.id,'PTO identifier',100),member,start,end,reason:v.reason};
  });unique(result.pto,'PTO identifier');
 }
 return result;
}
function dayString(n:number){return new Date(n).toISOString().slice(0,10);}
/** Federal dates are selected explicitly; weekend fixed dates use the observed weekday. */
export function federalHoliday(date:string):string|null {
 const year=Number(date.slice(0,4));
 for(const y of [year-1,year,year+1]){
  for(const [month,day,name] of [[0,1,'New Year'],[5,19,'Juneteenth'],[6,4,'Independence Day'],[10,11,'Veterans Day'],[11,25,'Christmas']] as const){
   if(y<2021&&month===5)continue;
   const n=Date.UTC(y,month,day),weekday=new Date(n).getUTCDay(),observed=n+(weekday===6?-DAY:weekday===0?DAY:0);
   if(date===dayString(observed))return name;
  }
  for(const [month,weekday,nth,name] of [[0,1,3,'Martin Luther King Day'],[1,1,3,'Washington Birthday'],[4,1,-1,'Memorial Day'],[8,1,1,'Labor Day'],[9,1,2,'Columbus Day'],[10,4,4,'Thanksgiving']] as const){
   const first=Date.UTC(y,month,1),last=Date.UTC(y,month+1,0),n=nth===-1?last-((new Date(last).getUTCDay()-weekday+7)%7)*DAY:first+((weekday-new Date(first).getUTCDay()+7)%7+(nth-1)*7)*DAY;
   if(date===dayString(n))return name;
  }
 }
 return null;
}
export type LayerDecision={name:string;zone:string;kind:Layer['kind'];state:'inactive-window'|'business-off'|'holiday-off'|'company-off'|'pto-next'|'pto-gap'|'unavailable'|'overridden'|'winner';detail:string};
export type LayerResolution={member:string|null;start:number|null;end:number|null;origin:'layer'|'gap';explanation:string;decisions:LayerDecision[]};
/** Every decision boundary is retained, including a losing layer becoming eligible. */
export function layeredWindow(layers:Layer[],dates:CompanyDate[],pto:PTO[],members:CoverageMember[],at:number):LayerResolution {
 let start=-Infinity,end=Infinity,winner:string|null=null,blocked=false;
 const reasons:string[]=[],decisions:LayerDecision[]=[];
 const boundary=(n:number)=>{if(n<=at)start=Math.max(start,n);else end=Math.min(end,n);};
 const eligible=(id:string)=>members.some(m=>m.id===id&&m.active&&['admin','responder'].includes(m.role));
 for(const layer of layers){
  const from=Date.parse(layer.start),until=layer.end?Date.parse(layer.end):Infinity;boundary(from);boundary(until);
  const p=localParts(layer.timezone,at),date=`${p.year}-${p.month}-${p.day}`,wall=Date.parse(date+'T00:00:00Z'),minute=Number(p.hour)*60+Number(p.minute);
  const resolve=(n:number,hour:number)=>resolveMinute(dayString(n)+'T'+String(hour).padStart(2,'0')+':00',layer.timezone,'earlier');
  for(const n of [wall-DAY,wall,wall+DAY,wall+2*DAY])for(const h of [0,layer.startHour,layer.endHour]){const t=resolve(h===24?n+DAY:n,h===24?0:h);if(t!==null)boundary(t);}
  const anchor=Date.parse(layer.rotation.anchorLocal+':00Z'),period=layer.rotation.periodDays*DAY;
  const estimate=Math.floor((wall+minute*60000-anchor)/period);
  const boundaries=Array.from({length:5},(_,n)=>{const index=estimate-2+n;return {index,at:resolveMinute(new Date(anchor+index*period).toISOString().slice(0,16),layer.timezone,layer.rotation.ambiguity)};});
  for(const candidate of boundaries)if(candidate.at!==null)boundary(candidate.at);
  const turn=boundaries.find((candidate,n)=>candidate.at!==null&&candidate.at<=at&&(boundaries[n+1]?.at??-Infinity)>at);
  const index=turn?.index??estimate;
  const record=(state:LayerDecision['state'],detail:string)=>{reasons.push(detail);decisions.push({name:layer.name,zone:layer.timezone,kind:layer.kind,state,detail});};
  const label=`${layer.name} (${layer.timezone}, ${layer.kind})`;
  if(at<from||at>=until){record('inactive-window',label+': outside active window');continue;}
  if(layer.kind==='business'&&(!layer.weekdays.includes(new Date(wall).getUTCDay())||minute<layer.startHour*60||minute>=layer.endHour*60)){record('business-off',label+': off by business hours');continue;}
  const holiday=layer.holidayCalendars.includes('us-federal')?federalHoliday(date):null;
  const company=layer.holidayCalendars.includes('company')?dates.filter(d=>d.timezone===layer.timezone&&d.date===date).map(d=>d.name).join(', '):'';
  if(holiday||company){record(holiday?'holiday-off':'company-off',label+': off by '+(holiday??company)+'; '+(layer.holidayAction==='next'?'try next layer':'explicit gap'));if(winner===null&&!blocked&&layer.holidayAction==='gap')blocked=true;continue;}
  if(!turn){record('unavailable',label+': calendar boundary is skipped or rejected as repeated; slot retained as gap');if(winner===null)blocked=true;continue;}
  const count=layer.rotation.members.length,slot=((index%count)+count)%count,member=layer.rotation.members[slot]??null;
  const absent=pto.filter(entry=>entry.member===member&&entry.member!==null);
  for(const entry of absent){boundary(Date.parse(entry.start));boundary(Date.parse(entry.end));}
  if(absent.some(entry=>Date.parse(entry.start)<=at&&at<Date.parse(entry.end))){record(layer.ptoAction==='next'?'pto-next':'pto-gap',label+': member on PTO; '+(layer.ptoAction==='next'?'try next layer':'explicit gap'));if(winner===null&&!blocked&&layer.ptoAction==='gap')blocked=true;continue;}
  if(!member||!eligible(member)){record('unavailable',label+': unavailable member; slot retained as gap');if(winner===null)blocked=true;continue;}
  if(winner!==null||blocked)record('overridden',label+': overridden by '+(blocked?'an explicit gap':'the earlier eligible layer'));
  else {winner=member;record('winner',label+': wins by first eligible layer precedence');}
 }
 return {member:winner,start:Number.isFinite(start)?start:null,end:Number.isFinite(end)?end:null,origin:winner===null?'gap':'layer',explanation:reasons.join('; '),decisions};
}
