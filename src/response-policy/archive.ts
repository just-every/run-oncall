import { fail, type Alert, type Entry, type Event, type Incident, type State } from '../family/response-operations/domain.ts';
import { automaticDeclarationText, cancellationText, responseAdmissionUrgency, sourceRecoveryText } from './model.ts';
import { latestRecovery, responseReceipt } from './receipts.ts';
import { decideResponse, historicalResponsePolicy, responseDate, responseFields, responsePolicyAuditText, validateResponsePolicy } from './rules.ts';
import type { ResponseDecision, IncidentSourceRecovery } from './types.ts';

function decisionShape(value: unknown): ResponseDecision {
  const v = responseFields(value, ['version', 'mode', 'recoveredNotice', 'rule']);
  if (!Number.isSafeInteger(v.version) || (v.version as number) < 0 || !['alert-only', 'incident'].includes(v.mode as string) ||
    !['silent', 'notified'].includes(v.recoveredNotice as string) || v.rule !== null && (typeof v.rule !== 'string' || !v.rule.trim() || v.rule.length > 100)) fail('Invalid frozen response decision');
  return v as ResponseDecision;
}
function sameDecision(a: ResponseDecision, b: ResponseDecision) {
  return a.version === b.version && a.mode === b.mode && a.recoveredNotice === b.recoveredNotice && a.rule === b.rule;
}
function validateObligation(state: State, alert: Alert) {
  const o = alert.obligation;
  if (!o) return;
  const extras = [o.stoppedAt, o.cancellation, o.recoveryNotice];
  if (o.policy === undefined) {
    if (extras.some(v => v !== undefined)) fail('Recovery fields require a frozen response policy');
    return;
  }
  const decision = decisionShape(o.policy), first = state.events.find(e => e.id === alert.events[0]);
  const policies = state.services.find(s => s.id === alert.service)?.responsePolicies ?? [];
  const policy = policies.find(p => p.version === decision.version);
  if (decision.version === 0) {
    if (!sameDecision(decision, decideResponse(undefined, '', '', null))) fail('Invalid default response decision');
  } else {
    if (!first || !policy || Date.parse(policy.at) > Date.parse(first.acceptedAt) || historicalResponsePolicy(state, alert.service, first.acceptedAt)?.version !== policy.version ||
      !sameDecision(decision, decideResponse(policy, responseAdmissionUrgency(state, alert, first), first.severity, first.decision.policy))) fail('Invalid response policy admission reference');
  }
  if (o.state !== 'stopped') {
    if (extras.some(v => v !== undefined) || o.receipt !== null || alert.state !== 'active') fail('Active response obligation contains a recovery outcome');
    return;
  }
  if(o.outcome==='stopped by human resolution'){if(alert.coordination?.state!=='closed'||o.receipt!==null||extras.some(v=>v!==undefined)||!alert.coordination.history.some(entry=>entry.kind==='bulk-resolve'))fail('Invalid human alert resolution provenance');return;}
  const recovered = alert.events.map(id => state.events.find(e => e.id === id)).find(e => e?.intent === 'recover');
  const reference = typeof o.receipt === 'string' ? responseReceipt(state, o.receipt) : undefined;
  if (!recovered || !reference || reference.alert.id !== alert.id || reference.event.id !== recovered.id ||
    alert.state !== 'recovered' || o.stoppedAt !== recovered.acceptedAt || !responseDate(o.stoppedAt) ||
    o.cancellation !== cancellationText || !o.recoveryNotice) fail('Invalid source recovery obligation provenance');
  const n = responseFields(o.recoveryNotice, ['state', 'automatic', 'label', 'mode', 'recipients']);
  if (n.automatic !== false || n.label !== 'no sender until OC-026' || n.mode !== decision.recoveredNotice ||
    n.state !== (n.mode === 'silent' ? 'silent' : 'recorded') || !Array.isArray(n.recipients) || n.recipients.length !== 0) fail('Recovery notice cannot assert unimplemented delivery');
}

