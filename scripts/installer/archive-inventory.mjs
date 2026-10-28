import {excludedTable,PortabilityError} from '@runeditrun/rer/modules/portability'
import {portabilityPolicy,portableTables,historicalTables} from '../../src/portability-policy.mjs'

// Oncall's own oc_ prefix shares Base's owner-claim identity exclusion, and any
// other unnamed table would travel by default. Every table a native archive or a
// Managed data download carries must be named by Oncall's policy or belong to a
// Base module (import-kit ik_, operator-auth oa_, owner-claim, runtime rer_ and
// platform bookkeeping); anything else refuses the restore before publication.
const named=new Set([...portabilityPolicy.includeTables,...portabilityPolicy.excludeTables,...portabilityPolicy.replaceableTables,...portableTables,...historicalTables])
const baseOwned=name=>name==='oc_owner_claims'||/^(?:ik|oa|rer)_/.test(name)||(!name.startsWith('oc_')&&excludedTable(name))

export function refuseUnclassifiedTables(manifest) {
 for(const name of [...(manifest.tables??[]).map(table=>table.name),...(manifest.excludedTables??[])])
  if(!named.has(name)&&!baseOwned(name))throw new PortabilityError('table_inventory:'+name,409)
}
