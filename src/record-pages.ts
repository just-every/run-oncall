import {alertPageSummaries} from './record-summaries';
import {fail} from './family/response-operations/domain';
import {tables,type Collection} from './workspace-tables';
const supported=new Set(['alerts','events','intakeReceipts','audit']);
type Row={id:string;ordinal:number;data:string};
export function installRecordPages(api:any,authorize:(c:any,admin?:boolean)=>Promise<unknown>) {
 api.get('/api/records/:collection',async(c:any)=>{
  const key=c.req.param('collection') as Collection;if(!supported.has(key))fail('Record collection not found',404);
  await authorize(c);
  const q=c.req.query(),limit=Number(q.limit??25);if(!Number.isInteger(limit)||limit<1||limit>100)fail('Page limit must be 1 to 100');
  const filters:string[]=[],values:any[]=[];
  if(q.source){filters.push("json_extract(r.data,'$.source')=?");values.push(q.source);}
  const monitoring="json_extract(r.data,'$.provider') IN ('alertmanager','grafana','datadog')";
  if(q.providerGroup){if(key!=='intakeReceipts'||q.providerGroup!=='monitoring')fail('Invalid provider filter');filters.push(monitoring);}
  if(q.outcome){if(key!=='intakeReceipts'||q.outcome!=='unrouted')fail('Invalid outcome filter');filters.push("json_extract(r.data,'$.outcome')='unrouted'");}
  if(q.unreadmitted==='true'){if(key!=='intakeReceipts')fail('Invalid readmission filter');filters.push("NOT EXISTS(SELECT 1 FROM oc_intake_receipts x WHERE json_extract(x.data,'$.routing.readmission.receipt')=r.id)");}
  const where=filters.length?filters.join(' AND '):'1';let pageWhere=where,pageValues=[...values];
  if(q.cursor){let cursor:any;try{cursor=JSON.parse(atob(q.cursor));}catch{fail('Invalid record cursor');}if(!Number.isSafeInteger(cursor?.ordinal)||typeof cursor?.id!=='string')fail('Invalid record cursor');pageWhere+=' AND (r.ordinal<? OR (r.ordinal=? AND r.id<?))';pageValues.push(cursor.ordinal,cursor.ordinal,cursor.id);}
  const result=await c.env.DB.batch([
   c.env.DB.prepare('SELECT revision FROM workspace_control WHERE id=1'),
   c.env.DB.prepare(`SELECT COUNT(*) AS total FROM ${tables[key]} r WHERE ${where}`).bind(...values),
   c.env.DB.prepare(`SELECT r.id,r.ordinal,r.data FROM ${tables[key]} r WHERE ${pageWhere} ORDER BY r.ordinal DESC,r.id DESC LIMIT ?`).bind(...pageValues,limit+1),
  ]);
  const rows=result[2].results as Row[],more=rows.length>limit,held=rows.slice(0,limit),items=held.map(r=>JSON.parse(r.data)),last=held.at(-1),extra:any={};
  if(key==='alerts')extra.summaries=await alertPageSummaries(c.env.DB,items.map(a=>a.id));
  if(key==='intakeReceipts'){
   const ids=JSON.stringify(items.map(r=>r.id));
   extra.readmitted=(await c.env.DB.prepare("SELECT DISTINCT json_extract(data,'$.routing.readmission.receipt') AS id FROM oc_intake_receipts WHERE json_extract(data,'$.routing.readmission.receipt') IN (SELECT value FROM json_each(?))").bind(ids).all()).results.map((r:any)=>r.id);
   extra.countsBySource=Object.fromEntries((await c.env.DB.prepare(`SELECT json_extract(r.data,'$.source') AS source,COUNT(*) AS count FROM oc_intake_receipts r ${q.providerGroup?'WHERE '+monitoring:''} GROUP BY source`).all()).results.map((r:any)=>[r.source,r.count]));
  }
  if(key==='events')extra.sourceTimeMissing=(await c.env.DB.prepare("SELECT json_extract(data,'$.event') AS id FROM oc_intake_receipts WHERE json_extract(data,'$.observedAt') IS NULL AND json_extract(data,'$.event') IN (SELECT value FROM json_each(?))").bind(JSON.stringify(items.map(r=>r.id))).all()).results.map((r:any)=>r.id);
  const current=await c.env.DB.prepare('SELECT revision FROM workspace_control WHERE id=1').first();if(current?.revision!==result[0].results[0]?.revision)fail('Workspace changed; refresh this record page',409);
  return c.json({items,total:result[1].results[0].total,workspaceRevision:result[0].results[0]?.revision??0,nextCursor:more&&last?btoa(JSON.stringify({ordinal:last.ordinal,id:last.id})):null,...extra});
 });
}
