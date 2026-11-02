import {fail} from '../family/response-operations/domain.ts';
import {resolveLocal} from '../family/response-operations/schedules.ts';
import type {PTO} from './layers.ts';
export type ICSResult={entries:PTO[];refused:{line:number;reason:string}[]};
/** A bounded local parser. Unknown properties are refused rather than followed or executed. */
export async function parsePTO(content:unknown,member:string,timezone:string,existing:PTO[]=[]):Promise<ICSResult> {
 if(typeof content!=='string'||new TextEncoder().encode(content).length>32768)fail('ICS maximum is 32768 bytes');
 const lines:{line:number;text:string}[]=[];
 for(const [index,text] of content.replaceAll('\r\n','\n').split('\n').entries()){
  if(/^[ \t]/.test(text)){if(!lines.length)fail('ICS line 1: folded line has no predecessor');lines[lines.length-1].text+=text.slice(1);}
  else if(text)lines.push({line:index+1,text});
 }
 if(lines[0]?.text!=='BEGIN:VCALENDAR'||lines.at(-1)?.text!=='END:VCALENDAR')fail('ICS line 1: expected a VCALENDAR envelope');
 const entries:PTO[]=[],refused:ICSResult['refused']=[];let event:{line:number;fields:Map<string,{params:string;value:string;line:number}>;bad:boolean}|null=null;
 const reject=(line:number,reason:string)=>{refused.push({line,reason});if(event)event.bad=true;};
 function timestamp(raw:{params:string;value:string;line:number}):number {
  const {params,value,line}=raw;
  let local:string,zone=timezone,seconds=0;
  if(params===';VALUE=DATE'){
   if(!/^\d{8}$/.test(value))throw Error('expected an all-day date');
   local=value.slice(0,4)+'-'+value.slice(4,6)+'-'+value.slice(6,8)+'T00:00';
  }else{
   if(!/^\d{8}T\d{6}Z?$/.test(value))throw Error('expected a UTC or TZID timestamp');
   seconds=Number(value.slice(13,15));if(seconds>59)throw Error('seconds must be from 00 through 59');
   if(value.endsWith('Z')){if(params)throw Error('UTC timestamps cannot also specify TZID');zone='UTC';}
   else {const match=/^;TZID=(?:"([^"]+)"|([^";]+))$/.exec(params);if(!match)throw Error('timed events require UTC or a named TZID');zone=match[1]??match[2];if(!/^(?:UTC|[A-Za-z_]+(?:\/[A-Za-z0-9_+-]+)+)$/.test(zone))throw Error('use a named TZID');}
   local=value.slice(0,4)+'-'+value.slice(4,6)+'-'+value.slice(6,8)+'T'+value.slice(9,11)+':'+value.slice(11,13);
  }
  const at=resolveLocal(local,zone,'reject');if(at===null)throw Error('local time is skipped or repeated; use UTC');
  return at+seconds*1000;
 }
 for(const row of lines.slice(1,-1)){
  if(row.text==='BEGIN:VEVENT'){if(event)fail('ICS line '+row.line+': nested event refused');if(entries.length+refused.length>=100)fail('ICS maximum is 100 events');event={line:row.line,fields:new Map(),bad:false};continue;}
  if(row.text==='END:VEVENT'){
   if(!event)fail('ICS line '+row.line+': unexpected event end');
   const current=event;
   if(!current.fields.has('DTSTART')||!current.fields.has('DTEND'))reject(current.line,'event requires DTSTART and DTEND');
   if(!current.bad){
    try{
     const first=current.fields.get('DTSTART')!,last=current.fields.get('DTEND')!;
     if((first.params===';VALUE=DATE')!==(last.params===';VALUE=DATE'))throw Error('start and end must use the same date kind');
     const start=timestamp(first),end=timestamp(last);if(end<=start)throw Error('end must follow start');
     const key=JSON.stringify([member,start,end]),hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(key));
     const id='pto-'+[...new Uint8Array(hash)].map(n=>n.toString(16).padStart(2,'0')).join('');
     if(entries.some(e=>e.id===id))throw Error('duplicate event');if(existing.some(e=>e.id===id))throw Error('PTO interval is already stored');
     entries.push({id,member,start:new Date(start).toISOString(),end:new Date(end).toISOString(),reason:''});
    }catch(error){reject(current.fields.get('DTSTART')!.line,error instanceof Error?error.message:'invalid dates');}
   }
   event=null;continue;
  }
  const match=/^([A-Z]+)((?:;[^:]*)?):(.*)$/.exec(row.text);
  if(!match){reject(row.line,'malformed property');continue;}
  const [,name,params,value]=match;
  if(!event){if(!['VERSION','PRODID','CALSCALE','METHOD'].includes(name)||params)reject(row.line,'only VEVENT calendars are supported');continue;}
  if(!['UID','DTSTAMP','DTSTART','DTEND','SUMMARY','DESCRIPTION','STATUS','TRANSP'].includes(name)){reject(row.line,'unsupported property '+name);continue;}
  if(event.fields.has(name)){reject(row.line,'duplicate property '+name);continue;}
  if(!['DTSTART','DTEND'].includes(name)&&params){reject(row.line,'unsupported property parameters');continue;}
  if(name==='STATUS'&&value!=='CONFIRMED')reject(row.line,'only confirmed PTO events are supported');
  event.fields.set(name,{params,value,line:row.line});
 }
 if(event)fail('ICS line '+event.line+': missing event end');
 return {entries,refused};
}
