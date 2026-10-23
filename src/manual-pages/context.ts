import { coverage } from '../family/response-operations/schedules';
import type { PagingSnapshot } from '../paging-store';
import type { PolicyContext } from './model';
export function responseContext(snapshot:PagingSnapshot,at:number):PolicyContext {
 const eligible:Record<string,string[]>={},levels:Record<string,(string|null)[]>={};
 for(const policy of snapshot.archive.policies){const schedule=snapshot.archive.schedules.find(s=>s.id===policy.scheduleId);if(schedule){const now=coverage(schedule,snapshot.workspace.members,at);levels[policy.service]=[now.primary,now.backup];eligible[policy.service]=[now.primary,now.backup].filter((id):id is string=>id!==null);}}
 return {policies:snapshot.archive.policies.map(p=>({service:p.service,revision:p.revision})),eligible,levels};
}
