import {fail} from '../family/response-operations/domain';
import {validateAllowance} from './model';
import type {RoutingDependencies} from '../routing/management';
import {routingSave} from '../routing/management';
export function installAllowances(api:any,deps:RoutingDependencies) {
 api.post('/api/intake/allowances',async(c:any)=>{
  const input=await deps.body(c),state=await deps.state(c,true);
  const value={id:input.id,requests:input.requests,events:input.events};validateAllowance(value);
  if(input.revision!==state.revision)fail('Workspace changed; reload before saving allowances',409);
  const [kind,...parts]=value.id.split(':'),id=parts.join(':');
  if(kind==='intake'?!state.intakeSources?.some(s=>s.id===id):!await c.env.DB.prepare('SELECT id FROM sources WHERE id=?').bind(id).first())fail('Unknown key record',404);
  state.keyAllowances=(state.keyAllowances??[]).filter(v=>v.id!==value.id);state.keyAllowances.push(value);
  state.audit.push({id:crypto.randomUUID(),at:new Date().toISOString(),actor:c.get('actor').id,kind:'key-allowance',text:`Configured allowance for ${value.id}: ${value.requests} requests and ${value.events} new events per rolling minute`});
  await routingSave(c,deps,state);return c.json(value);
 });
}
