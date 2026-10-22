import {collections,tables,authoredSql,authoredRow,type Collection} from './workspace-tables.ts';
import type {State} from './family/response-operations/domain.ts';
export type RowStat={count:number;bytes:number;max:number;authorCount:number;authorBytes:number};
export type Stats=Partial<Record<Collection|'prefixes',RowStat>>;
export type Held={ordinal:number;data:string};
export type Origin={rows:Map<Collection,Map<string,Held>>;stats:Stats;complete:boolean};
export const origins=new WeakMap<State,Origin>();
const zero:RowStat={count:0,bytes:0,max:-1,authorCount:0,authorBytes:0};
const bytes=(s:string)=>new TextEncoder().encode(s).length;
export async function ensureAccounting(db:D1Database) {
 const control=await db.prepare('SELECT storage_stats FROM workspace_control WHERE id=1').first<{storage_stats:string|null}>();
 if(!control||control.storage_stats!==null)return;
 const parts=collections.flatMap(key=>{const table=tables[key],author=authoredSql(key);return [`'${key}'`,`json_object('count',(SELECT COUNT(*) FROM ${table}),'bytes',(SELECT COALESCE(SUM(length(CAST(data AS BLOB))),0) FROM ${table}),'max',(SELECT COALESCE(MAX(ordinal),-1) FROM ${table}),'authorCount',(SELECT COUNT(*) FROM ${table} WHERE ${author}),'authorBytes',(SELECT COALESCE(SUM(length(CAST(data AS BLOB))),0) FROM ${table} WHERE ${author}))`];});
 parts.push("'prefixes'","json_object('count',(SELECT COUNT(*) FROM oc_native_prefixes),'bytes',(SELECT COALESCE(SUM(length(CAST(prefix AS BLOB))),0) FROM oc_native_prefixes),'max',-1,'authorCount',0,'authorBytes',0)");
 await db.prepare(`UPDATE workspace_control SET storage_stats=json_object(${parts.join(',')}) WHERE id=1 AND storage_stats IS NULL`).run();
}
export function countRows(state:State,key:Collection):number {
 const origin=origins.get(state);return origin?(origin.stats[key]?.count??0)+(state[key]?.length??0)-(origin.rows.get(key)?.size??0):(state[key]?.length??0);
}
export function changedStat(state:State,key:Collection,encode:(row:any)=>any= v=>v):RowStat {
 const origin=origins.get(state),stat={...(origin?.stats[key]??zero)},old=origin?.rows.get(key)??new Map<string,Held>(),seen=new Set<string>();
 for(const row of state[key]??[]) {
  seen.add(row.id);const data=JSON.stringify(encode(row)),held=old.get(row.id);
  if(held?.data===data)continue;
  if(held){const previous=JSON.parse(held.data);stat.count--;stat.bytes-=bytes(held.data);if(authoredRow(key,previous)){stat.authorCount--;stat.authorBytes-=bytes(held.data);}}
  stat.count++;stat.bytes+=bytes(data);if(authoredRow(key,row)){stat.authorCount++;stat.authorBytes+=bytes(data);}
 }
 for(const [id,held] of old)if(!seen.has(id)){const previous=JSON.parse(held.data);stat.count--;stat.bytes-=bytes(held.data);if(authoredRow(key,previous)){stat.authorCount--;stat.authorBytes-=bytes(held.data);}}
 return stat;
}
export async function guardWorkspaceExport(db:D1Database,limit:number) {
 await ensureAccounting(db);const row=await db.prepare('SELECT storage_stats FROM workspace_control WHERE id=1').first<{storage_stats:string}>();
 if(row){const stats=JSON.parse(row.storage_stats) as Stats;const size=Object.values(stats).reduce((n,s)=>n+(s?.bytes??0),0);if(size>limit){const {fail}=await import('./family/response-operations/domain.ts');fail('Workspace custody exceeds this export limit; use the streaming portable export',413);}}
}
