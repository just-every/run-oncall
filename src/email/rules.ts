import { fail, text } from '../family/response-operations/domain';
import { exact, routingPattern } from '../routing/definition';
import { modes, type EmailVersion, type EmailRule, type EmailDecision, type EmailSample } from './types';
export const normalizedSubject=(value:string)=>value.replace(/^(?:\s*(?:re|fwd|fw):\s*)+/i,'').trim().replace(/\s+/g,' ');
export function emailDraft(input:any):Pick<EmailVersion,'mode'|'fallback'|'rules'> {
  if(!modes.includes(input.mode)||!['subject','quarantine'].includes(input.fallback)||!Array.isArray(input.rules)||input.rules.length>20)fail('Choose an email mode, fallback and up to 20 ordered rules');
  const ids=new Set<string>();
  for(const rule of input.rules) {
    exact(rule,['id','action','match','conditions','key'],['severity','urgency','priority']);
    const id=text(rule.id,'Email rule ID',80);if(id!==rule.id||ids.has(id))fail('Email rule IDs must be distinct');ids.add(id);
    if(!['trigger','resolve'].includes(rule.action)||!['all','any'].includes(rule.match)||!Array.isArray(rule.conditions)||!rule.conditions.length||rule.conditions.length>20)fail('Rules need an action, all/any and 1–20 conditions');
    if(input.mode!=='custom'&&rule.action!=='resolve')fail('Modes 1–3 carry resolve rules only; use custom mode for trigger rules');
    for(const c of rule.conditions) {
      exact(c,['field','op','value']);
      if(!['sender','subject','text'].includes(c.field)||!['contains','equals','matches','not-matches'].includes(c.op)||typeof c.value!=='string'||c.value.length>1000)fail('Invalid email condition');
      if(c.op==='matches'||c.op==='not-matches')routingPattern(c.value);
    }
    if(!['subject','text'].includes(rule.key?.field))fail('Choose subject or text for key extraction');
    if(rule.key.kind==='markers') {exact(rule.key,['field','kind','start','end']);text(rule.key.start,'Opening marker',200);text(rule.key.end,'Closing marker',200);}
    else {exact(rule.key,['field','kind','pattern','group']);const pattern=routingPattern(rule.key.pattern);if(rule.key.kind!=='regex'||!Number.isInteger(rule.key.group)||rule.key.group<0||rule.key.group>pattern.groupCount())fail('Choose an existing RE2 capture group');}
    if(rule.severity!==undefined&&!['critical','warning','info'].includes(rule.severity)||rule.urgency!==undefined&&!['high','low'].includes(rule.urgency)||rule.priority!==undefined&&!/^P[1-5]$/.test(rule.priority))fail('Invalid trigger severity, urgency or priority');
    if(rule.action==='resolve'&&['severity','urgency','priority'].some(k=>k in rule))fail('Only trigger rules set severity, urgency and priority');
  }
  return structuredClone({mode:input.mode,fallback:input.fallback,rules:input.rules});
}
function extract(rule:EmailRule,sample:EmailSample) {
  const value=sample[rule.key.field];let result='';
  if(rule.key.kind==='regex') {const match=routingPattern(rule.key.pattern).matcher(value);if(match.find())result=match.group(rule.key.group!)??'';}
  else {const start=value.indexOf(rule.key.start!);if(start>=0){const after=start+rule.key.start!.length,end=value.indexOf(rule.key.end!,after);if(end>=after)result=value.slice(after,end);}}
  return result;
}
export function decideEmail(version:EmailVersion,sample:EmailSample,unique:string):EmailDecision {
  const base={mode:version.mode,version:version.version,rule:null,key:null,severity:'warning'} as EmailDecision;
  for(const rule of version.rules) {
    const matches=rule.conditions.map(c=>c.op==='equals'?sample[c.field]===c.value:c.op==='contains'?sample[c.field].includes(c.value):c.op==='matches'?routingPattern(c.value).test(sample[c.field]):!routingPattern(c.value).test(sample[c.field]));
    if(!(rule.match==='all'?matches.every(Boolean):matches.some(Boolean)))continue;
    const extracted=extract(rule,sample),key=extracted||(rule.action==='trigger'?normalizedSubject(sample.subject):'');
    if(key.length>200)return {...base,rule:rule.id,action:'quarantine',reason:'extracted_key_limit'};
    return {...base,rule:rule.id,key:key||null,action:rule.action,reason:key?'first_matching_rule':'resolve_extracted_nothing',severity:rule.severity??'warning',...(rule.urgency?{urgency:rule.urgency}:{}),...(rule.priority?{priority:rule.priority}:{})};
  }
  if(version.mode==='custom'&&version.fallback==='quarantine')return {...base,action:'quarantine',reason:'no_rule_matched'};
  const key=version.mode==='single'?'single-open':version.mode==='each'?unique:normalizedSubject(sample.subject);
  if(!key||key.length>200)return {...base,action:'quarantine',reason:'subject_key_empty_or_over_limit'};
  return {...base,key,action:'trigger',reason:version.mode==='custom'?'unmatched_subject_fallback':'address_mode'};
}
