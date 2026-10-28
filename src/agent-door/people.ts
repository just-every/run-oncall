import {createBusinessSettings,type ManagedMember,type TeamAdapter} from '../modules/business-settings/index.ts'
import type {PeopleAdapter,Person,Principal} from '../modules/agent-door/index.ts'
import {nativeSession} from '../native-session'
import {changeHash} from '../changes/credentials'
import type {Bindings} from '../auth.server'
import type {Member} from '../family/response-operations/domain'

export function oncallPeople(env:Bindings):PeopleAdapter {
 const db=env.DB
 async function person(id:string):Promise<Person|null> {
  const row=await db.prepare("SELECT m.data,o.email,o.status FROM oc_members m LEFT JOIN operator_members l ON l.member_id=m.id LEFT JOIN oa_operators o ON o.id=l.operator_id WHERE m.id=?")
   .bind(id).first<{data:string;email:string|null;status:string|null}>()
  if(!row)return null
  const m:Member=JSON.parse(row.data)
  return {id:m.id,name:m.name,email:row.email??'',role:m.role,active:m.active&&!m.erased&&m.role!=='stakeholder'&&(!row.status||row.status==='active')}
 }
 const owner=()=>db.prepare("SELECT l.member_id AS id FROM oa_bootstrap b JOIN oa_operators o ON o.id=b.claim_id JOIN operator_members l ON l.operator_id=o.id WHERE o.role='owner' AND o.status='active'").first<{id:string}>()
 return {
  person,
  async session(request){const session=await nativeSession(env,request);return session?person(session.member.id):null},
  async sponsor({sub}) {
   const settings=await db.prepare('SELECT owner_id FROM bs_settings WHERE singleton=1 AND stopped=0').first<{owner_id:string|null}>()
   if(!settings)return null
   if(settings.owner_id===sub){const native=await owner();return native?person(native.id):null}
   const row=await db.prepare("SELECT operator_id,business_role FROM bs_team WHERE business_id=? AND state='active' AND EXISTS(SELECT 1 FROM bs_settings WHERE singleton=1 AND stopped=0)").bind(sub).first<{operator_id:string|null;business_role:string}>()
   const native=row?.operator_id?await person(row.operator_id):null
   return native&&row&&(row.business_role!=='admin'||native.role==='admin')?native:null
  },
  businessRole:p=>p.role==='admin'?'owner':null,
  async businessMember(p) {
   const settings=await db.prepare('SELECT owner_id FROM bs_settings WHERE singleton=1 AND stopped=0').first<{owner_id:string|null}>()
   if(!settings)return null
   if(settings.owner_id&&(await owner())?.id===p.id)return {id:settings.owner_id,role:'owner'}
   const row=await db.prepare("SELECT business_id,business_role FROM bs_team WHERE operator_id=? AND state='active' AND business_id IS NOT NULL").bind(p.id).first<{business_id:string;business_role:string}>()
   return row&&p.active&&(row.business_role!=='admin'||p.role==='admin')?{id:row.business_id,role:row.business_role==='admin'?'editor':null}:null
  },
 }
}

/** Signed roster changes retain only explicitly bound native IDs. No invitation or email join. */
export function oncallSettings(env:Bindings) {
 const team:TeamAdapter={
  async ownerEmail(){return (await env.DB.prepare("SELECT o.email FROM oa_bootstrap b JOIN oa_operators o ON o.id=b.claim_id WHERE o.status='active' AND o.role='owner'").first<{email:string}>())?.email??null},
  async prepare({members,managed}) {
   const rows:ManagedMember[]=[]
   for(const entry of members) {
    const previous=entry.id?managed.find(m=>m.businessId===entry.id):undefined
    const person=previous?.operatorId?await oncallPeople(env).person(previous.operatorId):null
    const compatible=person?.active&&(entry.role!=='admin'||person.role==='admin')
    rows.push({email:entry.email,invite:entry.invite,operatorId:previous?.operatorId??null,businessId:entry.id??null,businessRole:entry.role,
     state:compatible?'active':previous?.operatorId?'conflict':'inactive'})
   }
   return {rows,statements:[],async afterCommit(){}}
  },
 }
 return createBusinessSettings({db:env.DB,trust:env.RER_BUSINESS_TRUST,business:{settings:1,values:['display_name'],team:{roles:{admin:'admin',member:'member'}}},team})
}

