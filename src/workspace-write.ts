import { auditRefusalCommitted } from './audit-store';
import { fail, type State } from './family/response-operations/domain';
import { workspaceWrite } from './workspace-store';

export type WriteGuard = { sql: string; values: (string | number | null)[] };

export async function saveWorkspace(db:D1Database,state:State,revision:number,authority:WriteGuard) {
 const result=await db.batch(workspaceWrite(db,state,revision,authority));
 if(result[0].meta.changes!==1){auditRefusalCommitted(db);fail('Workspace changed. Reload and retry.',409);}
}
