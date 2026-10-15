import { operatorAuth,runtimeBindings } from './auth.server'
import { fail } from './family/response-operations/domain'

// Both listing and linking check the same current authority in their SQL
// statement. A session checked before a concurrent revocation is not enough.
const mappingGate = `NOT EXISTS(SELECT 1 FROM credentials) AND NOT EXISTS(SELECT 1 FROM operator_members) AND
 EXISTS(SELECT 1 FROM oa_sessions s JOIN oa_operators o ON o.id=s.operator_id
 WHERE s.id=? AND s.operator_id=? AND s.revoked_at IS NULL AND s.expires_at>?
 AND s.operator_version=o.version AND o.role='owner' AND o.status='active')`

async function installationOwner(c:any) {
 const native=await operatorAuth(runtimeBindings(c.env)).getSession(c.req.raw)
 if(!native||native.operator.role!=='owner')fail('Sign in as the installation owner first',401)
 return native
}

/** Minimal read door for an owner who cannot yet read workspace state. The
 * left join distinguishes an admitted empty list from a refused mapping gate. */
export async function restoredAdministrators(c:any) {
 const native=await installationOwner(c)
 const {results}=await c.env.DB.prepare(`SELECT m.id,json_extract(m.data,'$.name') AS name
 FROM (SELECT 1 WHERE ${mappingGate}) admitted
 LEFT JOIN oc_members m ON json_extract(m.data,'$.active')=1 AND json_extract(m.data,'$.role')='admin'
 ORDER BY name COLLATE NOCASE,m.id`).bind(native.id,native.operator.id,Date.now()).all()
 if(!results.length)fail('Administrator selection is only available for an unlinked credential-free restore.',409)
 return c.json({administrators:results.filter((row:{id:string|null})=>row.id!==null)})
}

/** Explicit owner mapping after a credential-free portable restore. Held
 * password installations cannot be claimed through this door. */
export async function linkRestoredOwner(c:any,input:any) {
 const native=await installationOwner(c)
 if(input===null||typeof input!=='object'||Array.isArray(input)||input.confirm!==true||typeof input.adminMapping!=='string')fail('Confirm an archived administrator identity')
 const result=await c.env.DB.prepare(`INSERT INTO operator_members(operator_id,member_id) SELECT ?,? WHERE
   EXISTS(SELECT 1 FROM oc_members WHERE id=? AND json_extract(data,'$.active')=1 AND json_extract(data,'$.role')='admin') AND
   ${mappingGate}`).bind(native.operator.id,input.adminMapping,input.adminMapping,native.id,native.operator.id,Date.now()).run()
 if(result.meta.changes!==1)fail('Mapping refused. Keep held password access; only an unlinked credential-free restore can map an archived administrator.',409)
 return c.json({linked:true})
}
