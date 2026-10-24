import { fail } from '../family/response-operations/domain'
import { retireD1ImportCustody, upgradeD1ImportErasureIndex } from '../modules/import-kit/src/d1/index'
import type { D1ImportContext, D1CustodyRetirement } from '../modules/import-kit/src/d1/types'
import { toD1Sql } from '../modules/erasure/index.mjs'
import { syncErasureFences } from '../erasure-fence'
import { adminSession } from './owner-door'
import { targets } from './target'

/** Reuse imported-person retirement: native mutations, originals, plans,
 * transfer invalidation and the anonymous journal share the final D1 batch. */
export async function prepareImportCustodyErasure(c:any,target:{kind:string;id:string}) {
 const context:D1ImportContext={destination:'oncall',namespace:'opsgenie',mappingVersion:'oncall-move-in-1',batchSize:10,maxBatches:1,
  storage:{database:c.env.DB,targets},authorization:{principalId:c.get('actor').id,predicate(){return adminSession(c.get('sessionDigest'),c.get('actor').id)}}}
 const conflict=(error:unknown):never=>{if(/CHECK constraint|IMPORT_ATOMIC_GUARD|IMPORT_[A-Z_]*(?:CHANGED|ERASED|RETIRED|NOT_FOUND)/.test(String(error)))fail('Import custody changed; nothing was erased. Reload and retry.',409);throw error}
 while(!(await upgradeD1ImportErasureIndex(context).catch(conflict)).complete);
 let receipt:D1CustodyRetirement|undefined
 return {
  async execute(statements:D1PreparedStatement[],checkpoint:D1PreparedStatement[]) {
   receipt=await retireD1ImportCustody({target,values:[target.id]},statements.map(toD1Sql),context,[...checkpoint,c.env.DB.prepare(syncErasureFences)].map(toD1Sql)).catch(conflict)
   return receipt.nativeResults as D1Result[]
  },
  counts(){if(!receipt)throw Error('Erasure commit has no custody receipt');return {state:'complete',stores:receipt.stores}}
 }
}
