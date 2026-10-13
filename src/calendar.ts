import { preview, type Schedule, type CoverageMember } from './family/response-operations/schedules'

const escape=(text:string)=>text.replaceAll('\\','\\\\').replaceAll('\n','\\n').replaceAll(',','\\,').replaceAll(';','\\;').replaceAll('\r','')
const date=(at:number)=>new Date(Math.floor(at/1000)*1000).toISOString().replace(/[-:]/g,'').replace('.000','')
// Fold by UTF-8 octets, so non-ASCII names remain valid calendar text.
const fold=(line:string)=>{const rows:string[]=[];let current='';for(const char of line){if(new TextEncoder().encode(current+char).length>73){rows.push(current);current=' '+char}else current+=char}rows.push(current);return rows.join('\r\n')}
export function calendar(schedule:Schedule,members:(CoverageMember & {name?:string})[],from:number,to:number):string {
  const rows=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Oncall//Schedules//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH',`X-WR-CALNAME:${escape(schedule.name)}`]
  const windows=preview(schedule,members,from,to)
  for(let index=0;index<windows.length;index++) for(const role of ['primary','backup'] as const) {
    const value=windows[index],end=Math.min(to,windows[index+1]?.at??to),member=value[role]
    const name=member?members.find(m=>m.id===member)?.name??member:'Coverage gap'
    rows.push('BEGIN:VEVENT',`UID:${escape(schedule.id)}-${role}-${value.at}@oncall.local`,`DTSTAMP:${date(from)}`,`DTSTART:${date(value.at)}`,`DTEND:${date(end)}`,`SUMMARY:${escape(schedule.name)} / ${role}: ${escape(name)}`,`DESCRIPTION:${escape(`Paging OFF. ${schedule.timezone}. ${value.warnings.join('; ')}`)}`,'END:VEVENT')
  }
  return rows.map(fold).join('\r\n')+'\r\n'
}