function automaticEvent(state: State, incident: Incident): Event | undefined {
  const a = incident.automaticDeclaration;
  if (!a) return undefined;
  responseFields(a, ['alert', 'event', 'receipt', 'policyVersion', 'rule', 'by']);
  if (typeof a.alert !== 'string' || typeof a.event !== 'string' || typeof a.receipt !== 'string' || typeof a.by !== 'string' ||
    !Number.isSafeInteger(a.policyVersion) || a.policyVersion < 1 || a.rule !== null && typeof a.rule !== 'string') return undefined;
  const alert = state.alerts.find(row => row.id === a.alert && row.service === incident.service && (incident.alerts.includes(row.id) || state.incidents.some(child=>child.splitFrom?.incident===incident.id&&child.splitFrom.alerts.includes(row.id))));
  const event = state.events.find(row => row.id === a.event && alert?.events.includes(row.id));
  const policy = state.services.find(s => s.id === incident.service)?.responsePolicies?.find(p => p.version === a.policyVersion);
  const receipt = responseReceipt(state, a.receipt);
  if (!alert || !event || event.intent !== 'trigger' || !receipt || receipt.event.id !== event.id || receipt.alert.id !== alert.id ||
    !policy || policy.by !== a.by || !state.members.some(m => m.id === a.by) || alert.obligation?.policy?.mode !== 'incident' ||
    alert.obligation.policy.version !== a.policyVersion || alert.obligation.policy.rule !== a.rule ||
    incident.createdAt !== event.acceptedAt || incident.timeline[0]?.at !== event.acceptedAt) return undefined;
  return event;
}
function validDeclaredEntry(state: State, incident: Incident, entry: Entry) {
  const event = automaticEvent(state, incident), a = incident.automaticDeclaration;
  if (!event || !a || entry !== incident.timeline[0]) return false;
  const metadata = responseFields(entry.metadata, ['event', 'policyVersion', 'rule']);
  const lifecycle = responseFields(entry.lifecycle, ['from', 'to']);
  return entry.kind === 'declared' && entry.actor === `source:${event.source}` && entry.at === event.acceptedAt &&
    entry.text === automaticDeclarationText(event, a.policyVersion, a.rule) && metadata.event === a.event &&
    metadata.policyVersion === a.policyVersion && metadata.rule === a.rule && lifecycle.from === null && lifecycle.to === 'declared' && entry.operationId === undefined && entry.review === undefined;
}
type RetainedRecovery = IncidentSourceRecovery & {alerts?:string[]};
const recoveryMarkers = (incident:Incident): RetainedRecovery[] => [...(incident.sourceRecovery?[incident.sourceRecovery]:[]),...(incident.sourceRecoveryHistory??[])];
function recoveryEvent(state: State, incident: Incident, marker:RetainedRecovery): Event | undefined {
  const ids=marker.alerts??incident.alerts,alerts=state.alerts.filter(a=>ids.includes(a.id));
  if(!alerts.length||alerts.length!==ids.length||alerts.some(a=>a.state!=='recovered'))return undefined;
  if(marker.receipt===null)return latestRecovery(state,alerts);
  const reference=responseReceipt(state,marker.receipt);
  return reference&&reference.event.intent==='recover'&&ids.includes(reference.alert.id)?reference.event:undefined;
}
function validRecoveryEntry(state:State,incident:Incident,entry:Entry) {
 const marker=recoveryMarkers(incident).find(s=>s.reminder.id===entry.id),event=marker&&recoveryEvent(state,incident,marker);
 if(!marker||!event)return false;
 const metadata=responseFields(entry.metadata,['receipt']);
 return entry.kind==='source-recovery'&&entry.at===marker.at&&metadata.receipt===marker.receipt&&entry.text===sourceRecoveryText&&
  entry.lifecycle===undefined&&entry.operationId===undefined&&entry.review===undefined&&
  (entry.actor===`source:${event.source}`||state.members.some(m=>m.id===entry.actor)||state.apiClients?.some(c=>c.id===entry.actor)===true);
}

/** The sole exception for source-attributed incident entries: validate the complete provenance first. */
export function validResponseSourceEntry(state: State, incident: Incident, entry: Entry): boolean {
  if (!entry.actor.startsWith('source:')) return false;
  try {
    return entry.kind === 'declared' ? validDeclaredEntry(state, incident, entry) :
      entry.kind === 'source-recovery' ? validRecoveryEntry(state, incident, entry) : false;
  } catch { return false; }
}

