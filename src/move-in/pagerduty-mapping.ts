import type { MappingResult } from '../modules/import-kit/src/types'

type Difference={field:string;reason:string}
const retained=(label:string,clause:string)=>`${label}: not converted; original retained for review under ${clause}. No authority is activated.`

/** Contacts carry no country inference, verification or paging authority. */
export function pagerdutyContacts(user:any) {
 const contacts=new Map<string,{number:string;verified:false;paging:false;country:string}>(),unmapped:Difference[]=[]
 if(user.contact_methods!==undefined&&!Array.isArray(user.contact_methods))
  unmapped.push({field:'contact_methods',reason:'Contact methods must be a saved list of details; retain the original and export contact details again. No contact is created.'})
 for(const [index,method] of (Array.isArray(user.contact_methods)?user.contact_methods:[]).entries()) {
  const field=`contact_methods.${index}`,label=`Contact ${method?.label??method?.id??index} (${method?.type??'unknown'})`
  if(!['phone_contact_method','sms_contact_method','phone_contact_method_reference','sms_contact_method_reference'].includes(method?.type)) {
   unmapped.push({field,reason:`${label}: retained only; email, push and other methods create no delivery or access.`});continue
  }
  const code=method.country_code,address=method.address
  if(!Number.isSafeInteger(code)||code<1||code>999||typeof address!=='string'||!/^[1-9][0-9]+$/.test(address)||!/^\+[1-9][0-9]{6,14}$/.test('+'+code+address)) {
   unmapped.push({field,reason:`${label}: country_code and address are missing, ambiguous or malformed; supply a numeric country calling code and national digits without a trunk prefix or formatting, then export again. No number is guessed; original retained.`});continue
  }
  const number='+'+code+address
  contacts.set(number,{number,verified:false,paging:false,country:'unverified'})
  unmapped.push({field,reason:`${label}: ${number} retained as unverified E.164; unlisted for paging until OC-026/OC-066 verification and a maintained country list establish coverage. It does not meet two-route coverage; no paging route is created.`})
 }
 return {contacts:[...contacts.values()],unmapped}
}

/** Account objects remain individually accounted source evidence, never new native kinds. */
export function pagerdutyEvidence(kind:string,id:string,value:any):MappingResult|undefined {
 const label=value?.name??value?.title??value?.summary??value?.description??id
 if(kind==='services') {
  const fields=['alert_grouping_parameters','support_hours','incident_urgency_rule','auto_resolve_timeout','acknowledgement_timeout','escalation_policy','teams']
  return {effects:[],unmapped:[{field:'service',reason:`Service ${label}: retained source evidence only. No native service is created; schedule adoption still requires an explicit service choice.`},
   ...fields.filter(field=>value[field]!==undefined).map(field=>({field,reason:`Service ${label}: ${field} is not converted; original setting retained for review.`})),
   ...Object.keys(value).filter(field=>!['id','type','name','summary','integrations',...fields].includes(field)).map(field=>({field,reason:`Service ${label}: ${field} retained only.`}))]}
 }
 if(kind==='incidents') {
  if(value.status==='triggered'||value.status==='acknowledged')return {effects:[],rejection:`Incident ${label} (${id}, ${value.status}): not imported as a live incident. No timeline, delivery or state change is created; original retained for resolution under OC-038.`}
  if(value.status==='resolved')return {effects:[],unmapped:[{field:'history',reason:`Resolved incident ${label} (${id}): retained source evidence only. No native history or timeline is created; imported history never counts as live delivery.`}]}
  return {effects:[],rejection:`Incident ${label} (${id}): unknown status ${value.status??'(missing)'}; export the incident detail again. Original retained; no live state is created.`}
 }
 const clause=({teams:'OC-023',business_services:'OC-061',maintenance_windows:'OC-043',event_orchestrations:'OC-072 routed keys'} as Record<string,string>)[kind]
 if(!clause)return
 const unmapped:Difference[]=[{field:kind,reason:retained(`${kind} ${label} (${id})`,clause)}]
 if(kind==='event_orchestrations') {
  for(const [setIndex,set] of (value.sets??[]).entries())for(const [ruleIndex,rule] of (set.rules??[]).entries()) {
   const field=`sets.${setIndex}.rules.${ruleIndex}`
   unmapped.push({field,reason:retained(`Orchestration ${id} rule ${rule.label??rule.id??ruleIndex}${rule.actions?.dynamic_route_to?' (dynamic routing)':''}`,clause)})
  }
  if(value.catch_all!==undefined)unmapped.push({field:'catch_all',reason:retained(`Orchestration ${id} catch-all`,clause)})
 }
 return {effects:[],rejection:`${kind} ${label} (${id}): not converted; original retained for review under ${clause}. No routed key, maintenance, membership or live service is created.`,unmapped}
}
