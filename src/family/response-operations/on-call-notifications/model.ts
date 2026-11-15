import {servicePolicy} from '../escalation';
import {coverage,type Schedule} from '../schedules.ts';
import {validatePolicy,type EscalationPolicy} from '../escalation.ts';
import {fail,type Alert,type Entry,type Incident,type State} from '../domain.ts';
import {memberNotificationRules,validateNotificationRules,type Contact,type NotificationRule} from './rules.ts';

/**
 * an accepted alert on a service with an escalation policy is assigned to the rota's
 * current on-call person and expands into per-person notification RECORDS. Nothing is sent: every record
 * says "no sender", paging stays OFF and deliver() is never called.
 */
export const onCallActor = 'system:on-call';
export type OnCallRecord = {
  id:string; step:1|2; member:string|null; contact:Contact|null; rule:NotificationRule|null;
  dueAt:string; recordedAt:string|null; state:'pending'|'recorded'|'stopped'; sender:'none'; outcome:string;
};
export type OnCallRun = {
  id:string; paging:'off'; automatic:false; label:'no sender'; state:'running'|'stopped'|'completed';
  policy:{retrySeconds:number;maxAttempts:number;service:string;revision:number;scheduleId:string;secondStep:'backup'|'primary'|'none';primaryWaitSeconds:number;backupWaitSeconds:number};
  urgency:'high'|'low'; incident:string|null; assignee:string|null;
  startedAt:string; secondStepAt:string; endsAt:string; step:1|2; endedAt:string|null; outcome:string; records:OnCallRecord[];
};
const iso = (ms:number) => new Date(ms).toISOString();
const noSender = 'recorded only; no sender, paging OFF';

// Admission is synchronous and workspace-only; the intake write that commits it reads the paging archive.
const pendingStarts = new WeakMap<State,Set<string>>();
export function markOnCallStart(state:State,alert:Alert) {
  let ids = pendingStarts.get(state);
  if(!ids)pendingStarts.set(state,ids=new Set());
  ids.add(alert.id);
}
/** Called by intake writers before their workspace write; a no-op unless this request opened a generation. */
export async function beginOnCall(db:D1Database,state:State) {
  const ids = pendingStarts.get(state);
  if(!ids?.size)return {sql:'1=1',values:[] as number[]};
  const [control,policies,schedules] = await db.batch<{data:string;revision:number}>([db.prepare('SELECT revision FROM paging_control WHERE id=1'),db.prepare('SELECT data FROM paging_policies ORDER BY rowid'),db.prepare('SELECT data FROM paging_schedules ORDER BY rowid')]);
  const revision=control.results[0]?.revision;
  if(!Number.isSafeInteger(revision))fail('Scheduling storage unavailable',503);
  startOnCall(state,policies.results.map(r=>JSON.parse(r.data)),schedules.results.map(r=>JSON.parse(r.data)),Date.now());
  return {sql:'EXISTS(SELECT 1 FROM paging_control WHERE id=1 AND revision=?)',values:[revision]};
}

function stepRecords(state:State,run:OnCallRun,step:1|2,member:string|null,from:number,at:number):OnCallRecord[] {
  const base = {step,member,contact:null,rule:null,dueAt:iso(from),recordedAt:iso(at),state:'recorded' as const,sender:'none' as const};
  if(member===null)return [{id:`${run.id}:${step}:no-one-on-call`,...base,outcome:`No one on call at step ${step}; operator action required; ${noSender}`}];
  const {contacts,rules} = memberNotificationRules(state,member), matching = rules.filter(rule=>rule.urgency===run.urgency);
  if(!matching.length)return [{id:`${run.id}:${step}:${member}:no-rule`,...base,outcome:`No ${run.urgency}-urgency notification rule for this person; ${noSender}`}];
  return matching.map(rule=>({id:`${run.id}:${step}:${rule.id}`,step,member,contact:structuredClone(contacts.find(c=>c.id===rule.contact)!),rule:structuredClone(rule),
    dueAt:iso(from+rule.delayMinutes*60000),recordedAt:null,state:'pending',sender:'none',outcome:`Awaiting due time; ${noSender}`}));
}
function recordDue(run:OnCallRun,at:number,limit=Infinity) {
  for(const r of run.records)if(r.state==='pending'&&Date.parse(r.dueAt)<=Math.min(at,limit)){r.state='recorded';r.recordedAt=iso(at);r.outcome=`Notification recorded; ${noSender}`;}
}
function end(run:OnCallRun,state:'stopped'|'completed',at:number,outcome:string) {
  for(const r of run.records)if(r.state==='pending'){r.state='stopped';r.outcome=outcome;}
  run.state=state;run.endedAt=iso(at);run.outcome=outcome;
}
const linkedIncidents = (state:State,alert:Alert) => state.incidents.filter(i=>i.alerts.includes(alert.id));
const assignedText = (run:OnCallRun,name:string|null) => name
  ? `Assigned the selected responder for escalation policy ${run.policy.service} revision ${run.policy.revision} (rota ${run.policy.scheduleId}) at ${run.startedAt}; notifications ${noSender}.`
  : `No one on call for escalation policy ${run.policy.service} revision ${run.policy.revision} (rota ${run.policy.scheduleId}) at ${run.startedAt}; left unassigned, operator action required; paging OFF.`;

