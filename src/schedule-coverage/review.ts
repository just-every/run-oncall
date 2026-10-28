import { fail, type State } from '../family/response-operations/domain.ts';
import { preview, validateSchedule, type Schedule, type Coverage } from '../family/response-operations/schedules.ts';
import { canonical } from '../paging-store.ts';

export type ChangeInterval = {start:number;end:number;role:'primary'|'backup';before:string|null;after:string|null;rule:string;newGap:boolean;closedGap:boolean};
export type ClockChange = {at:number;zone:string;before:string;after:string};
export type ScheduleReview = {digest:string;revision:number;from:number;to:number;intervals:ChangeInterval[];clocks:ClockChange[];coverage:Coverage[];schedule:Schedule;members:{id:string;name:string}[]};

/** Report real zone transitions, including non-hour transitions, without guessing a DST date. */
function clockChanges(zones:string[],from:number,to:number):ClockChange[] {
 const result:ClockChange[]=[];
 for(const zone of new Set(zones)) {
  const formatter=new Intl.DateTimeFormat('en-US',{timeZone:zone,timeZoneName:'longOffset'});
  const offset=(at:number)=>formatter.formatToParts(at).find(p=>p.type==='timeZoneName')!.value;
  for(let left=from;left<to;left+=6*3600000) {
   const right=Math.min(to-1,left+6*3600000),before=offset(left),after=offset(right);
   if(before===after)continue;
   let low=left,high=right;
   while(high-low>1){const middle=Math.floor((low+high)/2);if(offset(middle)===before)low=middle;else high=middle;}
   result.push({at:high,zone,before,after});
  }
 }
 return result.sort((a,b)=>a.at-b.at||a.zone.localeCompare(b.zone));
}

/** The digest binds the complete proposal, retained slots, membership snapshot and evaluated range. No writes. */
export async function reviewSchedule(old:Schedule,input:unknown,state:State,from:number,to:number):Promise<ScheduleReview> {
 const supplied=validateSchedule(input,state);
 if(supplied.id!==old.id||supplied.service!==old.service)fail('Schedule and service identities cannot change');
 if(supplied.revision!==old.revision)fail('Schedule changed; reload and review again',409);
 for(const entry of old.pto??[])if(!supplied.pto?.some(next=>canonical(next)===canonical(entry)))fail('Retained PTO entries cannot be removed or rewritten');
 for(const entry of supplied.pto??[])if(!old.pto?.some(prior=>prior.id===entry.id)&&!state.members.some(member=>member.id===entry.member&&member.active&&['admin','responder'].includes(member.role)))fail('New PTO requires an active responder');
 for(const date of supplied.companyDates??[]){const prior=old.companyDates?.find(item=>item.id===date.id);if(prior&&canonical(prior)!==canonical(date)&&date.revision<=prior.revision)fail('Changed company dates require a newer revision');}
 const schedule=validateSchedule({...supplied,revision:old.revision+1},state);
 const previous=preview(old,state.members,from,to),coverage=preview(schedule,state.members,from,to);
 const boundaries=[...new Set([from,to,...previous.map(w=>w.at),...coverage.map(w=>w.at)])].sort((a,b)=>a-b);
 const intervals:ChangeInterval[]=[];
 let priorIndex=0,nextIndex=0;
 for(let i=0;i<boundaries.length-1;i++) {
  const start=boundaries[i],end=boundaries[i+1];
  while(priorIndex+1<previous.length&&previous[priorIndex+1].at<=start)priorIndex++;
  while(nextIndex+1<coverage.length&&coverage[nextIndex+1].at<=start)nextIndex++;
  for(const role of ['primary','backup'] as const) {
   const before=previous[priorIndex][role],after=coverage[nextIndex][role];
   const window=coverage[nextIndex].windows.find(w=>w.role===role)!;
   const warning=coverage[nextIndex].warnings.filter(w=>w.startsWith(role+':')).join('; ');
   intervals.push({start,end,role,before,after,rule:window.explanation??window.origin+(warning?': '+warning:''),newGap:before!==null&&after===null,closedGap:before===null&&after!==null});
  }
 }
 const clocks=clockChanges([old.timezone,schedule.timezone,...(old.layers??[]).map(l=>l.timezone),...(schedule.layers??[]).map(l=>l.timezone)],from,to);
 if(new TextEncoder().encode(JSON.stringify({intervals,clocks,coverage,schedule})).length>16*1024*1024)fail('Review exceeds maximum 16 MiB; shorten the range or simplify layers');
 const bytes=new TextEncoder().encode(canonical({old,schedule,members:state.members,workspaceRevision:state.revision,from,to,intervals,clocks,coverage}));
 const digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');
 return {digest,revision:old.revision,from,to,intervals,clocks,coverage,schedule,members:state.members.map(({id,name})=>({id,name}))};
}
