import {fail} from '../family/response-operations/domain'
import {canonicalJson,sha256} from '../modules/import-kit/src/provenance/identity'
import type {Json, ParsedRecord} from '../modules/import-kit/src/types'

const page=(value:Json):value is Record<string,Json>=>!!value&&typeof value==='object'&&!Array.isArray(value)&&Object.hasOwn(value,'results')

/** A partial list must never look like a complete set of schedule dependencies. */
export function validateGrafanaPages(kind:string,response:Json) {
 const pages=Array.isArray(response)?response:[response]
 if(!pages.some(page))return // Saved detail responses are bare objects.
 const first=pages[0], count=page(first)?first.count:undefined
 let records=0
 for(const [index,item] of pages.entries()) {
  if(!page(item)||!Array.isArray(item.results)||item.count!==count||
   (item.current_page_number!==undefined&&item.current_page_number!==index+1)||
   (index===0?item.previous!==null:typeof item.previous!=='string'||!item.previous)||
   (index===pages.length-1?item.next!==null:typeof item.next!=='string'||!item.next))
   fail(`Grafana OnCall ${kind}: save all list pages in order, or use individual detail responses. Nothing was imported.`)
  records+=item.results.length
 }
 if(records!==count)fail(`Grafana OnCall ${kind}: saved list pages do not contain the reported number of records. Save every page and preview again. Nothing was imported.`)
}

type SavedRecord=Pick<ParsedRecord,'kind'|'sourceId'|'payload'>
export function grafanaShiftRows(original:any,shifts:SavedRecord[]) {
 const ids=Array.isArray(original?.shifts)?original.shifts:[]
 return shifts.filter(shift=>ids.includes(shift.sourceId)||typeof original?.id==='string'&&(shift.payload as any)?.schedule===original.id)
}

/** Bind schedule fingerprints to the shift definitions and person IDs they depend on. */
export function grafanaRecords(records:ParsedRecord[]):ParsedRecord[] {
 const people=new Map<string,string>(), shifts=records.filter(row=>row.kind==='on_call_shifts'), seen=new Set<string>()
 for(const row of records) {
  const value=row.payload as any, key=JSON.stringify([row.kind,row.sourceId])
  if(seen.has(key))fail(`Grafana OnCall ${row.kind} ${value?.name??row.sourceId}: duplicate source ID ${row.sourceId}; keep one response per object. Nothing was imported.`)
  seen.add(key)
  if(row.kind==='users'&&typeof value?.id==='string'&&typeof value.email==='string')people.set(value.id,value.email)
 }
 const digests=new Map(shifts.map(shift=>{
  const slots=(shift.payload as any)?.rolling_users
  const users=Array.isArray(slots)?slots.flat().filter((id:unknown):id is string=>typeof id==='string'):[]
  return [shift.sourceId,sha256(canonicalJson([shift.payload,users.map((id:string)=>people.get(id)??null)]))]
 }))
 return records.map(row=>{
  if(row.kind!=='schedules')return row
  const original=row.payload as any
  const related=grafanaShiftRows(original,shifts).map(shift=>digests.get(shift.sourceId)!).sort()
  return {...row,payload:{name:original?.name??row.sourceId,original,shiftDigest:sha256(canonicalJson(related))}}
 })
}
