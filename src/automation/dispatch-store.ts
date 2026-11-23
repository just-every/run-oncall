import { fail, type Member } from '../family/response-operations/domain';
import type { Client, Endpoint, Outbox } from './model';

export type DispatchGuard={sql:string;values:(string|number|null)[]};
type DataRow={data:string};
const revisionQuery='SELECT revision FROM workspace_control WHERE id=1';
const ready=`json_extract(data,'$.status') IN ('queued','failed')
 AND json_extract(data,'$.authorized')=1 AND julianday(json_extract(data,'$.due'))<=julianday(?)`;
const leaseDue=`json_extract(data,'$.status')='sending' AND julianday(json_extract(data,'$.leaseUntil'))<=julianday(?)`;

export async function dispatchWork(db:D1Database,at:string,id?:string) {
 const [control,leases,readyItems]=await db.batch([
  db.prepare(revisionQuery),
  db.prepare(`SELECT data FROM oc_api_outbox WHERE ${leaseDue}`).bind(at),
  db.prepare(`SELECT data FROM oc_api_outbox WHERE ${ready} ${id?'AND id=?':''} ORDER BY ordinal LIMIT 1`).bind(at,...(id?[id]:[])),
 ]);
 return {
  revision:revision(control.results[0] as {revision:number}|undefined),
  expired:(leases.results as DataRow[]).map(row=>JSON.parse(row.data) as Outbox),
  item:readyItems.results[0]?JSON.parse((readyItems.results[0] as DataRow).data) as Outbox:undefined,
 };
}

function revision(control?:{revision:number}) {
 const value=control?.revision??0;
 if(!Number.isSafeInteger(value)||value<0)fail('Stored workspace revision is inconsistent',503);
 return value;
}

type DispatchRow={
 revision:number; item:string; endpoint:string|null; origin:string|null; receiver:string|null;
 owner:string|null; endpoint_owner:string|null; origin_owner:string|null; receiver_owner:string|null;
 principal:string|null; sponsor:string|null; incident:number;
};

/** Read an operation and only the live records that can authorize its delivery. */
export async function dispatchAuthority(db:D1Database,id:string) {
 const row=await db.prepare(`SELECT w.revision,o.data AS item,e.data AS endpoint,origin.data AS origin,receiver.data AS receiver,
    owner.data AS owner,eo.data AS endpoint_owner,a.data AS origin_owner,b.data AS receiver_owner,c.principal,sponsor.data AS sponsor,
    EXISTS(SELECT 1 FROM oc_incidents i WHERE i.id=json_extract(o.data,'$.incident')
      AND json_extract(i.data,'$.service')=json_extract(o.data,'$.service')) AS incident
  FROM oc_api_outbox o
  CROSS JOIN workspace_control w
  LEFT JOIN oc_api_endpoints e ON e.id=json_extract(o.data,'$.endpoint')
  LEFT JOIN oc_api_clients origin ON origin.id=json_extract(o.data,'$.client')
  LEFT JOIN oc_api_clients receiver ON receiver.id=json_extract(e.data,'$.client')
  LEFT JOIN oc_members owner ON owner.id=json_extract(o.data,'$.owner')
  LEFT JOIN oc_members eo ON eo.id=json_extract(e.data,'$.owner')
  LEFT JOIN oc_members a ON a.id=json_extract(origin.data,'$.owner')
  LEFT JOIN oc_members b ON b.id=json_extract(receiver.data,'$.owner')
  LEFT JOIN oc_agent_outbox c ON c.outbox=o.id
  LEFT JOIN oc_members sponsor ON sponsor.id=json_extract(c.principal,'$.person.id')
  WHERE o.id=? AND w.id=1`).bind(id).first<DispatchRow>();
 if(!row)return null;
 const parse=<T>(data:string|null):T|null=>data===null?null:JSON.parse(data);
 const item=JSON.parse(row.item) as Outbox;
 const endpoint=parse<Endpoint>(row.endpoint),origin=parse<Client>(row.origin),receiver=parse<Client>(row.receiver);
 const activeOwner=(data:string|null)=>{const owner=parse<Member>(data);return owner?.active&&owner.role==='admin';};
 const access=item.authorized&&endpoint?.active&&origin?.active&&receiver?.active
   &&endpoint.revision===item.endpointRevision&&origin.revision===item.clientRevision&&receiver.revision===item.receiverRevision
   &&activeOwner(row.owner)&&activeOwner(row.endpoint_owner)&&activeOwner(row.origin_owner)&&activeOwner(row.receiver_owner)
   &&origin.services.includes(item.service)&&receiver.services.includes(item.service)&&receiver.permissions.includes('incidents:read')
   &&endpoint.services.includes(item.service)&&row.incident?{endpoint,origin,receiver}:null;
 return {revision:revision(row),item,access,principal:row.principal,sponsorActive:activeOwner(row.sponsor)};
}

export async function persistDispatch(db:D1Database,revision:number,items:Outbox[],guard:DispatchGuard) {
 const token=crypto.randomUUID();
 // The workspace CAS and the audited batch still fence delivery. Only these
 // outbox records change; they are outside the authored workspace size limit.
 const statements=[db.prepare(`UPDATE workspace_control SET revision=revision+1,write_token=? WHERE id=1 AND revision=? AND ${guard.sql}`)
   .bind(token,revision,...guard.values)];
 for(let start=0;start<items.length;start+=32) {
  statements.push(db.prepare(`INSERT INTO oc_api_outbox(id,ordinal,data)
   SELECT o.id,o.ordinal,json_extract(record.value,'$.data') FROM json_each(?) record
   CROSS JOIN oc_api_outbox o ON o.id=json_extract(record.value,'$.id')
   WHERE EXISTS(SELECT 1 FROM workspace_control WHERE id=1 AND write_token=?)
   ON CONFLICT(id) DO UPDATE SET data=excluded.data WHERE data<>excluded.data`)
   .bind(JSON.stringify(items.slice(start,start+32).map(item=>({id:item.id,data:JSON.stringify(item)}))),token));
 }
 let result;
 try{result=await db.batch(statements);}
 catch{fail('Outbox transaction rolled back; no state saved',503);}
 if(result[0].meta.changes!==1)fail('Outbox state or authority changed; retry',409);
}
