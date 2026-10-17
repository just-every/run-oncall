import type { State } from '../family/response-operations/domain.ts';
import type { RoutingDefinition, RoutingExplanation, RoutingVersion } from './types.ts';
import { isObject, routingPattern } from './definition.ts';

export function fieldValue(input:Record<string,unknown>,field:string):unknown {
  let result:unknown=input;
  for(const part of field.split('.')) {
    if(Array.isArray(result)) {
      const tagged=result.filter(v=>typeof v==='string'&&v.startsWith(part+':')).map(v=>(v as string).slice(part.length+1));
      result=/^\d+$/.test(part)?result[Number(part)]:tagged.length?tagged:result.map(v=>isObject(v)&&Object.hasOwn(v,part)?v[part]:undefined).filter(v=>v!==undefined);
    } else result=isObject(result)&&Object.hasOwn(result,part)?result[part]:undefined;
    if(result===undefined)break;
  }
  return result;
}
const values=(v:unknown):string[]=>Array.isArray(v)?v.flatMap(values):v===undefined||v===null?[]:[typeof v==='object'?JSON.stringify(v):String(v)];
export function evaluateRouting(state:State,key:string,definition:RoutingDefinition,version:RoutingVersion,input:Record<string,unknown>):RoutingExplanation {
  const result:RoutingExplanation={key,version:version.version,rule:null,kind:'catch-all',service:version.catchAll,evaluated:[],diagnostics:[],serviceDecision:null};
  for(const rule of version.rules) {
    const conditions=rule.conditions.map(c=>{
      const found=fieldValue(input,c.field),texts=values(found);
      if(c.op==='exists')return found!==undefined&&found!==null&&(!Array.isArray(found)||found.length>0);
      if(c.op==='equals')return texts.some(v=>v===c.value);
      if(c.op==='contains')return texts.some(v=>v.includes(c.value!));
      const matches=texts.some(v=>routingPattern(c.value).test(v));return c.op==='not-matches'?!matches:matches;
    });
    const matched=rule.match==='all'?conditions.every(Boolean):conditions.some(Boolean);
    result.evaluated.push({rule:rule.id,conditions,matched});
    if(!matched)continue;
    result.rule=rule.id;
    if('service' in rule.target) {result.kind='rule';result.service=rule.target.service;}
    else {
      result.kind='dynamic';
      let value=values(fieldValue(input,rule.target.field))[0]??'';
      if(rule.target.pattern) {const match=routingPattern(rule.target.pattern).matcher(value);value=match.find()?match.group(rule.target.group??0)??'':'';}
      result.dynamic={field:rule.target.field,value};
      const candidates=state.services.filter(s=>definition.scope.includes(s.id)&&(s.id===value||s.name===value));
      const target=candidates.find(s=>s.id===value)??(candidates.length===1?candidates[0]:undefined);
      result.service=target?.id??version.catchAll;
      if(target)result.dynamic.serviceName=target.name;
      else result.diagnostics.push(`dynamic route target outside key scope: ${rule.target.field}=${value}`);
    }
    break;
  }
  if(result.service===null)result.diagnostics.push('Recorded unrouted for integration owner');
  return result;
}
