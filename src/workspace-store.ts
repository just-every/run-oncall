import {storedReceipt,nativePrefixWrites} from './native-prefix-store.ts';
import {authoredSize} from './workspace-profile.ts';
import {empty,fail,type State} from './family/response-operations/domain.ts';
import {collections,tables,partialCollections,authoredSql,type Collection} from './workspace-tables.ts';
import {origins,ensureAccounting} from './workspace-accounting.ts';
export {countRows} from './workspace-accounting.ts';
export {collections,tables} from './workspace-tables.ts';
const pageSize=250,pageBytes=1000000;
// Metadata is windowed before joining record bytes, so the SQL window never holds full records.
export const recentIds=(table:string,where='1')=>`WITH candidates AS (SELECT id,ordinal,length(CAST(data AS BLOB)) AS bytes FROM ${table} WHERE ${where} ORDER BY ordinal DESC,id DESC LIMIT ${pageSize}),sized AS (SELECT id,SUM(bytes) OVER(ORDER BY ordinal DESC,id DESC) AS held,ROW_NUMBER() OVER(ORDER BY ordinal DESC,id DESC) AS rank FROM candidates) SELECT id FROM sized WHERE held<=${pageBytes} OR rank=1`;
const linkedAlerts="SELECT value FROM oc_incidents i,json_each(json_extract(i.data,'$.alerts'))";
const alertIds=`SELECT id FROM (${recentIds('oc_alerts')}) UNION ${linkedAlerts}`;
const relatedEvents=(ids:string)=>`SELECT json_extract(data,'$.events[0]') FROM oc_alerts WHERE id IN (${ids}) UNION SELECT json_extract(data,'$.events[#-1]') FROM oc_alerts WHERE id IN (${ids}) UNION SELECT (SELECT e.id FROM json_each(json_extract(a.data,'$.events')) j JOIN oc_events e ON e.id=j.value WHERE json_extract(e.data,'$.intent')='recover' ORDER BY CAST(j.key AS INTEGER) DESC LIMIT 1) FROM oc_alerts a WHERE a.id IN (${ids})`;
function query(key:Collection,complete:boolean,recent=true) {
 let where='1';
 if(!complete&&partialCollections.has(key)) {
  if(!recent)where=key==='audit'||key==='intakeSources'?`(${authoredSql(key)})=1`:'0';
  else if(key==='alerts')where=`id IN (${alertIds})`;
  else if(key==='events')where=`id IN (SELECT id FROM (${recentIds(tables[key])}) UNION ${relatedEvents(alertIds)})`;
  else if(key==='audit'||key==='intakeSources')where=`id IN (SELECT id FROM ${tables[key]} WHERE (${authoredSql(key)})=1 UNION SELECT id FROM (${recentIds(tables[key],`(${authoredSql(key)})=0`)}))`;
  else where=`id IN (${recentIds(tables[key])})`;
 }
 return `SELECT '${key}' AS collection,ordinal,data FROM ${tables[key]} WHERE ${where} ORDER BY ordinal,id`;
}
export const workspaceQueries=["SELECT 'control' AS collection,0 AS ordinal,json_object('revision',revision,'stats',json(storage_stats),'complete',0) AS data FROM workspace_control WHERE id=1",...collections.map(key=>query(key,false))];
export const intakeWorkspaceQueries=[workspaceQueries[0],...collections.map(key=>query(key,false,false))];
export const fullWorkspaceQueries=["SELECT 'control' AS collection,0 AS ordinal,json_object('revision',revision,'stats',json(storage_stats),'complete',1) AS data FROM workspace_control WHERE id=1",...collections.map(key=>query(key,true))];
export type WorkspaceRow={collection:string;ordinal:number;data:string};
export function decodeWorkspace(rows:WorkspaceRow[]):State {
 const control=rows.find(row=>row.collection==='control'),state=empty(),held=new Map<Collection,Map<string,{ordinal:number;data:string}>>(collections.map(key=>[key,new Map()]));
 const data=control?JSON.parse(control.data):{};state.revision=data.revision??0;
 if(!Number.isSafeInteger(state.revision)||state.revision<0)fail('Stored workspace revision is inconsistent',503);
 for(const row of rows){if(row.collection==='control')continue;const key=row.collection as Collection,value=JSON.parse(row.data);((state as any)[key]??=[]).push(value);held.get(key)!.set(value.id,{ordinal:row.ordinal,data:row.data});}
 origins.set(state,{rows:held,stats:data.stats??{},complete:!!data.complete});return state;
}
async function loadQueries(db:D1Database,queries:string[]):Promise<State> {
 await ensureAccounting(db);return decodeWorkspace((await db.batch<WorkspaceRow>(queries.map(q=>db.prepare(q)))).flatMap(r=>r.results));
}
export const loadWorkspace=(db:D1Database)=>loadQueries(db,workspaceQueries);
export const loadIntakeWorkspace=(db:D1Database)=>loadQueries(db,intakeWorkspaceQueries);
export async function loadCompleteWorkspace(db:D1Database,limit:number):Promise<State> {
 const {guardWorkspaceExport}=await import('./workspace-accounting.ts');await guardWorkspaceExport(db,limit);
 return decodeWorkspace((await db.batch<WorkspaceRow>(fullWorkspaceQueries.map(q=>db.prepare(q)))).flatMap(r=>r.results));
}
export function mergeWorkspaceRows(state:State,rows:WorkspaceRow[]) {
 const origin=origins.get(state)!;
 for(const row of rows){const key=row.collection as Collection,value=JSON.parse(row.data),held=origin.rows.get(key)!;if(held.has(value.id))continue;((state as any)[key]??=[]).push(value);held.set(value.id,{ordinal:row.ordinal,data:row.data});}
 for(const key of new Set(rows.map(r=>r.collection as Collection)))((state as any)[key]??=[]).sort((a:any,b:any)=>(origin.rows.get(key)!.get(a.id)?.ordinal??Infinity)-(origin.rows.get(key)!.get(b.id)?.ordinal??Infinity));
}
export function workspaceRows(db:D1Database,state:State,token:string):D1PreparedStatement[] {
 const gate='EXISTS(SELECT 1 FROM workspace_control WHERE id=1 AND write_token=?)',origin=origins.get(state);
 const statements=collections.flatMap(key=>{
  const old=origin?.rows.get(key),partial=origin&&!origin.complete&&partialCollections.has(key);let next=origin?.stats[key]?.max??-1;
  const rows=(state[key]??[]).map((row,ordinal)=>({id:row.id,ordinal:partial?(old?.get(row.id)?.ordinal??++next):ordinal,data:JSON.stringify(key==='intakeReceipts'?storedReceipt(row as any):row)})),ids=new Set(rows.map(r=>r.id)),removed=old?[...old.keys()].filter(id=>!ids.has(id)):undefined,writes:D1PreparedStatement[]=[];
  if(removed?.length)writes.push(db.prepare(`DELETE FROM ${tables[key]} WHERE id IN (SELECT value FROM json_each(?)) AND ${gate}`).bind(JSON.stringify(removed),token));
  if(!old)writes.push(db.prepare(`DELETE FROM ${tables[key]} WHERE id NOT IN (SELECT value FROM json_each(?)) AND ${gate}`).bind(JSON.stringify([...ids]),token));
  const changed=rows.filter(row=>!old||old.get(row.id)?.data!==row.data||old.get(row.id)?.ordinal!==row.ordinal);
  for(let i=0;i<changed.length;i+=32)writes.push(db.prepare(`INSERT INTO ${tables[key]}(id,ordinal,data) SELECT json_extract(value,'$.id'),json_extract(value,'$.ordinal'),json_extract(value,'$.data') FROM json_each(?) WHERE ${gate} ON CONFLICT(id) DO UPDATE SET ordinal=excluded.ordinal,data=excluded.data WHERE ordinal<>excluded.ordinal OR data<>excluded.data`).bind(JSON.stringify(changed.slice(i,i+32)),token));
  return writes;
 });
 return [...statements,...nativePrefixWrites(db,state.intakeReceipts??[],token,origin&&new Set(origin.rows.get('intakeReceipts')?.keys()))];
}
export function workspaceWrite(db:D1Database,state:State,revision:number,authority:{sql:string;values:(string|number|null)[]},token=crypto.randomUUID()) {
 state.revision=revision+1;checkWorkspaceSize(state);
 return [db.prepare(`UPDATE workspace_control SET revision=?,write_token=? WHERE id=1 AND revision=? AND ${authority.sql}`).bind(state.revision,token,revision,...authority.values),...workspaceRows(db,state,token)];
}
export function checkWorkspaceSize(state:State){if(authoredSize(state)>1000000)fail('Workspace storage profile exceeded; export before extending it',429);}
