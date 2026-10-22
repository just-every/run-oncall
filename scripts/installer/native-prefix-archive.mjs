import {nativeIncompleteDetails,nativePrefixReference,nativePrefixMaximum} from '../../src/native-incomplete-model.ts'

// Validate every prefix separately: portable staging never materializes all
// 10,000 maximum-sized prefixes in the coordination document.
export async function validateNativePrefixes(db,tables,coordination) {
 const table=tables.oc_native_prefixes,receipts=coordination.intakeReceipts??[]
 const name=table?'"'+table.replaceAll('"','""')+'"':null
 let expected=0
 for(const receipt of receipts) {
  if(receipt.provider!=='native'||!receipt.incomplete)continue
  expected++
  const row=name?await db.prepare(`SELECT prefix,bytes,request_sha256 FROM ${name} WHERE id=?`).bind(receipt.id).first():null
  if(!row||!nativePrefixReference(receipt)||row.bytes!==Math.min(nativePrefixMaximum,receipt.incomplete.bytes)||row.request_sha256!==receipt.incomplete.sha256)throw Error('NATIVE_PREFIX_CUSTODY_MISMATCH')
  if(!nativeIncompleteDetails({...receipt,details:{...receipt.details,nativePrefix:{encoding:'base64',value:row.prefix}}}))throw Error('NATIVE_PREFIX_CUSTODY_INVALID')
 }
 if(name&&(await db.prepare(`SELECT COUNT(*) AS n FROM ${name}`).first()).n!==expected)throw Error('NATIVE_PREFIX_CUSTODY_ORPHAN')
}
