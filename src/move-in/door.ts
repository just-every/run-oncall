import { createImportDoorHandler, verifyImportGrant, DoorError } from '../modules/import-kit/src/door/index'
import type { ImportMapping, ParsedRecord } from '../modules/import-kit/src/types'
import { ownerClaimConfig, type Bindings } from '../auth.server'
import { mapping } from './mapping'
import { savedExportRecords, type Vendor } from './source'
import { targets } from './target'

/** The bearer door is separate from workspace-session HTTP admission. All kit
 * mutations still use Base's grant predicate and the owner's real member id. */
export async function importDoorResponse(request:Request,env:Bindings):Promise<Response|null> {
 if(!new URL(request.url).pathname.startsWith('/api/rer/import/'))return null
 const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}
 try {
  const claim=ownerClaimConfig(env)
  const setting=claim&&await env.DB.prepare('SELECT enabled FROM ik_door_settings WHERE installation_id=?').bind(claim.installationId).first()
  if(!claim||setting?.enabled!==1)return Response.json({error:'not_found'},{status:404,headers})
  const token=request.headers.get('Authorization')
  if(!token?.startsWith('Bearer '))throw new DoorError('grant_required',401)
  const {grant}=await verifyImportGrant(token.slice(7),claim)
  if(!['opsgenie','pagerduty'].includes(grant.namespace))throw new DoorError('unsupported_import_namespace',400)
  const vendor=grant.namespace as Vendor
  const owner=await env.DB.prepare(`SELECT m.id FROM oa_operators o JOIN operator_members l ON l.operator_id=o.id JOIN oc_members m ON m.id=l.member_id
   WHERE o.role='owner' AND o.status='active' AND o.email=? AND json_extract(m.data,'$.active')=1 AND json_extract(m.data,'$.role')='admin'`).bind(claim.expectedEmail).first<{id:string}>()
  if(!owner)throw new DoorError('owner_workspace_required',409)
  // Parsing prepares a whole-bundle mapping. This state belongs to this one
  // request, so users/overrides in concurrent vendor uploads cannot mix.
  let prepared:ImportMapping|undefined
  const parsed:ParsedRecord[]=[],now=Date.now()
  return await createImportDoorHandler({database:env.DB,targets,claim,ownerPrincipalId:owner.id,destination:'oncall',format:'json',
   limits:{maxBytes:512*1024,maxRecordBytes:512*1024,maxRecords:500},
   parse(value){
    const records=savedExportRecords(vendor,value)
    parsed.push(...records)
    return records
   },
   mapping:{version:'oncall-move-in-1',map(record){
    prepared??=mapping(vendor,{records:parsed.map(item=>({...item,location:{artifact:'saved-export',pointer:item.pointer}}))},now)
    return prepared.map(record)
   }},
  })(request)
 }catch(error){
  return Response.json({error:error instanceof DoorError?error.code:'import_door_conflict'},{status:error instanceof DoorError?error.status:409,headers})
 }
}
