import { writeImportDoorSettings, DoorError } from '../modules/import-kit/src/door/index'
import { operatorAuth, ownerClaimConfig, type Bindings } from '../auth.server'
import { AuthError } from '../modules/operator-auth/index.mjs'
import { readInput } from '../modules/operator-auth/input.mjs'
import { IMPORT_DOOR_KEY } from './door-key'

const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}
const escape=(value:string)=>value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;')

export async function readImportSettings(env:Bindings) {
 const claim=ownerClaimConfig(env)
 if(!claim)return {configured:false,enabled:false,keys:[] as {kid:string;revoked:boolean}[]}
 const setting=await env.DB.prepare('SELECT enabled FROM ik_door_settings WHERE installation_id=?').bind(IMPORT_DOOR_KEY).first()
 const {results}=await env.DB.prepare('SELECT kid FROM ik_door_revoked_keys WHERE installation_id=?').bind(IMPORT_DOOR_KEY).all<{kid:string}>()
 return {configured:!!claim.installationId&&!!claim.issuer&&Object.keys(claim.publicKeys).length>0,enabled:setting?.enabled===1,
  keys:Object.keys(claim.publicKeys).map(kid=>({kid,revoked:results.some(row=>row.kid===kid)}))}
}

/** One row in the existing owner settings frame; no copied Base UI is edited. */
export function importSettingsRow(state:Awaited<ReturnType<typeof readImportSettings>>) {
 return `<form class="business-import-settings" action="/auth/settings/imports" method="post"><label class="check"><input type="checkbox" name="enabled" value="true"${state.enabled?' checked':''}${!state.configured?' disabled':''}>Allow Business imports</label>`
  + '<p>Business may import saved PagerDuty, Opsgenie, Splunk On-Call, Jira Service Management Ops and Better Stack exports after owner approval. Imported data stays paused; paging stays OFF.</p>'
  + (state.configured?`<label>Revoke grant key<select name="revokeKid" aria-label="Revoke grant key"><option value="">Keep current keys</option>${state.keys.filter(key=>!key.revoked).map(key=>`<option value="${escape(key.kid)}">${escape(key.kid)}</option>`).join('')}</select></label>`
   + (state.keys.some(key=>key.revoked)?`<p>Revoked keys: ${state.keys.filter(key=>key.revoked).map(key=>escape(key.kid)).join(', ')}. Revocation is permanent.</p>`:'')
   + '<button>Save import settings</button>':'<p>Configure this installation’s trusted RER grant keys before enabling imports.</p>')+'</form>'
}

export async function importSettingsResponse(request:Request,env:Bindings):Promise<Response|null> {
 const url=new URL(request.url)
 if(url.pathname!=='/auth/settings/imports')return null
 try {
  const session=await operatorAuth(env).getSession(request)
  if(!session||session.operator.role!=='owner')throw new DoorError('owner_required',401)
  if(url.origin!==env.AUTH_ORIGIN)throw new DoorError('origin_required',403)
  if(request.method==='GET')return Response.json(await readImportSettings(env),{headers})
  if(request.method!=='POST')return Response.json({error:'method_not_allowed'},{status:405,headers})
  if(request.headers.get('Origin')!==env.AUTH_ORIGIN||url.search)throw new DoorError('origin_required',403)
  const claim=ownerClaimConfig(env)
  if(!claim?.installationId||!claim.issuer)throw new DoorError('grant_keys_required',409)
  const form=request.headers.get('Content-Type')?.split(';')[0]==='application/x-www-form-urlencoded'
  // The normal auth input reader enforces the same small body limit.
  const input=await readInput(request)
  if(Object.keys(input).some(key=>!['enabled','revokeKid'].includes(key)))throw new DoorError('invalid_settings',400)
  const enabled=form?input.enabled==='true':input.enabled
  if(typeof enabled!=='boolean'||(input.revokeKid!==undefined&&typeof input.revokeKid!=='string'))throw new DoorError('invalid_settings',400)
  const kid=input.revokeKid
  if(kid&&!Object.hasOwn(claim.publicKeys,kid))throw new DoorError('unknown_grant_key',400)
  await writeImportDoorSettings(env.DB,IMPORT_DOOR_KEY,{enabled,revokedKids:kid?[kid]:[]},{
   sql:`EXISTS(SELECT 1 FROM oa_sessions s JOIN oa_operators o ON o.id=s.operator_id
    WHERE s.id=? AND s.operator_id=? AND s.revoked_at IS NULL AND s.expires_at>?
    AND s.operator_version=o.version AND o.role='owner' AND o.status='active')`,
   params:[session.id,session.operator.id,Date.now()],
  })
  return form?new Response(null,{status:303,headers:{...headers,Location:'/auth/settings/identity'}}):Response.json(await readImportSettings(env),{headers})
 }catch(error){
  const known=error instanceof DoorError||error instanceof AuthError
  return Response.json({error:known?error.code:'import_settings_unavailable'},{status:known?error.status:503,headers})
 }
}
