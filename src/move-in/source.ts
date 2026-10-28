import { readFileSource } from '../modules/import-kit/src/readers/file'
import type { Json, ParsedRecord } from '../modules/import-kit/src/types'
import { pagerdutyRecords } from './pagerduty-source'
import { fail } from '../family/response-operations/domain'

import {isVendor, type Vendor} from './vendor-formats'
export type {Vendor} from './vendor-formats'

// The documented single-detail key of each PagerDuty list response.
const detail:Record<string,string>={users:'user',schedules:'schedule',escalation_policies:'escalation_policy',overrides:'override',services:'service',integrations:'integration',teams:'team',incidents:'incident',maintenance_windows:'maintenance_window',business_services:'business_service',event_orchestrations:'orchestration_path'}
// Oncall never accepts a key, token or signing secret, even where the kit's own check would keep it as retained metadata.
const credentialKey=/^(?:password|passwd|secret|token|credentials?|authorization|cookie)$|(?:api|access|auth|integration|routing|service|signing|private|client|refresh|session)[_-]?(?:key|secret|token)$|^webhook[_-]?(?:url|secret)$|(?:http|web)[_-]?cal[_-]?url$/i
const escape=(key:string)=>key.replaceAll('~','~0').replaceAll('/','~1')

function refuseCredentials(value:unknown,pointer:string) {
 if(Array.isArray(value))value.forEach((item,index)=>refuseCredentials(item,`${pointer}/${index}`))
 else if(value&&typeof value==='object')for(const [key,child] of Object.entries(value)) {
  if(credentialKey.test(key))fail(`Credential-bearing field "${key}" at ${pointer}/${escape(key)}: remove it from the saved response; Oncall never accepts keys or tokens`)
  refuseCredentials(child,`${pointer}/${escape(key)}`)
 }
}

type Entry={payload:any;pointer:string}
// One saved response, a list or a single detail, becomes its records. Each element of a bundle value may itself be a saved response.
function entries(vendor:Vendor,kind:string,body:any,pointer:string):Entry[] {
 if(Array.isArray(body))return body.flatMap((item,index)=>entries(vendor,kind,item,`${pointer}/${index}`))
 if(!body||typeof body!=='object')return [{payload:body,pointer}]
 if(vendor==='pagerduty'&&body.data!==undefined)fail(`PagerDuty ${kind} at ${pointer} uses an Opsgenie-shaped data wrapper; choose Opsgenie for this file, or save PagerDuty REST list/detail responses and preview again. Nothing was imported.`)
 let items:any,at=pointer
 if(vendor==='jsm'&&body.values!==undefined)at=`${pointer}/values`,items=body.values
 else if(vendor==='betterstack'&&body.data!==undefined)at=`${pointer}/data`,items=body.data
 else if(vendor==='betterstack'&&kind==='events'&&body.events!==undefined)at=`${pointer}/events`,items=body.events
 else if(vendor==='splunk'&&Array.isArray(body[kind]))at=`${pointer}/${escape(kind)}`,items=body[kind]
 else if(vendor==='splunk'&&kind==='oncall'&&Array.isArray(body.teamsOnCall))at=`${pointer}/teamsOnCall`,items=body.teamsOnCall
 else if(vendor==='opsgenie'&&body.data!==undefined)at=`${pointer}/data`,items=body.data
 else if(vendor==='pagerduty'&&Array.isArray(body[kind]))at=`${pointer}/${escape(kind)}`,items=body[kind]
 else if(vendor==='pagerduty'&&detail[kind]&&body[detail[kind]]&&typeof body[detail[kind]]==='object')at=`${pointer}/${detail[kind]}`,items=body[detail[kind]]
 else return [{payload:body,pointer}]
 // A list of overrides does not name its schedule; the saved file carries it beside the response.
 const parent=body.scheduleId??body.schedule_id,join=(payload:any)=>kind==='overrides'&&parent!==undefined&&payload&&typeof payload==='object'&&payload.scheduleId===undefined&&payload.schedule_id===undefined?{...payload,[vendor==='opsgenie'||vendor==='jsm'?'scheduleId':'schedule_id']:parent}:payload
 return Array.isArray(items)?items.flatMap((payload,index)=>Array.isArray(payload)?entries(vendor,kind,payload,`${at}/${index}`):[{payload:join(payload),pointer:`${at}/${index}`}]):[{payload:join(items),pointer:at}]
}

export async function fileSource(vendor:Vendor,raw:string,filename?:unknown) {
 if(!isVendor(vendor))throw Error('Choose a supported saved-export source')
 if(filename!==undefined&&(typeof filename!=='string'||!filename.trim()||filename.length>255||/[\x00-\x1f\x7f/\\]/.test(filename)))fail('Supply the export filename without a folder path (at most 255 characters)')
 // Preserve the manual door's named credential refusal before the shared
 // reader deliberately replaces parser exceptions with a safe diagnostic.
 const size=new TextEncoder().encode(raw).byteLength
 if(size>512*1024)fail(`The saved export is ${size} bytes, above the 524288-byte (512 KiB) limit; narrow the export and preview again. Nothing was imported or truncated.`,413)
 let parsed:unknown;try{parsed=JSON.parse(raw)}catch{fail('Malformed JSON in the saved export; save a complete JSON response without edits or truncation and preview again. Nothing was imported.')}
 if(parsed&&typeof parsed==='object')refuseCredentials(parsed,'')
 // Run the seed validation outside the kit's safe parser-error wrapper, so the owner gets the exact cause.
 savedExportRecords(vendor,parsed as Json)
 return readFileSource({namespace:vendor,name:typeof filename==='string'?filename:`${vendor}-export.json`,bytes:new TextEncoder().encode(raw),format:'json',parse(value:Json){
  return savedExportRecords(vendor,value)
 }},{maxBytes:512*1024,maxRecordBytes:512*1024,maxRecords:500})
}

/** Both the saved-file UI and Business use the same parser and credential rules. */
export function savedExportRecords(vendor:Vendor,value:Json):ParsedRecord[] {
  if(!value||Array.isArray(value)||typeof value!=='object')throw Error('Export bundle must be an object')
  refuseCredentials(value,'')
  const records:ParsedRecord[]=[],count=new Map<string,number>()
  for(const [kind,response] of Object.entries(value))
   for(const {payload,pointer} of entries(vendor,kind,response,`/${escape(kind)}`)) {
    const index=count.get(kind)??0;count.set(kind,index+1)
    records.push({kind,sourceId:String(payload?.id??payload?.accountId??payload?.alias??payload?.username??payload?.slug??payload?._parent?.id??(kind==='event_orchestrations'?payload?.parent?.id:undefined)??`${kind}-${index}`),payload,pointer})
   }
  if(!records.length)throw Error('The export bundle is empty')
  const result=vendor==='pagerduty'?pagerdutyRecords(records):records
  if(result.length>500)fail(`The saved export holds ${result.length} records, above the 500-record limit (including embedded integrations); narrow the export and preview again. Nothing was imported or truncated.`,413)
  return result
}
