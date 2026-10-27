import {nativePrefixValue} from '../../src/native-incomplete-model.ts'

// Validate every prefix separately: portable staging never materializes all
// 10,000 maximum-sized prefixes in the coordination document.
export async function validateNativePrefixes(db,tables,coordination) {
 const table=tables.oc_native_prefixes,receipts=coordination.intakeReceipts??[]
 const name=table?'"'+table.replaceAll('"','""')+'"':null
 let expected=0
 for(const receipt of receipts) {
  if(receipt.provider!=='native'||!receipt.incomplete)continue
  const row=name?await db.prepare(`SELECT prefix,bytes,request_sha256 FROM ${name} WHERE id=?`).bind(receipt.id).first():null
  if(nativePrefixValue(receipt,row)===undefined)throw Error('NATIVE_PREFIX_CUSTODY_MISMATCH')
  if(row)expected++
 }
 if(name&&(await db.prepare(`SELECT COUNT(*) AS n FROM ${name}`).first()).n!==expected)throw Error('NATIVE_PREFIX_CUSTODY_ORPHAN')
}
