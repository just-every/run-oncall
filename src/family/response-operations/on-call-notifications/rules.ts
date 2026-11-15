import {fail,type State} from '../domain.ts';
import type {ScheduleRecord} from '../../../schedule-coordination/model.ts';

/** Recorded destinations only: never verified, never handed to a provider. Paging stays OFF. */
export type Contact = {id:string;type:'email'|'phone'|'sms';label:string;address:string;countryCode:number|null};
export type NotificationRule = {id:string;contact:string;delayMinutes:number;urgency:'high'|'low'};
export type NotificationRules = {contacts:Contact[];rules:NotificationRule[]};
export const notificationRulesKind = 'notification-rules';
const identity = /^[A-Za-z0-9_.:-]{1,100}$/;
const exact = (value:any,keys:string[],name:string) => {
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==keys.length||keys.some(k=>!Object.hasOwn(value,k)))fail(`Invalid ${name} fields; expected ${keys.join(', ')}`);
  return value;
};

export function validateNotificationRules(input:any):NotificationRules {
  const v = exact(input,['contacts','rules'],'notification rules');
  if(!Array.isArray(v.contacts)||v.contacts.length>20)fail('Contacts must be a list of at most 20');
  if(!Array.isArray(v.rules)||v.rules.length>40)fail('Notification rules must be a list of at most 40');
  const contacts:Contact[] = v.contacts.map((raw:any) => {
    const c = exact(raw,['id','type','label','address','countryCode'],'contact');
    if(typeof c.id!=='string'||!identity.test(c.id))fail('Contact ID must be 1–100 letters, digits, _ . : or -');
    if(!['email','phone','sms'].includes(c.type))fail('Contact type must be email, phone or sms');
    if(typeof c.label!=='string'||!c.label.trim()||c.label.length>100)fail('Contact label must be 1–100 characters');
    if(typeof c.address!=='string')fail('Contact address is required');
    if(c.type==='email'){
      if(c.countryCode!==null||c.address.length>320||!/^[^\s@]+@[^\s@]+$/.test(c.address))fail('Email contacts need one address with @ and countryCode null');
    } else if(!Number.isSafeInteger(c.countryCode)||c.countryCode<1||c.countryCode>999||!/^[0-9]{4,14}$/.test(c.address)||String(c.countryCode).length+c.address.length>15)
      fail('Phone and SMS contacts need a numeric country calling code and national digits (E.164, at most 15 digits)');
    return {id:c.id,type:c.type,label:c.label.trim(),address:c.address,countryCode:c.countryCode};
  });
  if(new Set(contacts.map(c=>c.id)).size!==contacts.length)fail('Contact IDs must be unique');
  const rules:NotificationRule[] = v.rules.map((raw:any) => {
    const r = exact(raw,['id','contact','delayMinutes','urgency'],'notification rule');
    if(typeof r.id!=='string'||!identity.test(r.id))fail('Rule ID must be 1–100 letters, digits, _ . : or -');
    if(!contacts.some(c=>c.id===r.contact))fail('Each rule must reference one of this member\'s contacts');
    if(!Number.isSafeInteger(r.delayMinutes)||r.delayMinutes<0||r.delayMinutes>1440)fail('Rule delay must be 0–1440 minutes');
    if(!['high','low'].includes(r.urgency))fail('Rule urgency must be high or low');
    return {id:r.id,contact:r.contact,delayMinutes:r.delayMinutes,urgency:r.urgency};
  });
  if(new Set(rules.map(r=>r.id)).size!==rules.length)fail('Rule IDs must be unique');
  return {contacts,rules};
}
export const notificationRulesRecord = (state:State,member:string):ScheduleRecord|undefined =>
  state.scheduleRecords?.find(r=>r.kind===notificationRulesKind&&r.member===member);
export function memberNotificationRules(state:State,member:string):NotificationRules {
  const row = notificationRulesRecord(state,member);
  return row?.active ? row.data as NotificationRules : {contacts:[],rules:[]};
}
export function notificationRulesView(state:State,member:string) {
  const row = notificationRulesRecord(state,member);
  return {member,revision:row?.revision??0,at:row?.at??null,active:row?.active??false,...structuredClone(row?.data??{contacts:[],rules:[]}),
    verified:false,paging:'OFF',label:'Recorded destinations only: never verified and never used for delivery'};
}
/** Admin-authored replacement of one member's complete set, bound to its revision. */
export function writeNotificationRules(state:State,actor:{id:string;role:string;machine?:true},memberId:string,input:any,at:string) {
  if(actor.role!=='admin'||actor.machine)fail('Current admin required',403);
  const member = state.members.find(m=>m.id===memberId&&!m.erased);
  if(!member)fail('Unknown member',404);
  const v = exact(input,['revision','contacts','rules'],'notification rules request');
  const row = notificationRulesRecord(state,member.id);
  if(!Number.isSafeInteger(v.revision)||v.revision!==(row?.revision??0))fail('Notification rules changed; reload and retry',409);
  const data = validateNotificationRules({contacts:v.contacts,rules:v.rules});
  if(row){row.data=data;row.revision++;row.at=at;row.active=true;}
  else {
    const records = state.scheduleRecords ??= [];
    if(records.length>=10000)fail('Schedule coordination history capacity reached',429);
    records.push({id:'notification-rules:'+member.id,kind:notificationRulesKind,member:member.id,active:true,revision:1,at,data});
  }
  state.audit.push({id:crypto.randomUUID(),at,actor:actor.id,kind:notificationRulesKind,text:`Notification rules for member ${member.id}: ${data.contacts.length} contacts, ${data.rules.length} rules; recorded destinations only, never verified or used for delivery; paging OFF`});
  return notificationRulesView(state,member.id);
}
