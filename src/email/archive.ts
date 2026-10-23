import { fail, text, type State } from '../family/response-operations/domain.ts';
import { exact, routingDate } from '../routing/definition.ts';
import { emailDraft, decideEmail } from './rules.ts';
export function validateEmailArchive(state:State) {
  for(const key of ['emailAddresses','emailRules','emailSamples','emailReceipts','emailQuarantine'] as const) {
    const rows=state[key];if(rows!==undefined&&(!Array.isArray(rows)||rows.length>10000||rows.some(r=>!r||typeof r.id!=='string')||new Set(rows.map(r=>r.id)).size!==rows.length))fail('Invalid email archive identities');
  }
  const addresses=state.emailAddresses??[],rules=state.emailRules??[],receipts=state.emailReceipts??[],samples=state.emailSamples??[];
  for(const a of addresses) {
    exact(a,['id','name','service','environment','owner','active','revision','at']);text(a.id,'Address ID',80);text(a.name,'Address name',100);
    if(typeof a.active!=='boolean'||!Number.isSafeInteger(a.revision)||a.revision<1||!routingDate(a.at)||!state.services.some(s=>s.id===a.service)||typeof a.environment!=='string'||!a.environment.trim()||a.environment.length>100||!state.members.some(m=>m.id===a.owner))fail('Invalid email address mapping');
    const versions=rules.filter(v=>v.address===a.id);if(!versions.length||versions.some((v,i)=>v.version!==i+1))fail('Invalid email version history');
  }
  for(const v of rules) {
    exact(v,['id','address','version','mode','fallback','rules','by','at']);emailDraft(v);
    if(!addresses.some(a=>a.id===v.address)||!state.members.some(m=>m.id===v.by)||!routingDate(v.at))fail('Invalid email rule attribution');
  }
  for(const s of samples) {
    exact(s,['id','address','subject','text','sender','at']);
    if(!addresses.some(a=>a.id===s.address)||typeof s.subject!=='string'||s.subject.length>1000||typeof s.sender!=='string'||s.sender.length>320||typeof s.text!=='string'||new TextEncoder().encode(s.text).length>256*1024||!routingDate(s.at)||!receipts.some(r=>r.sample===s.id&&r.address===s.address))fail('Invalid saved email sample');
  }
  for(const r of receipts) {
    exact(r,['id','address','at','messageDigest','deliveries','lastDelivery','lastDiagnostic','sample','decision','outcome','diagnostic','alert','event','generation','obligation','stop']);
    if(r.lastDiagnostic!==null&&(typeof r.lastDiagnostic!=='string'||!/^[a-z_]{1,100}$/.test(r.lastDiagnostic)))fail('Invalid email delivery diagnostic');
    const address=addresses.find(a=>a.id===r.address);
    if(r.address!==null&&!address||!routingDate(r.at)||!routingDate(r.lastDelivery)||!Number.isSafeInteger(r.deliveries)||r.deliveries<1||r.messageDigest!==null&&!/^[a-f0-9]{64}$/.test(r.messageDigest)||!['opened','deduplicated','recovered','no-effect','quarantined','refused'].includes(r.outcome)||!/^[a-z_]{1,100}$/.test(r.diagnostic))fail('Invalid email receipt');
    if(r.decision) {
      exact(r.decision,['mode','version','rule','key','action','reason','severity'],['urgency','priority']);
      if(!['trigger','resolve','quarantine'].includes(r.decision.action)||r.decision.key!==null&&(typeof r.decision.key!=='string'||r.decision.key.length>200)||!['critical','warning','info'].includes(r.decision.severity)||r.decision.urgency!==undefined&&!['high','low'].includes(r.decision.urgency)||r.decision.priority!==undefined&&!/^P[1-5]$/.test(r.decision.priority))fail('Invalid email rule decision');
    }
    const sample=samples.find(s=>s.id===r.sample),version=rules.find(v=>v.address===r.address&&v.version===r.decision?.version);
    if(r.sample!==null&&!sample||r.decision&&(!version||r.decision.mode!==version.mode||r.decision.rule!==null&&!version.rules.some(rule=>rule.id===r.decision!.rule)))fail('Invalid email explanation reference');
    if(sample&&r.decision&&JSON.stringify(decideEmail(version!,sample,r.id))!==JSON.stringify(r.decision))fail('Email explanation differs from retained input');
    if(['opened','deduplicated','recovered'].includes(r.outcome)) {
      const alert=state.alerts.find(a=>a.id===r.alert&&a.source==='email:'+r.address&&a.service===address?.service&&a.environment===address?.environment&&a.key===r.decision?.key&&a.generation===r.generation);
      const event=state.events.find(e=>e.id===r.event&&e.eventId===r.id&&alert?.events.includes(e.id));
      if(!alert||!event||event.intent!==(r.outcome==='recovered'?'recover':'trigger')||!r.obligation||alert.obligation&&alert.obligation.id!==r.obligation||event.key!==r.decision?.key||r.outcome==='recovered'&&r.stop!=='stopped by source recovery')fail('Invalid email generation reference');
    } else if([r.alert,r.event,r.generation,r.obligation,r.stop].some(v=>v!==null))fail('No-effect mail changed a generation');
  }
  for(const event of state.events.filter(e=>e.source.startsWith('email:')))if(!receipts.some(r=>r.event===event.id&&r.id===event.eventId))fail('Email event lacks its receipt');
  for(const q of state.emailQuarantine??[]) {
    exact(q,['id','receipt','address','reason']);
    if(!receipts.some(r=>r.id===q.receipt&&r.id===q.id&&r.address===q.address&&r.diagnostic===q.reason&&['quarantined','refused'].includes(r.outcome)))fail('Invalid email quarantine');
  }
}