export function startOnCall(state:State,policies:EscalationPolicy[],schedules:Schedule[],now:number) {
  const ids = pendingStarts.get(state);
  pendingStarts.delete(state);
  for(const id of ids??[]) {
    const alert = state.alerts.find(a=>a.id===id);
    if(!alert||alert.onCall||alert.state!=='active'||alert.suppressed||alert.service===null)continue;
    // Services without an escalation policy keep the upstream behaviour exactly.
    const policy = servicePolicy(policies,alert.service!), first = state.events.find(e=>e.id===alert.events[0]);
    if(!policy||!first)continue;
    const t0 = Date.parse(first.acceptedAt), schedule = schedules.find(s=>s.id===policy.scheduleId);
    const target = alert.coordination?.assignee ?? alert.owner ?? (schedule ? coverage(schedule,state.members,t0).primary : null);
    const incident = linkedIncidents(state,alert).find(i=>!i.mergedInto) ?? null;
    const run:OnCallRun = {id:'on-call:'+alert.id,paging:'off',automatic:false,label:'no sender',state:'running',
      policy:{retrySeconds:policy.retrySeconds,maxAttempts:policy.maxAttempts,service:policy.service,revision:policy.revision,scheduleId:policy.scheduleId,secondStep:policy.secondStep??'backup',primaryWaitSeconds:policy.primaryWaitSeconds,backupWaitSeconds:policy.backupWaitSeconds},
      urgency:alert.urgency??'high',incident:incident?.id??null,assignee:target,startedAt:iso(t0),
      secondStepAt:iso(t0+policy.primaryWaitSeconds*1000),endsAt:iso(t0+(policy.primaryWaitSeconds+(policy.secondStep==='none'?0:policy.backupWaitSeconds))*1000),
      step:1,endedAt:null,outcome:`Step 1 recorded; ${noSender}`,records:[]};
    run.records = stepRecords(state,run,1,target,t0,now);
    recordDue(run,now);
    alert.onCall = run;
    if(target){alert.owner??=target;if(alert.obligation)alert.obligation.target={kind:'user',id:target};}
    if(incident&&incident.state==='declared'&&!incident.assignee&&!incident.commander) {
      if(target){incident.assignee=target;run.assignee=target;}
      incident.revision++;
      incident.timeline.push({id:'on-call-assigned:'+run.id,at:iso(now),actor:onCallActor,kind:'on-call-assigned',text:assignedText(run,target&&(state.members.find(m=>m.id===target)?.name??target))});
    }
  }
}
function stopReason(state:State,alert:Alert):string|null {
  if(alert.state==='recovered')return 'Stopped by source recovery';
  const incidents = linkedIncidents(state,alert);
  if(incidents.some(i=>i.state==='resolved'))return 'Stopped: incident resolved';
  if(incidents.some(i=>i.state!=='declared'))return 'Stopped: incident acknowledged';
  if(alert.coordination?.state==='acknowledged')return 'Stopped: alert acknowledged';
  if(alert.coordination?.state==='closed')return 'Stopped: alert closed';
  return null;
}
/** Every workspace write: acknowledgment, resolution or recovery ends later records (records already due stay recorded). */
export function stopOnCall(state:State,now:number) {
  for(const alert of state.alerts) {
    const run = alert.onCall;if(run?.state!=='running')continue;
    const reason = stopReason(state,alert);if(!reason)continue;
    end(run,'stopped',now,reason);
  }
}
/** The minute cron: record due notifications, enter step 2 once, and end after step 2 with no repeat. */
export function advanceOnCall(state:State,schedules:Schedule[],now:number) {
  stopOnCall(state,now);
  for(const alert of state.alerts) {
    const run = alert.onCall;if(run?.state!=='running')continue;
    const second = Date.parse(run.secondStepAt), ends = Date.parse(run.endsAt);
    if(run.policy.secondStep==='none'&&now>=ends){recordDue(run,now,ends-1);end(run,'completed',now,'Escalation ended after step 1; no repeat');continue;}
    if(run.step===1&&now>=second&&run.policy.secondStep!=='none') {
      recordDue(run,now,second-1);
      for(const r of run.records)if(r.state==='pending'){r.state='stopped';r.outcome='Step 1 wait ended; no sender';}
      const schedule = schedules.find(s=>s.id===run.policy.scheduleId), held = schedule ? coverage(schedule,state.members,second) : null;
      run.records.push(...stepRecords(state,run,2,held?.[run.policy.secondStep]??null,second,now));
      run.step = 2;run.outcome = `Step 2 (${run.policy.secondStep} on call) recorded; ${noSender}`;
    }
    recordDue(run,now,ends-1);
    if(now>=ends)end(run,'completed',now,'Escalation ended after step 2; no repeat');
  }
}
export function holdOnCall(state:State) {
  for(const alert of state.alerts)if(alert.onCall?.state==='running')end(alert.onCall,'stopped',Date.now(),'Restored inactive; will not resume');
}
export function eraseOnCallMember(alert:Alert,id:string) {
  for(const r of alert.onCall?.records??[])if(r.member===id){r.contact=null;r.rule=null;if(r.state==='pending'){r.state='stopped';r.outcome='Recipient erased; no sender';}}
}
export function validOnCallEntry(state:State,incident:Incident,entry:Entry) {
  if(entry.actor!==onCallActor||entry.kind!=='on-call-assigned'||!entry.id.startsWith('on-call-assigned:'))return false;
  const run = state.alerts.find(a=>a.onCall?.id===entry.id.slice(17))?.onCall;
  return !!run&&run.incident===incident.id&&(entry.text===assignedText(run,null)||run.assignee!==null&&entry.text===assignedText(run,run.assignee));
}

