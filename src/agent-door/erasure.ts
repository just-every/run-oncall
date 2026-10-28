import type {State} from '../family/response-operations/domain'
/** Redact added attribution copies without transferring the historical actor. */
export function eraseAttribution(state:State,subjects:Map<string,string>) {
 const visit=(value:any):void=>{
  if(!value||typeof value!=='object')return
  if(value.preparedBy){
   const p=value.preparedBy
   for(const part of [p.agent,p.sponsor,...p.approvers??[]])if(part&&subjects.has(part.id))part.name=subjects.get(part.id)
   p.label=p.agent.name+' for '+p.sponsor.name
  }
  for(const child of Object.values(value))if(child&&typeof child==='object')visit(child)
 }
 visit(state)
}
/** These new door stores participate in the native erasure transaction. Cached
 * outcomes are redacted in place, retaining replay custody and request digests. */
export async function doorErasure(db:D1Database,identities:string[],names:string[]) {
 const statements:D1PreparedStatement[]=[],tables:string[]=[],changed=new Map<string,Set<string>>()
 const count=(table:string,id:string)=>{if(!changed.has(table))changed.set(table,new Set());changed.get(table)!.add(id)}
 const terms=[...new Set([...identities,...names].filter(Boolean))].sort((a,b)=>b.length-a.length)
 const scrub=(value:any):any=>typeof value==='string'?terms.reduce((s,t)=>s.replaceAll(t,'Erased subject'),value):Array.isArray(value)?value.map(scrub):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([k,v])=>[k,scrub(v)])):value
 for(const [table,key,columns] of [
  ['agent_door_calls','rowid',['outcome']],['agent_door_approvals','id',['saved','approvals','result']],
  ['agent_door_reviews','id',['saved']],['agent_door_audit','id',['row','evidence']],['agent_door_events','id',['uri','event']],
  ['oc_agent_transport','id',['args']],['oc_agent_outbox','id',['principal']],['oc_agent_deadlines','id',['principal']],
 ] as const) {
  const rows=(await db.prepare(`SELECT ${key} AS record_key,${columns.join(',')} FROM ${table}`).all<Record<string,any>>()).results
  for(const row of rows)for(const column of columns){
   const original=row[column];if(!original)continue
   const next=column==='uri'?scrub(original):JSON.stringify(scrub(JSON.parse(original)))
   if(next===original)continue
   if(!tables.includes(table))tables.push(table)
   count(table,String(row.record_key))
   statements.push(db.prepare(`INSERT INTO rer_erasure_guard(value) SELECT CASE WHEN EXISTS(SELECT 1 FROM ${table} WHERE ${key}=? AND ${column}=?) THEN 1 ELSE 0 END`).bind(row.record_key,original),
    db.prepare(`UPDATE ${table} SET ${column}=?${table==='agent_door_approvals'?",state='expired',version=version+1":table==='agent_door_reviews'?",state='closed'":''} WHERE ${key}=?`).bind(next,row.record_key))
  }
 }
 for(const row of (await db.prepare('SELECT id,name,sponsor,sponsor_name,revoked FROM agent_door_agents').all<{id:string;name:string;sponsor:string;sponsor_name:string;revoked:number}>()).results){
  const name=scrub(row.name),sponsor=scrub(row.sponsor_name)
  if(name!==row.name||sponsor!==row.sponsor_name){count('agent_door_agents',row.id);statements.push(db.prepare('INSERT INTO rer_erasure_guard(value) SELECT CASE WHEN EXISTS(SELECT 1 FROM agent_door_agents WHERE id=? AND name=? AND sponsor_name=?) THEN 1 ELSE 0 END').bind(row.id,row.name,row.sponsor_name),db.prepare('UPDATE agent_door_agents SET name=?,sponsor_name=? WHERE id=?').bind(name,sponsor,row.id))}
  if(!row.revoked&&(identities.includes(row.id)||identities.includes(row.sponsor)))count('agent_door_agents',row.id)
 }
 const ids=JSON.stringify(identities)
 statements.push(db.prepare("UPDATE agent_door_agents SET name=CASE WHEN id IN (SELECT value FROM json_each(?)) THEN 'Erased agent' ELSE name END,sponsor_name=CASE WHEN sponsor IN (SELECT value FROM json_each(?)) THEN 'Erased member' ELSE sponsor_name END,revoked=1 WHERE id IN (SELECT value FROM json_each(?)) OR sponsor IN (SELECT value FROM json_each(?))").bind(ids,ids,ids,ids),
  db.prepare('DELETE FROM bs_team WHERE operator_id IN (SELECT value FROM json_each(?))').bind(ids))
 return {statements,tables:[...tables,'agent_door_agents','bs_team'],updated:Object.fromEntries([...changed].map(([table,rows])=>[table,rows.size]))}
}
