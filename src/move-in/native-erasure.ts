import { fail } from '../family/response-operations/domain'
import { retireD1ImportCustody, upgradeD1ImportErasureIndex } from '../modules/import-kit/src/d1/index'
import type { D1ImportContext, D1CustodyRetirement, D1RelatedErasure, D1Sql } from '../modules/import-kit/src/d1/types'
import { toD1Sql } from '../modules/erasure/index.mjs'
import { syncErasureFences } from '../erasure-fence'
import { adminSession } from './owner-door'
import { targets } from './target'

/** Reuse imported-person retirement: native mutations, originals, plans,
 * transfer invalidation and the anonymous journal share the final D1 batch. */
export function importErasureContext(c:any):D1ImportContext {
 return nativeImportErasureContext(c.env.DB,c.get('actor').id,()=>adminSession(c.get('sessionDigest'),c.get('actor').id))
}
/** A native caller supplies its real transactional authority, without a session adapter. */
export function nativeImportErasureContext(db:D1Database,principalId:string,predicate:()=>D1Sql):D1ImportContext {
 return {destination:'oncall',namespace:'opsgenie',mappingVersion:'oncall-move-in-1',batchSize:10,maxBatches:1,
  storage:{database:db,targets},authorization:{principalId,predicate}}
}
type CustodyOptions={values?:string[];related?:D1RelatedErasure}
export async function prepareImportCustodyErasure(c:any,target:{kind:string;id:string},options:CustodyOptions&{context?:D1ImportContext}={}) {
 return prepareNativeImportCustodyErasure(c.env.DB,options.context??importErasureContext(c),target,options)
}
export async function prepareNativeImportCustodyErasure(db:D1Database,context:D1ImportContext,target:{kind:string;id:string},options:CustodyOptions={}) {
 if(context.storage.database!==db||context.destination!=='oncall')fail('Import erasure custody must use the native database and destination',409)
 const conflict=(error:unknown):never=>{if(/CHECK constraint|IMPORT_ATOMIC_GUARD|IMPORT_[A-Z_]*(?:CHANGED|ERASED|RETIRED|NOT_FOUND)/.test(String(error)))fail('Import custody changed; nothing was erased. Reload and retry.',409);throw error}
 while(!(await upgradeD1ImportErasureIndex(context).catch(conflict)).complete);
 let receipt:D1CustodyRetirement|undefined
 return {
  async execute(statements:D1PreparedStatement[],checkpoint:D1PreparedStatement[]) {
   receipt=await retireD1ImportCustody({target,values:options.values??[target.id],related:options.related},statements.map(toD1Sql),context,[...checkpoint,db.prepare(syncErasureFences)].map(toD1Sql)).catch(conflict)
   return receipt.nativeResults as D1Result[]
  },
  counts(){if(!receipt)throw Error('Erasure commit has no custody receipt');return {state:'complete',stores:receipt.stores}}
 }
}
