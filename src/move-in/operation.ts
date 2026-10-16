import { createD1ImportJob, readD1ImportJob, sha256 } from '../modules/import-kit/src/d1/index'
import type { D1ImportContext, ImportPlan } from '../modules/import-kit/src/d1/index'
import { fail } from '../family/response-operations/domain'

/** A completed reversal ends one operation. Its successor has a stable key, so
 * retries and concurrent confirmations still choose the same new operation. */
export async function createMoveInJob(plan: ImportPlan, context: D1ImportContext, requestedKey?: unknown) {
 if(requestedKey!==undefined&&(typeof requestedKey!=='string'||!requestedKey||requestedKey.length>4096))fail('Supply a nonempty import operation key of at most 4096 characters')
 const root=typeof requestedKey==='string'?requestedKey:plan.fingerprint
 let operationKey=root
 for(;;) {
  const prior=await context.storage.database.prepare('SELECT id FROM ik_jobs WHERE destination=? AND principal_id=? AND operation_key=?').bind(context.destination,context.authorization.principalId,operationKey).first<{id:string}>()
  if(!prior)break
  const job=await readD1ImportJob(prior.id,context)
  if(!['undone','rolled_back'].includes(job.state))break
  operationKey=`move-in-again:${sha256(JSON.stringify([root,job.id]))}`
 }
 // Creation retains the kit's review, authority, custody and erasure checks.
 return createD1ImportJob(plan,{...context,operationKey})
}
