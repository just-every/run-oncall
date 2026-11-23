import { attachmentHash, canonicalJson, sha256 } from '../modules/import-kit/src/provenance/identity'
import type { ProvenanceRow, TargetRow } from '../modules/import-kit/src/types'

// Key staging leaves intake paused. A catch-up also carries older bindings
// that are already live. Both must retain the exact imported definition.
export function explainNativeEdit(row:TargetRow,provenance:ProvenanceRow,inherited:boolean) {
 const match=/^(adopted|intake|email)-[a-f0-9-]{36}$/.exec(row.revision)
 if(!match||!row.value||typeof row.value!=='object'||Array.isArray(row.value))return
 const edit=match[1]
 if(edit!=='intake'&&!inherited)return
 const field=edit==='adopted'&&(row.targetKind==='schedule'||row.targetKind==='policy')?'adopted'
  :row.targetKind==='integration'?(edit==='intake'?'intakeSource':edit==='email'?'emailAddress':undefined):undefined
 if(!field||!row.value[field])return
 const {[field]:binding,...original}=row.value
 if(sha256(canonicalJson(original))!==provenance.valueHash||attachmentHash(row.attachment)!==provenance.attachmentHash)return
 if(field==='adopted'&&typeof binding==='object'&&!Array.isArray(binding))return 'Already adopted in Oncall; the retained import data matches.'
 if(field!=='adopted'&&typeof binding==='string')return 'Integration setup was recorded separately; the retained import data matches.'
}
