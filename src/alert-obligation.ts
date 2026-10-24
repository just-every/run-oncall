import type { ResponseDecision, RecoveryNotice } from './response-policy/types.ts';
import { fail, type Alert, type State } from './family/response-operations/domain.ts';

/** The OC-070 generation obligation, shared by every intake source. This is a
 * record only: no sender, timer, provider attempt or authority is created. */
export type AlertObligation = {
  policy?:ResponseDecision; stoppedAt?:string; cancellation?:string; recoveryNotice?:RecoveryNotice;
  id:string; state:'recorded'|'stopped'; paging:'off'; automatic:false;
  target:{kind:'service'|'user';id:string}; urgency:'high'|'low';
  outcome:null|'stopped by source recovery'|'stopped by human resolution'; receipt:string|null;
};
export function recordAlertObligation(alert:Alert,receipt:string|null=null) {
  alert.obligation??={id:alert.source.startsWith('email:')?'email-obligation:'+alert.generation:'alert-obligation:'+alert.id,state:'recorded',paging:'off',automatic:false,
    target:alert.service===null?{kind:'user',id:alert.owner!}:{kind:'service',id:alert.service},
    urgency:alert.urgency??'high',outcome:null,receipt:null};
  alert.obligation.urgency=alert.urgency??'high';
  if(alert.state==='recovered'&&alert.obligation.state!=='stopped')Object.assign(alert.obligation,{state:'stopped',outcome:'stopped by source recovery',receipt});
}
export function validateAlertObligation(state:State,alert:Alert) {
  const o=alert.obligation;if(o===undefined)return;
  const keys=['id','state','paging','automatic','target','urgency','outcome','receipt'];
  if(!o||Object.keys(o).some(k=>![...keys,'policy','stoppedAt','cancellation','recoveryNotice'].includes(k))||keys.some(k=>!Object.hasOwn(o,k))||typeof o.id!=='string'||!o.id.length||o.id.length>200||o.paging!=='off'||o.automatic!==false||!['recorded','stopped'].includes(o.state)||!['high','low'].includes(o.urgency)||!o.target||Object.keys(o.target).length!==2||o.target.kind!==(alert.service===null?'user':'service')||o.target.id!==(alert.service??alert.owner)||o.receipt!==null&&typeof o.receipt!=='string'||(o.state==='stopped')!==(['stopped by source recovery','stopped by human resolution'].includes(o.outcome??''))||o.state==='recorded'&&o.outcome!==null||o.state==='stopped'&&!(o.outcome==='stopped by source recovery'&&alert.state==='recovered'||o.outcome==='stopped by human resolution'&&alert.coordination?.state==='closed'))fail('Invalid alert paging obligation');
  if(o.target.kind==='user'&&!state.members.some(m=>m.id===o.target.id))fail('Invalid owner paging obligation');
}

/** Subscriber impact custody extends the same record-only obligation family. */
export type StatusNoticeObligation = {
  id: string; kind: 'business-status'; state: 'recorded' | 'stopped'; paging: 'off'; automatic: false;
  label: 'no sender'; target: {kind: 'user'; id: string}; channel: 'email' | 'push' | 'chat';
  businessService: string; businessName: string; derivedStatus: 'degraded' | 'major outage';
  approvedUpdate: null; at: string;
};

/** Human-origin pages and responder requests retain obligations with delivery off. */
export type RecordedResponseObligation = {
  reason?:'schedule-change';
  id:string;state:'recorded'|'stopped';paging:'off';automatic:false;label:'no sender';
  target:import('./manual-pages/types').ResponseTarget;urgency:'high'|'low';creator:string;
  at:string;outcome:string;assignment?:import('./manual-pages/types').AssignmentRule;
};
