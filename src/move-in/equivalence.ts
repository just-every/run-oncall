import {opsFamily} from './vendor-formats'
import {preview,coverage,type Schedule} from '../family/response-operations/schedules'
import type {Vendor} from './source'

/** True when the zone's UTC offset differs anywhere between the two instants. */
export function crossesOffsetChange(zone:string,from:string,to:string) {
 const start=Date.parse(from),end=Date.parse(to),step=Math.max(3*3600e3,Math.ceil((end-start)/5000))
 const offset=(at:number)=>new Intl.DateTimeFormat('en-US',{timeZone:zone,timeZoneName:'longOffset'}).formatToParts(at).find(p=>p.type==='timeZoneName')?.value
 const first=offset(start)
 for(let at=start+step;at<end;at+=step)if(offset(at)!==first)return true
 return offset(end)!==first
}

/** Compare every source and model boundary, not a few sampled instants. */
export function compare(schedule:Schedule,vendor:Vendor,input:any,emails:Map<string,string>) {
 const periods=opsFamily(vendor)?input?.finalTimeline?.rotations?.flatMap((r:any)=>r.periods??[]):input?.rendered_schedule_entries
 if(!Array.isArray(periods)||!periods.length)return {status:'not-supplied',differences:['No final timeline supplied; no incumbent equivalence is claimed.']}
 const validFrom=Date.parse(schedule.validFrom),validUntil=schedule.validUntil?Date.parse(schedule.validUntil):Infinity
 // The incumbent's timeline may begin before the layer Oncall maps (ended layers); only the mapped layer's own validity is compared.
 const all=periods.map((p:any)=>({start:Date.parse(p.startDate??p.start),end:Date.parse(p.endDate??p.end),member:emails.get(String((p.recipient??p.user)?.id))??null})).sort((a:any,b:any)=>a.start-b.start)
 if(all.some((p:any)=>!Number.isFinite(p.start)||!Number.isFinite(p.end)||p.end<=p.start||p.member===null)||all.some((p:any,i:number)=>i&&p.start<all[i-1].end))return {status:'differences',differences:['Invalid, overlapping, team/nested or unknown-recipient source timeline periods.']}
 const slots=all.filter((p:any)=>p.end>validFrom&&p.start<validUntil).map((p:any)=>({...p,start:Math.max(p.start,validFrom),end:Math.min(p.end,validUntil)}))
 if(!slots.length)return {status:'not-supplied',differences:['The supplied timeline lies outside the mapped layer; no incumbent equivalence is claimed.']}
 const from=slots[0].start,to=slots.at(-1)!.end,members=[...new Set(emails.values())].map(id=>({id,active:true,role:'responder'}))
 const model=preview(schedule,members,from,to),boundaries=[...new Set([from,to,...slots.flatMap((p:any)=>[p.start,p.end]),...model.map(v=>v.at)])].sort((a,b)=>a-b)
 const differences:string[]=[]
 for(const at of boundaries.filter(at=>at<to)) {
  const expected=slots.find((p:any)=>p.start<=at&&at<p.end)?.member??null,actual=coverage(schedule,members,at).primary
  if(expected!==actual)differences.push(`${new Date(at).toISOString()}: incumbent ${expected??'gap'}, Oncall ${actual??'gap'}`)
 }
 return {status:differences.length?'differences':'equivalent-in-window',from:new Date(from).toISOString(),to:new Date(to).toISOString(),differences}
}
