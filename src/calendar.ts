import { coverage, preview, type Schedule, type CoverageMember } from './family/response-operations/schedules'

const escape=(text:string)=>text.replaceAll('\\','\\\\').replaceAll('\n','\\n').replaceAll(',','\\,').replaceAll(';','\\;').replaceAll('\r','')
const date=(at:number)=>new Date(Math.floor(at/1000)*1000).toISOString().replace(/[-:]/g,'').replace('.000','')
// Fold by UTF-8 octets, so non-ASCII names remain valid calendar text.
const fold=(line:string)=>{const rows:string[]=[];let current='';for(const char of line){if(new TextEncoder().encode(current+char).length>73){rows.push(current);current=' '+char}else current+=char}rows.push(current);return rows.join('\r\n')}
export function calendar(schedule:Schedule,members:(CoverageMember & {name?:string})[],from:number,to:number,onlyMember?:string,omitWarnings=false):string {
  const rows=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Oncall//Schedules//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH',`X-WR-CALNAME:${escape(schedule.name)}`]
  // A rolling query selects intersecting slots; it must not become their start or end.
  // Walk both roles from their real boundaries so a primary override can also split
  // backup coverage when the same person would otherwise hold both roles.
  const first=coverage(schedule,members,from),last=coverage(schedule,members,to-1)
  const bounded=(w:typeof first.windows[number])=>w.start!==null&&w.end!==null
  const start=Math.max(Date.UTC(2000,0,1),Math.min(from,...first.windows.filter(bounded).map(w=>Date.parse(w.start!))))
  const end=Math.min(Date.UTC(2101,0,1),Math.max(to,...last.windows.filter(bounded).map(w=>Date.parse(w.end!))))
  const windows=[]
  // Long rotations can straddle both ends of the bounded download window.
  for(let at=start;at<end;at+=366*86400000)windows.push(...preview(schedule,members,at,Math.min(end,at+366*86400000)))
  type Event={role:'primary'|'backup';start:number;end:number;member:string|null;slot:string;warnings:string}
  const events:Event[]=[]
  for(const role of ['primary','backup'] as const) {
    let prior:Event|undefined
    for(let index=0;index<windows.length;index++) {
      const value=windows[index],window=value.windows.find(w=>w.role===role)!
      const warnings=value.warnings.filter(w=>w.startsWith(role+':')).join('; ')
      const slot=JSON.stringify([window.start,window.end,window.origin,value[role],warnings])
      const until=windows[index+1]?.at??end
      // Before/after validity, the gap has an open end. Give it stable supported
      // endpoints directly, without evaluating years outside the requested range.
      const open=!bounded(window)
      const eventStart=open?(window.start===null?Date.UTC(2000,0,1):Date.parse(window.start)):value.at
      const eventEnd=open?(window.end===null?Date.UTC(2101,0,1):Date.parse(window.end)):until
      if(prior&&prior.end>=value.at&&prior.slot===slot)prior.end=Math.max(prior.end,eventEnd)
      else {prior={role,start:eventStart,end:eventEnd,member:value[role],slot,warnings};events.push(prior)}
    }
  }
  events.sort((a,b)=>a.start-b.start||(a.role===b.role?0:a.role==='primary'?-1:1))
  for(const event of events) {
    if(event.end<=from||event.start>=to||onlyMember&&event.member!==onlyMember)continue
    const name=event.member?members.find(m=>m.id===event.member)?.name??event.member:'Coverage gap'
    rows.push('BEGIN:VEVENT',`UID:${escape(schedule.id)}-${event.role}-${event.start}@oncall.local`,`DTSTAMP:${date(from)}`,`DTSTART:${date(event.start)}`,`DTEND:${date(event.end)}`,`SUMMARY:${escape(schedule.name)} / ${event.role}: ${escape(name)}`,`DESCRIPTION:${escape(`Paging OFF. ${schedule.timezone}. ${omitWarnings?'':event.warnings}`)}`,'END:VEVENT')
  }
  return rows.map(fold).join('\r\n')+'\r\n'
}
