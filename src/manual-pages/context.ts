import { coverage } from '../family/response-operations/schedules';
import {policyServices} from '../family/response-operations/escalation';
import type { PagingSnapshot } from '../paging-store';
import type { PolicyContext } from './model';
export function responseContext(snapshot:PagingSnapshot,at:number):PolicyContext {
 const eligible:Record<string,string[]>={},levels:Record<string,(string|null)[]>={};
 for(const policy of snapshot.archive.policies){
  const schedule=snapshot.archive.schedules.find(s=>s.id===policy.scheduleId);
  if(schedule){
   const now=coverage(schedule,snapshot.workspace.members,at),recipients=policy.secondStep==='none'?[now.primary]:[now.primary,now[policy.secondStep??'backup']];
   for(const service of policyServices(policy)){levels[service]=recipients;eligible[service]=recipients.filter((id):id is string=>id!==null);}
  }
 }
 return {policies:snapshot.archive.policies.flatMap(p=>policyServices(p).map(service=>({service,revision:p.revision}))),eligible,levels};
}