const date = (v:any) => typeof v==='string'&&Number.isFinite(Date.parse(v));
const shape = (v:any,keys:string[]) => !!v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
export function validateOnCall(state:State,alert:Alert) {
  const run:any = alert.onCall;if(run===undefined)return;
  const member = (id:any) => id===null||state.members.some(m=>m.id===id);
  if(!shape(run,['id','paging','automatic','label','state','policy','urgency','incident','assignee','startedAt','secondStepAt','endsAt','step','endedAt','outcome','records'])||run.id!=='on-call:'+alert.id||
    run.paging!=='off'||run.automatic!==false||run.label!=='no sender'||!['running','stopped','completed'].includes(run.state)||
    !shape(run.policy,['service','revision','scheduleId','secondStep','primaryWaitSeconds','backupWaitSeconds','retrySeconds','maxAttempts'])||run.policy.service!==alert.service||typeof run.policy.scheduleId!=='string'||
    !['backup','primary','none'].includes(run.policy.secondStep)||[run.policy.revision,run.policy.primaryWaitSeconds,run.policy.backupWaitSeconds,run.policy.retrySeconds,run.policy.maxAttempts].some(n=>!Number.isSafeInteger(n)||n<1)||
    !['high','low'].includes(run.urgency)||run.incident!==null&&!state.incidents.some(i=>i.id===run.incident)||!member(run.assignee)||
    ![run.startedAt,run.secondStepAt,run.endsAt].every(date)||Date.parse(run.secondStepAt)!==Date.parse(run.startedAt)+run.policy.primaryWaitSeconds*1000||
    Date.parse(run.endsAt)!==Date.parse(run.secondStepAt)+(run.policy.secondStep==='none'?0:run.policy.backupWaitSeconds)*1000||![1,2].includes(run.step)||
    (run.state==='running'?run.endedAt!==null:!date(run.endedAt))||typeof run.outcome!=='string'||run.outcome.length>1000||
    !Array.isArray(run.records)||run.records.length>200||new Set(run.records.map((r:any)=>r?.id)).size!==run.records.length)fail('Invalid on-call notification run');
  validatePolicy(run.policy);
  const first=state.events.find(e=>e.id===alert.events[0]);
  if(!first||run.startedAt!==first.acceptedAt||run.incident!==null&&!state.incidents.some(i=>i.id===run.incident&&i.service===alert.service)||run.state==='completed'&&(run.step!==(run.policy.secondStep==='none'?1:2)||Date.parse(run.endedAt)<Date.parse(run.endsAt)))fail('Invalid on-call run provenance');
  for(const r of run.records) {
    if(run.policy.secondStep==='none'&&r.step===2)fail('Single-step policy cannot record a second step');
    if(!shape(r,['id','step','member','contact','rule','dueAt','recordedAt','state','sender','outcome'])||typeof r.id!=='string'||!r.id.startsWith(run.id+':')||r.id.length>400||
      ![1,2].includes(r.step)||r.step>run.step||!member(r.member)||r.sender!=='none'||!date(r.dueAt)||typeof r.outcome!=='string'||r.outcome.length>1000||
      !['pending','recorded','stopped'].includes(r.state)||(r.state==='recorded')!==date(r.recordedAt)||r.state!=='recorded'&&r.recordedAt!==null||r.state==='pending'&&run.state!=='running'||
      r.member===null&&(r.contact!==null||r.rule!==null)||r.rule!==null&&r.contact!==null&&r.rule.contact!==r.contact.id)fail('Invalid on-call notification record');
    if((r.contact===null)!==(r.rule===null))fail('Incomplete notification contact/rule snapshot');
    if(r.rule!==null&&(r.rule.urgency!==run.urgency||r.dueAt!==iso(Date.parse(r.step===1?run.startedAt:run.secondStepAt)+r.rule.delayMinutes*60000)))fail('Invalid notification rule due time');
    if(r.recordedAt!==null&&(Date.parse(r.recordedAt)<Date.parse(r.dueAt)||Date.parse(r.dueAt)>=Date.parse(r.step===1?run.secondStepAt:run.endsAt)))fail('Invalid notification recording time');
    if(r.contact!==null)validateNotificationRules({contacts:[r.contact],rules:[r.rule]});
  }
}
