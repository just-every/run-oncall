import {fail} from '../family/response-operations/domain';
import {openCredential,sourceCustody,changeCustody} from '../changes/credentials';
import {runtimeBindings} from '../auth.server';
import {auditKind,auditIdentity} from '../audit-store';

/** Readback is an explicit admin action. No key enters workspace, audit or archive. */
export function installKeyReveal(api:any,deps:any) {
 api.post('/api/integrations/:kind/:id/reveal',async(c:any)=>{
  const state=await deps.state(c,true),id=c.req.param('id'),kind=c.req.param('kind');
  await deps.body(c);
  const config=kind==='native'?{table:'sources',id:'id',column:'COALESCE(key_custody,signing_custody)',domain:sourceCustody}
   :kind==='intake'?{table:'oc_intake_credentials',id:'source',column:'key_custody',domain:sourceCustody}
   :kind==='change'?{table:'oc_change_credentials',id:'source',column:'ciphertext',domain:changeCustody}:null;
  if(!config)fail('Unknown integration kind',404);
  if(kind!=='native'&&!state[kind==='intake'?'intakeSources':'changeSources']?.some((s:any)=>s.id===id&&s.active))fail('Active source required',404);
  const row=await c.env.DB.prepare(`SELECT ${config.column} AS custody FROM ${config.table} WHERE ${config.id}=?`).bind(id).first();
  if(!row)fail('Unknown source',404);
  if(!row.custody)fail('This older key was stored as a digest only. Rotate it once to enable admin readback.',409);
  const key=await openCredential(row.custody,runtimeBindings(c.env).SESSION_SECRET,config.domain);
  auditKind(c.env.DB,'source.key-reveal');
  auditIdentity(c.env.DB,{source:{kind:'source',id:kind+':'+id},subject:{kind:'source',id:kind+':'+id}});
  const guard=deps.guard(c);
  // The guarded write and permanent audit commit together before any secret is returned.
  // Matching the ciphertext fences a concurrent rotation/revocation as well as role changes.
  const result=await c.env.DB.prepare(`UPDATE ${config.table} SET ${config.id}=${config.id} WHERE ${config.id}=? AND ${config.column}=? AND EXISTS(SELECT 1 FROM workspace_control WHERE revision=?) AND ${guard.sql} AND EXISTS(SELECT 1 FROM oc_members WHERE id=? AND json_extract(data,'$.active')=1 AND json_extract(data,'$.role')='admin')`).bind(id,row.custody,state.revision,...guard.values,c.get('actor').id).run();
  if(result.meta.changes!==1)fail('Source or admin authority changed; reload',409);
  c.header('Cache-Control','private, no-store');
  return c.json({key});
 });
}
