/** Saved-response formats only. No provider connection or credential is used here. */
export const vendorNames={opsgenie:'Opsgenie',pagerduty:'PagerDuty',splunk:'Splunk On-Call',jsm:'Jira Service Management Ops',betterstack:'Better Stack'} as const
export type Vendor=keyof typeof vendorNames
export const vendorName=(vendor:string)=>vendorNames[vendor as Vendor]??vendor
export const isVendor=(vendor:string):vendor is Vendor=>Object.hasOwn(vendorNames,vendor)
export const opsFamily=(vendor:Vendor)=>vendor==='opsgenie'||vendor==='jsm'

/** Normalize only documented aliases; original bytes and pointers stay in the journal. */
export function mappingPayload(vendor:Vendor,kind:string,raw:any):any {
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return raw
 if(vendor==='jsm') {
  if(kind==='users')return {...raw,id:raw.id??raw.accountId,email:raw.email??raw.emailAddress,name:raw.name??raw.displayName}
  if(kind==='schedules'){const {teamId,_expands,...rest}=raw;return {...rest,...teamId!==undefined?{ownerTeam:{id:teamId}}:{}}}
  if(kind==='overrides') {const {responder,rotationIds,...rest}=raw;return {...rest,...responder?{user:responder}:{},...rotationIds?{rotations:rotationIds.map((id:string)=>({id}))}:{}}}
 }
 if(vendor==='betterstack'&&kind==='users')return {...raw.attributes,id:raw.id,name:[raw.attributes?.first_name,raw.attributes?.last_name].filter(Boolean).join(' '),sourceType:raw.type}
 if(vendor==='splunk'&&kind==='users')return {...raw,id:raw.id??raw.username,name:[raw.firstName,raw.lastName].filter(Boolean).join(' ')}
 return raw
}

/** Imported numbers are historical contact data, never verified paging routes. */
export function importedContacts(value:any) {
 const entries=Array.isArray(value.phone_numbers)?value.phone_numbers:[]
 return entries.filter((phone:unknown):phone is string=>typeof phone==='string'&&/^\+[1-9][0-9]{6,14}$/.test(phone)).map((number:string)=>({number,verified:false,paging:false,country:'unverified'}))
}
