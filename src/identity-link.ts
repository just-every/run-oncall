import { operatorAuth,runtimeBindings } from './auth.server'
import { fail } from './family/response-operations/domain'

/** Explicit owner mapping after a credential-free portable restore. Held
 * password installations cannot be claimed through this door. */
export async function linkRestoredOwner(c:any,input:any) {
 const native=await operatorAuth(runtimeBindings(c.env)).getSession(c.req.raw)
 if(!native||native.operator.role!=='owner')fail('Sign in as the installation owner first',401)
 if(input.confirm!==true||typeof input.adminMapping!=='string')fail('Confirm an archived administrator identity')
 const result=await c.env.DB.prepare(`INSERT INTO operator_members(operator_id,member_id) SELECT ?,? WHERE
   NOT EXISTS(SELECT 1 FROM credentials) AND NOT EXISTS(SELECT 1 FROM operator_members) AND
   EXISTS(SELECT 1 FROM oc_members WHERE id=? AND json_extract(data,'$.active')=1 AND json_extract(data,'$.role')='admin') AND
   EXISTS(SELECT 1 FROM oa_sessions s JOIN oa_operators o ON o.id=s.operator_id WHERE s.id=? AND s.revoked_at IS NULL AND s.expires_at>? AND s.operator_version=o.version AND o.role='owner' AND o.status='active')`).bind(native.operator.id,input.adminMapping,input.adminMapping,native.id,Date.now()).run()
 if(result.meta.changes!==1)fail('Mapping refused. Keep held password access; only an unlinked credential-free restore can map an archived administrator.',409)
 return c.json({linked:true})
}
