import { RE2JS } from 're2js';
import { fail, text, type State } from '../family/response-operations/domain.ts';
import type { RoutingRule } from './types.ts';

export const isObject=(v:unknown):v is Record<string,any>=>!!v&&typeof v==='object'&&!Array.isArray(v);
export function exact(value:unknown,required:string[],optional:string[]=[]) {
  if(!isObject(value)||required.some(k=>!Object.hasOwn(value,k))||Object.keys(value).some(k=>!required.includes(k)&&!optional.includes(k)))fail('Invalid routing fields');
}
export function routingPattern(value:unknown) {
  if(typeof value!=='string'||!value.length||value.length>512)fail('Routing patterns need 1–512 characters');
  try{return RE2JS.compile(value);}catch{fail('Routing pattern must use valid RE2 syntax');}
}
export function routingPath(value:unknown) {
  if(typeof value!=='string'||!value.length||value.length>200||value.split('.').some(p=>!p||['__proto__','prototype','constructor'].includes(p)))fail('Invalid routing field path');
  return value;
}
export function routingScope(state:State,value:unknown):string[] {
  if(!Array.isArray(value)||!value.length||value.length>100||new Set(value).size!==value.length||value.some(v=>typeof v!=='string'||!state.services.some(s=>s.id===v)))fail('Choose 1–100 distinct existing services for the routing scope');
  return [...value];
}
export function routingRules(scope:string[],value:unknown,catchAll:unknown):{rules:RoutingRule[];catchAll:string|null} {
  if(catchAll!==null&&(typeof catchAll!=='string'||!scope.includes(catchAll)))fail('Catch-all must be an allowed service or record unrouted');
  if(!Array.isArray(value)||value.length>100)fail('Routing supports up to 100 ordered rules');
  const ids=new Set<string>();
  for(const rule of value) {
    exact(rule,['id','match','conditions','target']);
    const id=text(rule.id,'Routing rule ID',100);
    if(id!==rule.id||ids.has(id))fail('Routing rule IDs must be distinct');ids.add(id);
    if(!['all','any'].includes(rule.match)||!Array.isArray(rule.conditions)||!rule.conditions.length||rule.conditions.length>20)fail('Rules need all or any and 1–20 conditions');
    for(const condition of rule.conditions) {
      exact(condition,['field','op'],['value']);routingPath(condition.field);
      if(!['equals','contains','exists','matches','not-matches'].includes(condition.op))fail('Invalid routing condition');
      if(condition.op==='exists') {if(condition.value!==undefined)fail('Exists conditions do not take a value');}
      else if(typeof condition.value!=='string'||condition.value.length>1000)fail('Routing values must be text up to 1000 characters');
      if(['matches','not-matches'].includes(condition.op))routingPattern(condition.value);
    }
    if(isObject(rule.target)&&Object.hasOwn(rule.target,'service')) {
      exact(rule.target,['service']);if(!scope.includes(rule.target.service))fail('Fixed routing target is outside key scope');
    } else {
      exact(rule.target,['field'],['pattern','group']);routingPath(rule.target.field);
      if(rule.target.pattern!==undefined) {
        const pattern=routingPattern(rule.target.pattern),group=rule.target.group??0;
        if(!Number.isSafeInteger(group)||group<0||group>pattern.groupCount())fail('Dynamic routing capture group does not exist');
      } else if(rule.target.group!==undefined)fail('Dynamic capture group requires a pattern');
    }
  }
  return {rules:structuredClone(value),catchAll:catchAll as string|null};
}
export const routingDate=(v:unknown)=>typeof v==='string'&&/(?:Z|[+-]\d{2}:\d{2})$/i.test(v)&&Number.isFinite(Date.parse(v));
