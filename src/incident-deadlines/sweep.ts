import {pagingSnapshot} from '../paging-store';
import {workspaceWrite} from '../workspace-store';
import {responseContext} from '../manual-pages/context';
import {fireDeadline,stopRecoveredDeadlines} from './model';
/** Absolute persisted deadlines use the same workspace CAS as human writes. No sender is invoked. */
export async function sweepDeadlines(db:D1Database) {
 const snapshot=await pagingSnapshot(db),state=snapshot.workspace,revision=state.revision,at=new Date(Date.now()).toISOString();
 const before=JSON.stringify(state.incidents);stopRecoveredDeadlines(state,at);
 const context=responseContext(snapshot,Date.parse(at));let fired=0;
 for(const incident of state.incidents)for(const deadline of incident.deadlines??[])if(fireDeadline(state,incident,deadline,at,context))fired++;
 if(before===JSON.stringify(state.incidents))return {fired:0};
 const results=await db.batch(workspaceWrite(db,state,revision,{sql:'EXISTS(SELECT 1 FROM paging_control WHERE id=1 AND revision=?)',values:[snapshot.revision]}));
 return {fired:results[0].meta.changes===1?fired:0};
}
