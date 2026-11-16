import {coverage,type Coverage,type CoverageMember,type Schedule} from '../family/response-operations/schedules';

const roles=['primary','backup'] as const;
const year=366*86400000;

/** Boundaries are evaluation points, not promises of coverage. Keep the immediate
 * boundary API, and separately find the next interval with an eligible holder. */
export function scheduleNowNext(schedule:Schedule,members:CoverageMember[],at:number) {
 const now=coverage(schedule,members,at);
 const next=Object.fromEntries(now.windows.map(window=>[window.role,window.end?coverage(schedule,members,Date.parse(window.end)):null]));
 const upcoming:Record<'primary'|'backup',Coverage|null>={primary:null,backup:null};
 const eligible=new Set(members.filter(member=>member.active&&['admin','responder'].includes(member.role)).map(member=>member.id));
 const possible=roles.filter(role=>{
  const layers=schedule.layers?.filter(layer=>layer.role===role)??[];
  return [...(layers.length?layers.flatMap(layer=>layer.rotation.members):schedule[role].members),...schedule.overrides.filter(override=>override.role===role&&Date.parse(override.end)>at).flatMap(override=>override.member?[override.member]:[])].some(id=>eligible.has(id));
 });
 // The summary's look-ahead is explicit when a potential slot lies beyond it.
 // Empty/ineligible rotations do not need a walk and can never claim coverage.
 const through=Math.min(at+year,Date.UTC(2101,0,1),schedule.validUntil?Date.parse(schedule.validUntil):Infinity);
 let current=now;
 while(possible.some(role=>!upcoming[role])){
  const ends=current.windows.flatMap(window=>window.end&&Date.parse(window.end)>current.at?[Date.parse(window.end)]:[]);
  if(!ends.length)break;
  const boundary=Math.min(...ends);
  if(boundary>=through)break;
  current=coverage(schedule,members,boundary);
  for(const role of possible)if(!upcoming[role]&&current[role])upcoming[role]=current;
 }
 return {now,next,upcoming,searchThrough:new Date(through).toISOString(),limited:possible.filter(role=>!upcoming[role]&&through<Math.min(Date.UTC(2101,0,1),schedule.validUntil?Date.parse(schedule.validUntil):Infinity))};
}
