import {interruptRestoredImports} from '../../src/move-in/import-lifecycle-sql.mjs'
const quote=name=>'"'+name.replaceAll('"','""')+'"'
const snapshot=async read=>({workspace:(await read('workspace_control'))[0]?.revision??0,paging:(await read('paging_control'))[0]?.revision??0,handoff:(await read('handoff_state'))[0]?.revision??0})

// Normalize execution authority in staging, before the atomic publication.
export async function interruptStagedImports(db,tables,read) {
 const before=await snapshot(read)
 const active=tables.oc_import_lifecycle?(await read('ik_jobs')).filter(job=>['queued','applying'].includes(job.state)):[]
 if(tables.oc_import_lifecycle)for(const query of interruptRestoredImports) {
  const staged=query.replace(/\b(oc_import_lifecycle|ik_jobs|ik_door_plans|ik_door_apply_failures)\b/g,name=>quote(tables[name]))
  await db.prepare(staged).run()
 }
 return {before,interrupted:active.length}
}

// Product facts join the same staging inventory as the restored state. Only new
// rows get row-order metadata; no archived permanent audit entry is rewritten.
export async function auditStagedRestore(db,tables,read,{before,interrupted}) {
 if(!tables.oc_admin_audit)return
 const audit=quote(tables.oc_admin_audit),clock=quote(tables.oc_audit_clock),after=await snapshot(read)
 const revision=(await read('oc_audit_clock'))[0]?.revision??0
 await db.prepare(`UPDATE ${clock} SET revision=revision+1,changed=1`).run()
 const record=async(kind,outcome)=>db.prepare(`INSERT INTO ${audit}(id,kind,feature,actor,subject,source,at,before_revision,after_revision,outcome,workspace_before,workspace_after,paging_before,paging_after,handoff_before,handoff_after) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
  .bind(crypto.randomUUID(),kind,'restore','anon-'+crypto.randomUUID(),'anon-'+crypto.randomUUID(),'anon-'+crypto.randomUUID(),new Date().toISOString(),revision,revision+1,outcome,before.workspace,after.workspace,before.paging,after.paging,before.handoff,after.handoff).run()
 for(let index=0;index<interrupted;index++)await record('import.restore','interrupted')
 await record('restore.installation','accepted')
 for(const name of ['oc_admin_audit','oc_import_lifecycle','ik_door_apply_failures'])if(tables[name]) {
  const copy=quote(tables[name]),meta=quote(tables[name]+'_meta')
  await db.prepare(`INSERT INTO ${meta}(rer_portability_row_order,rer_portability_copy_rowid,rer_portability_source_rowid,rer_portability_tombstone)
   SELECT COALESCE((SELECT MAX(rer_portability_row_order) FROM ${meta}),-1)+ROW_NUMBER() OVER(ORDER BY s.rowid),s.rowid,
    COALESCE((SELECT MAX(rer_portability_source_rowid) FROM ${meta}),0)+ROW_NUMBER() OVER(ORDER BY s.rowid),NULL
   FROM ${copy} s WHERE NOT EXISTS(SELECT 1 FROM ${meta} m WHERE m.rer_portability_copy_rowid=s.rowid)`).run()
  if(name==='oc_admin_audit')await db.prepare(`UPDATE ${copy} SET ordinal=(SELECT rer_portability_source_rowid FROM ${meta} m WHERE m.rer_portability_copy_rowid=${copy}.rowid) WHERE ordinal IS NULL`).run()
 }
}
