import { readFileSource } from '../modules/import-kit/src/readers/file'
import type { Json, ParsedRecord } from '../modules/import-kit/src/types'
import { fail } from '../family/response-operations/domain'

export type Vendor='opsgenie'|'pagerduty'

// The documented single-detail key of each PagerDuty list response.
const detail:Record<string,string>={users:'user',schedules:'schedule',escalation_policies:'escalation_policy'}
// Oncall never accepts a key, token or signing secret, even where the kit's own check would keep it as retained metadata.
const credentialKey=/^(?:password|passwd|secret|token|credentials?|authorization|cookie)$|(?:api|access|auth|integration|routing|service|signing|private|client|refresh|session)[_-]?(?:key|secret|token)$|^webhook[_-]?(?:url|secret)$|(?:http|web)[_-]?cal[_-]?url$/i
const escape=(key:string)=>key.replaceAll('~','~0').replaceAll('/','~1')

function refuseCredentials(value:unknown,pointer:string) {
 if(Array.isArray(value))value.forEach((item,index)=>refuseCredentials(item,`${pointer}/${index}`))
 else if(value&&typeof value==='object')for(const [key,child] of Object.entries(value)) {
  if(credentialKey.test(key))fail(`Credential-bearing field "${key}" at ${pointer}: remove it from the saved response; Oncall never accepts keys or tokens`)
  refuseCredentials(child,`${pointer}/${escape(key)}`)
 }
}

type Entry={payload:any;pointer:string}
// One saved response, a list or a single detail, becomes its records. Each element of a bundle value may itself be a saved response.
function entries(vendor:Vendor,kind:string,body:any,pointer:string):Entry[] {
 if(Array.isArray(body))return body.flatMap((item,index)=>entries(vendor,kind,item,`${pointer}/${index}`))
 if(!body||typeof body!=='object')return [{payload:body,pointer}]
 let items:any,at=pointer
 if(vendor==='opsgenie'&&body.data!==undefined)at=`${pointer}/data`,items=body.data
 else if(vendor==='pagerduty'&&Array.isArray(body[kind]))at=`${pointer}/${escape(kind)}`,items=body[kind]
 else if(vendor==='pagerduty'&&detail[kind]&&body[detail[kind]]&&typeof body[detail[kind]]==='object')at=`${pointer}/${detail[kind]}`,items=body[detail[kind]]
 else return [{payload:body,pointer}]
 // A list of overrides does not name its schedule; the saved file carries it beside the response.
 const parent=body.scheduleId??body.schedule_id,join=(payload:any)=>kind==='overrides'&&parent!==undefined&&payload&&typeof payload==='object'&&payload.scheduleId===undefined&&payload.schedule_id===undefined?{...payload,[vendor==='opsgenie'?'scheduleId':'schedule_id']:parent}:payload
 return Array.isArray(items)?items.map((payload,index)=>({payload:join(payload),pointer:`${at}/${index}`})):[{payload:join(items),pointer:at}]
}

export async function fileSource(vendor:Vendor,raw:string,filename?:unknown) {
 if(!['opsgenie','pagerduty'].includes(vendor))throw Error('Choose Opsgenie or PagerDuty')
 if(filename!==undefined&&(typeof filename!=='string'||!filename.trim()||filename.length>255||/[\x00-\x1f\x7f/\\]/.test(filename)))fail('Supply the export filename without a folder path (at most 255 characters)')
 let parsed:unknown;try{parsed=JSON.parse(raw)}catch{}
 if(parsed&&typeof parsed==='object')refuseCredentials(parsed,'')
 return readFileSource({namespace:vendor,name:typeof filename==='string'?filename:`${vendor}-export.json`,bytes:new TextEncoder().encode(raw),format:'json',parse(value:Json){
  if(!value||Array.isArray(value)||typeof value!=='object')throw Error('Export bundle must be an object')
  const records:ParsedRecord[]=[],count=new Map<string,number>()
  for(const [kind,response] of Object.entries(value))
   for(const {payload,pointer} of entries(vendor,kind,response,`/${escape(kind)}`)) {
    const index=count.get(kind)??0;count.set(kind,index+1)
    records.push({kind,sourceId:String(payload?.id??payload?.alias??payload?._parent?.id??`${kind}-${index}`),payload,pointer})
   }
  if(!records.length)throw Error('The export bundle is empty')
  return records
 }},{maxBytes:512*1024,maxRecordBytes:512*1024,maxRecords:500})
}
