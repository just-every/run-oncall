import {fail} from './family/response-operations/domain';
const columns='ordinal,id,kind,feature,actor,subject,source,at,before_revision AS beforeRevision,after_revision AS afterRevision,outcome,workspace_before AS workspaceBefore,workspace_after AS workspaceAfter,paging_before AS pagingBefore,paging_after AS pagingAfter,handoff_before AS handoffBefore,handoff_after AS handoffAfter';
export function installAuditExport(api:any,authorize:(c:any,admin?:boolean)=>Promise<unknown>,sessionGuard:(c:any)=>{sql:string;values:any[]}) {
 api.get('/api/audit/export',async(c:any)=>{
  await authorize(c,true);const guard=sessionGuard(c),member=c.get('actor').id;
  const allowed=`${guard.sql} AND EXISTS(SELECT 1 FROM oc_members WHERE id=? AND json_extract(data,'$.active')=1 AND json_extract(data,'$.role')='admin')`;
  const fence=async()=>{if(!await c.env.DB.prepare(`SELECT 1 WHERE ${allowed}`).bind(...guard.values,member).first())fail('Current admin required',403);};
  const maximum=Number((await c.env.DB.prepare(`SELECT COALESCE(MAX(ordinal),-1) AS value FROM oc_admin_audit WHERE ${allowed}`).bind(...guard.values,member).first()).value);
  const page=async(after:number,limit:number)=>{await fence();return (await c.env.DB.prepare(`SELECT ${columns} FROM oc_admin_audit WHERE ordinal>? AND ordinal<=? AND ${allowed} ORDER BY ordinal LIMIT ?`).bind(after,maximum,...guard.values,member,limit).all()).results;};
  const clean=(row:any)=>{const {ordinal,...value}=row;return value;};
  c.header('Content-Disposition','attachment; filename="oncall-audit.json"');
  if(c.req.query('limit')!==undefined){const limit=Number(c.req.query('limit')),after=Number(c.req.query('cursor')??-1);if(!Number.isSafeInteger(limit)||limit<1||limit>100||!Number.isSafeInteger(after))fail('Invalid audit page');const rows=await page(after,limit+1),items=rows.slice(0,limit);return c.json({schemaVersion:1,rows:items.map(clean),nextCursor:rows.length>limit?String(items.at(-1).ordinal):null});}
  await fence();let after=-1,first=true,opened=false,ended=false;const encoder=new TextEncoder();
  return new Response(new ReadableStream({async pull(controller){try{if(!opened){controller.enqueue(encoder.encode('{"schemaVersion":1,"rows":['));opened=true;}const rows=await page(after,100);if(rows.length){controller.enqueue(encoder.encode((first?'':',')+rows.map((r:any)=>JSON.stringify(clean(r))).join(',')));first=false;after=rows.at(-1).ordinal;}if(rows.length<100){controller.enqueue(encoder.encode(']}'));ended=true;controller.close();}}catch(error){if(!ended)controller.error(error);}},cancel(){ended=true;}}),{headers:{'Content-Type':'application/json','Content-Disposition':'attachment; filename="oncall-audit.json"'}});
 });
}
