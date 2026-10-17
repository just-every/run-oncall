import type { CompatibleInput, CompatibleProvider } from '../intake/provider-types.ts';
import { fail } from '../family/response-operations/domain.ts';
import { isObject } from './definition.ts';

const sensitive=(name:string)=>/secret|token|password|passwd|authorization|cookie|credential|signature|^(?:key|auth)$|(?:api|routing|service|integration|endpoint|access|private|signing|client|session|auth)[_. -]?key/i.test(name);
const bytes=(value:unknown)=>new TextEncoder().encode(JSON.stringify(value)).length;
/** A bounded field projection, never a saved request body. */
export function sanitizeRoutingInput(value:unknown,secret=''):Record<string,unknown> {
  let remaining=24000,nodes=512;
  const safeString=(value:string)=>{
    let clean=value;
    if(secret) {
      const variants=new Set([secret,encodeURI(secret)]);let encoded=secret;
      for(let n=0;n<3;n++){encoded=encodeURIComponent(encoded);variants.add(encoded);variants.add(encoded.replace(/%[0-9A-F]{2}/g,v=>v.toLowerCase()));}
      for(const variant of variants)clean=clean.replaceAll(variant,'[redacted]');
    }
    clean=clean.replace(/(?:Bearer|GenieKey)\s+[^\s,;]+/gi,'[redacted]').replace(/((?:secret|token|password|authorization|cookie|api[_-]?key|routing[_-]?key|service[_-]?key)=)[^&\s]+/gi,'$1[redacted]');
    let result=clean.slice(0,1000);
    while(result&&bytes(result)>remaining)result=result.slice(0,Math.floor(result.length/2));
    remaining-=bytes(result);return result;
  };
  const walk=(item:unknown,depth=0):unknown=>{
    if(--nodes<0||remaining<=0)return '[truncated]';
    if(typeof item==='string')return safeString(item);
    if(item===null||typeof item==='boolean')return item;
    if(typeof item==='number')return Number.isFinite(item)?item:null;
    if(depth>=6)return '[truncated]';
    if(Array.isArray(item)) {
      const result:unknown[]=[];
      for(const v of item.slice(0,30)) {if(remaining<64||nodes<1)break;result.push(walk(v,depth+1));}
      return result;
    }
    if(isObject(item)) {
      const result:Record<string,unknown>={};
      for(const [key,v] of Object.entries(item).filter(([k])=>k.length>0&&(!sensitive(k)||k==='routingKey'&&depth===0)&&!['__proto__','constructor','prototype'].includes(k)).slice(0,40)) {
        const name=key.slice(0,100),cost=bytes(name)+1;
        if(remaining<cost+64||nodes<1)break;
        remaining-=cost;Object.defineProperty(result,name,{value:walk(v,depth+1),enumerable:true,configurable:true,writable:true});
      }
      return result;
    }
    return null;
  };
  return isObject(value)?walk(value) as Record<string,unknown>:{};
}
export function routingInput(provider:CompatibleProvider,payload:Record<string,unknown>,input:CompatibleInput,secret:string,routingKey?:string) {
  const fields=provider==='pagerduty-v2'?['payload','event_action','dedup_key']:provider==='pagerduty-v1'?['description','client','details','event_type','incident_key']:provider==='opsgenie'?['message','alias','source','priority','tags','details','responders','teams','entity','description']:['message_type','entity_id','entity_display_name','state_message','monitoring_tool','custom_fields','details'];
  const selected=Object.fromEntries(fields.filter(k=>Object.hasOwn(payload,k)).map(k=>[k,payload[k]]));
  return sanitizeRoutingInput({...selected,summary:input.title,source:input.sender,severity:input.severity,urgency:input.priority==='P4'||input.priority==='P5'?'low':'high',component:input.details.component,group:input.details.group,class:input.details.class,...(provider==='splunk'?{routingKey}:{}),event:{action:input.action,key:input.key,summary:input.title,source:input.sender,severity:input.severity,details:input.details}},secret);
}
export function validateRoutingInput(value:unknown) {
  if(!isObject(value)||bytes(value)>32768)fail('Invalid retained routing input');
  let nodes=0;
  const validate=(item:unknown,depth=0):void=>{
    if(++nodes>1024||depth>6)fail('Invalid retained routing input bounds');
    if(typeof item==='string') {if(item.length>1000)fail('Invalid retained routing text');return;}
    if(item===null||typeof item==='boolean'||typeof item==='number'&&Number.isFinite(item))return;
    if(Array.isArray(item)) {if(item.length>30)fail('Invalid retained routing array');for(const v of item)validate(v,depth+1);return;}
    if(!isObject(item)||Object.keys(item).length>40)fail('Invalid retained routing object');
    for(const [key,v] of Object.entries(item)) {
      if(!key||key.length>100||(sensitive(key)&&!(key==='routingKey'&&depth===0))||['__proto__','constructor','prototype'].includes(key))fail('Unsafe retained routing field');
      validate(v,depth+1);
    }
  };
  validate(value);
}