export const isNativeClient=(id:string|undefined):id is string=>!!id&&id.startsWith('oncall-api:')
export const clientIdentity=(value:string)=>{const id=value.slice('oncall-api:'.length),split=id.lastIndexOf('@');return {id:id.slice(0,split),revision:Number(id.slice(split+1))}}
export async function clientScopes(env:Bindings,p:Pick<Principal,'clientId'|'person'|'scopes'>):Promise<string[]> {
 if(!isNativeClient(p.clientId))return p.scopes
 const key=clientIdentity(p.clientId)
 const row=await env.DB.prepare("SELECT c.data FROM oc_api_clients c JOIN oc_members m ON m.id=json_extract(c.data,'$.owner') JOIN oc_api_credentials k ON k.client=c.id WHERE c.id=? AND json_extract(c.data,'$.revision')=? AND json_extract(c.data,'$.active')=1 AND m.id=? AND json_extract(m.data,'$.active')=1 AND json_extract(m.data,'$.role')='admin'")
  .bind(key.id,key.revision,p.person.id).first<{data:string}>()
 return row?[...JSON.parse(row.data).permissions,'events:read']:[]
}
export async function localCredentials(env:Bindings,request:Request) {
 const header=request.headers.get('authorization')??''
 if(!/^Bearer [^\s]{32,200}$/.test(header))return null
 const row=await env.DB.prepare("SELECT c.data FROM oc_api_credentials k JOIN oc_api_clients c ON c.id=k.client JOIN oc_members m ON m.id=json_extract(c.data,'$.owner') WHERE k.digest=? AND json_extract(c.data,'$.active')=1 AND json_extract(m.data,'$.active')=1 AND json_extract(m.data,'$.role')='admin'")
  .bind(await changeHash(header.slice(7))).first<{data:string}>()
 if(!row)return null
 const client=JSON.parse(row.data)
 return {sponsor:{id:client.owner},agent:{id:client.id,name:client.name},scopes:[...client.permissions,'events:read'],clientId:'oncall-api:'+client.id+'@'+client.revision}
}

/** A person explicitly links an existing roster subject to an existing native account. */
export async function memberMapping(request:Request,env:Bindings):Promise<Response|null> {
 if(new URL(request.url).pathname!=='/api/agent-members')return null
 const session=await nativeSession(env,request)
 if(!session?.member.active||session.member.role!=='admin')return Response.json({code:'unauthenticated'},{status:401})
 if(request.method==='GET')return Response.json({members:(await env.DB.prepare('SELECT data FROM oc_members').all<{data:string}>()).results.map(r=>JSON.parse(r.data)),
  mappings:(await env.DB.prepare('SELECT business_id,operator_id,business_role,state FROM bs_team').all()).results},{headers:{'cache-control':'no-store'}})
 if(request.method!=='POST')return Response.json({code:'method_not_allowed'},{status:405})
 if(request.headers.get('origin')!==env.AUTH_ORIGIN)return Response.json({code:'origin_required'},{status:403})
 let input:any;try{input=await request.json()}catch{return Response.json({code:'invalid_arguments'},{status:400})}
 if(!input||Object.keys(input).sort().join(',')!=='business_id,member_id')return Response.json({code:'invalid_arguments'},{status:400})
 const person=await oncallPeople(env).person(input.member_id)
 const row=await env.DB.prepare('SELECT business_role FROM bs_team WHERE business_id=?').bind(input.business_id).first<{business_role:string}>()
 const native=person?await env.DB.prepare('SELECT data FROM oc_members WHERE id=?').bind(person.id).first<{data:string}>():null
 const target:Member|null=native?JSON.parse(native.data):null
 if(!row||!person?.active||!target?.active||row.business_role==='admin'&&target.role!=='admin'||target.role==='stakeholder')return Response.json({code:'mapping_inadmissible'},{status:409})
 const result=await env.DB.prepare("UPDATE bs_team SET operator_id=?,state='active' WHERE business_id=? AND business_role=? AND NOT EXISTS(SELECT 1 FROM bs_team WHERE operator_id=? AND business_id<>?) AND NOT EXISTS(SELECT 1 FROM oa_bootstrap b JOIN operator_members l ON l.operator_id=b.claim_id WHERE l.member_id=?) AND EXISTS(SELECT 1 FROM oc_current_sessions s JOIN oc_members m ON m.id=s.member WHERE s.token=? AND s.expires>? AND json_extract(m.data,'$.active')=1 AND json_extract(m.data,'$.role')='admin') AND EXISTS(SELECT 1 FROM oc_members WHERE id=? AND data=?) AND NOT EXISTS(SELECT 1 FROM operator_members l JOIN oa_operators o ON o.id=l.operator_id WHERE l.member_id=? AND o.status<>'active')")
  .bind(person.id,input.business_id,row.business_role,person.id,input.business_id,person.id,session.digest,Date.now(),person.id,native!.data,person.id).run()
 return Response.json(result.meta.changes===1?{mapped:{business_id:input.business_id,member_id:person.id}}:{code:'mapping_conflict'},{status:result.meta.changes===1?200:409})
}
