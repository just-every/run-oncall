import { fail, type Alert, type State } from './family/response-operations/domain.ts';

/** The OC-070 generation obligation, shared by every intake source. This is a
 * record only: no sender, timer, provider attempt or authority is created. */
export type AlertObligation = {
  id:string; state:'recorded'|'stopped'; paging:'off'; automatic:false;
  target:{kind:'service'|'user';id:string}; urgency:'high'|'low';
  outcome:null|'stopped by source recovery'; receipt:string|null;
};
export function recordAlertObligation(alert:Alert,receipt:string|null=null) {
  alert.obligation??={id:'alert-obligation:'+alert.id,state:'recorded',paging:'off',automatic:false,
    target:alert.service===null?{kind:'user',id:alert.owner!}:{kind:'service',id:alert.service},
    urgency:alert.urgency??'high',outcome:null,receipt:null};
  alert.obligation.urgency=alert.urgency??'high';
  if(alert.state==='recovered')Object.assign(alert.obligation,{state:'stopped',outcome:'stopped by source recovery',receipt});
}
export function validateAlertObligation(state:State,alert:Alert) {
  const o=alert.obligation;if(o===undefined)return;
  const keys=['id','state','paging','automatic','target','urgency','outcome','receipt'];
  if(!o||Object.keys(o).length!==keys.length||keys.some(k=>!Object.hasOwn(o,k))||typeof o.id!=='string'||!o.id.length||o.id.length>200||o.paging!=='off'||o.automatic!==false||!['recorded','stopped'].includes(o.state)||!['high','low'].includes(o.urgency)||!o.target||Object.keys(o.target).length!==2||o.target.kind!==(alert.service===null?'user':'service')||o.target.id!==(alert.service??alert.owner)||o.receipt!==null&&typeof o.receipt!=='string'||(o.state==='stopped')!==(o.outcome==='stopped by source recovery')||o.state==='recorded'&&o.outcome!==null||o.state==='stopped'&&alert.state!=='recovered')fail('Invalid alert paging obligation');
  if(o.target.kind==='user'&&!state.members.some(m=>m.id===o.target.id))fail('Invalid owner paging obligation');
}
