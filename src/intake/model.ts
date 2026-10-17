import { fail, link, text, type State } from '../family/response-operations/domain.ts';
import type { CompatibleInput, CompatibleProvider } from './provider-types.ts';

export const intakeProviders = ['pagerduty', 'opsgenie', 'splunk'] as const;
export type IntakeProvider = typeof intakeProviders[number];
export type IntakeSource = {id:string;name:string;provider:IntakeProvider;service:string;active:boolean;revision:number;createdBy:string;updatedAt:string};
export type IntakeReceipt = CompatibleInput & {id:string;source:string;provider:CompatibleProvider;service:string;generation:string|null;event:string|null;alert:string|null;acceptedAt:string;outcome:'opened'|'deduplicated'|'recovered'|'acknowledged'|'noted'|'no-effect'};
export const intakeSourceIdentity = (source:string) => 'intake:'+source;
const date = (v:unknown) => typeof v==='string' && /(?:Z|[+-]\d{2}:\d{2})$/i.test(v) && Number.isFinite(Date.parse(v));
function fields(v:any,keys:string[]) {
  if(!v||typeof v!=='object'||Array.isArray(v)||keys.some(k=>!Object.hasOwn(v,k))||Object.keys(v).some(k=>!keys.includes(k)))fail('Invalid compatible intake archive fields');
}
export function pauseIntakeSources(state:State) {for(const source of state.intakeSources??[])source.active=false;return state;}
export function validateIntakeArchive(state:State) {
  for(const key of ['intakeSources','intakeReceipts'] as const) {
    const records=state[key];
    if(records!==undefined&&(!Array.isArray(records)||records.length>10000||new Set(records.map(r=>r.id)).size!==records.length))fail('Invalid intake archive identities');
  }
  for(const s of state.intakeSources??[]) {
    fields(s,['id','name','provider','service','active','revision','createdBy','updatedAt']);
    text(s.id,'Integration ID',80);text(s.name,'Integration name',200);
    if(!intakeProviders.includes(s.provider)||!state.services.some(v=>v.id===s.service)||!state.members.some(v=>v.id===s.createdBy)||typeof s.active!=='boolean'||!Number.isSafeInteger(s.revision)||s.revision<1||!date(s.updatedAt))fail('Invalid intake source');
  }
  for(const r of state.intakeReceipts??[]) {
    fields(r,['id','source','provider','service','generation','event','alert','acceptedAt','outcome','action','key','title','severity','priority','observedAt','sender','links','details','truncated']);
    text(r.id,'Intake receipt ID',100);text(r.key,'Intake key',200);
    if(typeof r.title!=='string'||r.title.length>300||typeof r.sender!=='string'||r.sender.length>200||r.action==='trigger'&&!r.title.trim())fail('Invalid intake text');
    const source=state.intakeSources?.find(s=>s.id===r.source&&s.service===r.service);
    if(!source||!(source.provider==='pagerduty'?['pagerduty-v1','pagerduty-v2'].includes(r.provider):source.provider===r.provider)||!date(r.acceptedAt)||r.observedAt!==null&&!date(r.observedAt)||!['trigger','recover','acknowledge','note'].includes(r.action)||!['critical','warning','info'].includes(r.severity)||r.priority!==null&&!['P1','P2','P3','P4','P5'].includes(r.priority)||typeof r.truncated!=='boolean')fail('Invalid intake receipt');
    const outcomes={trigger:['opened','deduplicated'],recover:['recovered','no-effect'],acknowledge:['acknowledged','no-effect'],note:['noted','no-effect']};
    if(!outcomes[r.action].includes(r.outcome))fail('Invalid intake outcome');
    const alert=r.alert===null?null:state.alerts.find(a=>a.id===r.alert&&a.source===intakeSourceIdentity(r.source)&&a.service===r.service&&a.key===r.key&&a.generation===r.generation);
    if(r.outcome==='no-effect'?(r.alert!==null||r.generation!==null||r.event!==null):!alert)fail('Invalid intake lifecycle reference');
    if(r.event!==null&&!state.events.some(e=>e.id===r.event&&alert?.events.includes(e.id)&&e.eventId===r.id&&e.source===intakeSourceIdentity(r.source)&&e.intent===(r.action==='recover'?'recover':'trigger')))fail('Invalid intake event reference');
    if(['trigger','recover'].includes(r.action)&&r.outcome!=='no-effect'&&r.event===null)fail('Missing intake event');
    if(['acknowledge','note'].includes(r.action)&&r.event!==null)fail('Invalid intake action event');
    if(!Array.isArray(r.links)||r.links.length>8||r.links.some(v=>!v||link(v)!==v))fail('Invalid intake links');
    if(!r.details||typeof r.details!=='object'||Array.isArray(r.details)||new TextEncoder().encode(JSON.stringify(r.details)).length>8192)fail('Invalid intake details');
  }
}