function validateIncidentRecovery(state:State,incident:Incident) {
 if(incident.sourceRecoveryHistory!==undefined&&(!Array.isArray(incident.sourceRecoveryHistory)||!incident.sourceRecoveryHistory.length||incident.sourceRecoveryHistory.length>10000))fail('Invalid retained source recovery history');
 const markers=recoveryMarkers(incident),ids=new Set<string>();
 for(const marker of markers){
  const historical=marker!==incident.sourceRecovery;
  responseFields(marker,['at','receipt','reminder',...(historical?['alerts']:[])]);
  responseFields(marker.reminder,['id','commander','automatic','label','state']);
  const linked=marker.alerts??incident.alerts,event=recoveryEvent(state,incident,marker),r=marker.reminder;
  if(historical&&(!Array.isArray(marker.alerts)||!marker.alerts.length||new Set(marker.alerts).size!==marker.alerts.length))fail('Invalid historical recovery alert set');
  if(!responseDate(marker.at)||marker.receipt!==null&&(typeof marker.receipt!=='string'||!marker.receipt)||!event||Date.parse(event.acceptedAt)>Date.parse(marker.at)||
   Date.parse(incident.createdAt)>Date.parse(marker.at)||typeof r.id!=='string'||!r.id.trim()||r.id.length>100||ids.has(r.id)||
   r.commander!==null&&!state.members.some(m=>m.id===r.commander)||r.automatic!==false||r.label!=='no timer until OC-027'||!['recorded','completed'].includes(r.state)||
   !historical&&(r.commander!==incident.commander||r.state!==(incident.state==='resolved'?'completed':'recorded'))||incident.revision<2||
   linked.some(id=>!state.events.some(e=>e.intent==='recover'&&state.alerts.find(a=>a.id===id)?.events.includes(e.id)&&Date.parse(e.acceptedAt)<=Date.parse(marker.at))))fail('Invalid incident source recovery reminder');
  ids.add(r.id);
  const entries=incident.timeline.filter(e=>e.id===r.id&&e.kind==='source-recovery');
  if(entries.length!==1||!validRecoveryEntry(state,incident,entries[0]))fail('Missing source recovery timeline attribution');
 }
 if(incident.timeline.filter(e=>e.kind==='source-recovery').length!==markers.length)fail('Orphan source recovery history');
}

/** Optional additions preserve legacy archives; present fields must be complete and internally attributable. */
export function validateResponseArchive(state: State) {
  for (const service of state.services) {
    if (service.responsePolicies === undefined) continue;
    const history = service.responsePolicies;
    if (!Array.isArray(history) || !history.length || history.length > 100) fail('Invalid service response policy history');
    for (let i = 0; i < history.length; i++) {
      const p = validateResponsePolicy(history[i]);
      if (p.version !== i + 1 || i > 0 && Date.parse(p.at) < Date.parse(history[i - 1].at) ||
        !state.members.some(m => m.id === p.by) || p.rules.some(r => r.policy !== '*' && !state.policies.some(v => v.id === r.policy && v.service === service.id)) ||
        !state.audit.some(e => e.kind === 'response-policy' && e.actor === p.by && e.at === p.at && e.text === responsePolicyAuditText(service, p))) fail('Invalid response policy attribution or history');
    }
  }
  for (const alert of state.alerts) validateObligation(state, alert);
  for (const entry of state.audit) if (Object.hasOwn(entry, 'metadata')) fail('Response metadata is only valid on attributed incident entries');
  const automaticAlerts = new Set<string>();
  for (const incident of state.incidents) {
    if (incident.automaticDeclaration !== undefined) {
      if (!automaticEvent(state, incident) || !validDeclaredEntry(state, incident, incident.timeline[0]) || automaticAlerts.has(incident.automaticDeclaration.alert)) fail('Invalid automatic incident declaration provenance');
      automaticAlerts.add(incident.automaticDeclaration.alert);
    }
    validateIncidentRecovery(state, incident);
    for (const entry of incident.timeline) {
      if (Object.hasOwn(entry, 'metadata') && !(entry.kind === 'declared' && validDeclaredEntry(state, incident, entry)) &&
        !(entry.kind === 'source-recovery' && validRecoveryEntry(state, incident, entry))) fail('Invalid response timeline metadata');
      if (entry.actor.startsWith('source:') && !validResponseSourceEntry(state, incident, entry)) fail('Invalid source-attributed incident timeline');
    }
  }
}
