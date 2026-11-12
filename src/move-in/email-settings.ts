import {emailDraft} from '../email/rules'
import type {EmailCondition,EmailRule,EmailVersion} from '../email/types'
import {routingPattern} from '../routing/definition'
import type {Vendor} from './source'

type Draft=Pick<EmailVersion,'mode'|'fallback'|'rules'>
type Difference={field:string;reason:string;original:any}
export type ImportedEmail={draft:Draft;differences:Difference[];blocked:boolean}
const fields:Record<string,EmailCondition['field']>={subject:'subject',body:'text',from_addresses:'sender'}
const literal=(value:string)=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')
const entire=(field:'subject'|'text'):EmailRule['key']=>({field,kind:'regex',pattern:'(?s)^(.*)$',group:1})
function known(value:any,allowed:string[]) {
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('expected a saved object')
 const extra=Object.keys(value).filter(k=>!allowed.includes(k));if(extra.length)throw Error(`unsupported fields ${extra.join(', ')}`)
}
function condition(field:EmailCondition['field']|undefined,op:string,value:any,not=false):EmailCondition {
 if(!field||typeof value!=='string')throw Error('unsupported predicate field or value')
 let mapped:EmailCondition['op']
 if(op==='regex')mapped=not?'not-matches':'matches'
 else if(op==='contains'||op==='exactly') {
  mapped=not?'not-matches':op==='contains'?'contains':'equals'
  if(not)value=op==='contains'?literal(value):'(?s)^'+literal(value)+'$'
 }else throw Error(`unsupported predicate operator ${op}`)
 if(mapped==='matches'||mapped==='not-matches')routingPattern(value)
 return {field,op:mapped,value}
}
function pdLeaf(p:any,not=false):EmailCondition {
 known(p,['type','part','matcher','children'])
 if(p.type==='not') {
  if(not||!Array.isArray(p.children)||p.children.length!==1)throw Error('unsupported predicate nesting: not needs one leaf')
  return pdLeaf(p.children[0],true)
 }
 if(p.children?.length)throw Error('unsupported predicate nesting')
 return condition(fields[p.part],p.type,p.matcher,not)
}
function pdPredicate(p:any):Pick<EmailRule,'match'|'conditions'> {
 known(p,['type','part','matcher','children'])
 if(['all','any'].includes(p.type)) {
  if(!Array.isArray(p.children)||!p.children.length)throw Error('empty predicate group')
  return {match:p.type,conditions:p.children.map((child:any)=>pdLeaf(child))}
 }
 return {match:'all',conditions:[pdLeaf(p)]}
}
function pdKey(value:any):EmailRule['key'] {
 known(value,['type','part','value_name','regex','starts_after','ends_with'])
 const field=fields[value.part];if(field!=='subject'&&field!=='text')throw Error('incident key must come from subject or body')
 if(value.type==='entire')return entire(field)
 if(value.type==='between')return {field,kind:'markers',start:value.starts_after,end:value.ends_with}
 if(value.type==='regex') {
  const pattern=routingPattern(value.regex)
  if(pattern.groupCount()!==1)throw Error('incident key regex needs exactly one capture')
  return {field,kind:'regex',pattern:value.regex,group:1}
 }
 throw Error(`unsupported incident key extractor ${value.type}`)
}
const ogFields:Record<string,EmailCondition['field']>={subject:'subject',message:'text',from_address:'sender'}
function ogPredicate(filter:any):Pick<EmailRule,'match'|'conditions'> {
 known(filter,['conditionMatchType','conditions'])
 if(filter.conditionMatchType==='Match All') {
  if(filter.conditions?.length)throw Error('Match All with conditions is ambiguous')
  return {match:'all',conditions:[{field:'subject',op:'matches',value:'(?s).*'}]}
 }
 const match=filter.conditionMatchType==='Match All Conditions'?'all':filter.conditionMatchType==='Match Any Condition'?'any':null
 if(!match||!Array.isArray(filter.conditions)||!filter.conditions.length)throw Error('unsupported action filter')
 return {match,conditions:filter.conditions.map((c:any)=>{
  known(c,['field','operation','expectedValue','isNot'])
  if(c.isNot!==undefined&&typeof c.isNot!=='boolean')throw Error('invalid negated filter')
  const op=({Contains:'contains',Equals:'exactly',Matches:'regex'} as Record<string,string>)[c.operation]
  return condition(ogFields[c.field],op,c.expectedValue,c.isNot===true)
 })}
}
function ogKey(alias:any):EmailRule['key'] {
 if(typeof alias!=='string')throw Error('missing alias template')
 const plain=/^\{\{\s*(subject|message)\s*\}\}$/.exec(alias)
 if(plain)return entire(ogFields[plain[1]] as 'subject'|'text')
 const markers=/^\{\{\s*(subject|message)\.substringBetween\(("(?:[^"\\]|\\.)*"),\s*("(?:[^"\\]|\\.)*")\)\s*\}\}$/.exec(alias)
 if(markers)return {field:ogFields[markers[1]] as 'subject'|'text',kind:'markers',start:JSON.parse(markers[2]),end:JSON.parse(markers[3])}
 // The documented extract syntax uses a regex literal and one capture.
 // Flags, concatenation and chained methods stay in the review report.
 const regex=/^\{\{\s*(subject|message)\.extract\(\/((?:[^/\\]|\\.)+)\/\)\s*\}\}$/.exec(alias)
 if(regex) {
  const pattern=regex[2].replaceAll('\\/','/'),count=routingPattern(pattern).groupCount()
  if(count!==1)throw Error('alias regex needs exactly one capture')
  return {field:ogFields[regex[1]] as 'subject'|'text',kind:'regex',pattern,group:1}
 }
 throw Error('alias template is beyond one capture or one marker pair')
}
/** Saved settings only. An unsupported rule never becomes an approximation.
 * Drafts with unresolved rules stay inactive, so skipping an earlier source rule
 * cannot let a later converted rule accidentally receive its mail. */
export function emailSettings(vendor:Vendor,value:any):ImportedEmail|undefined {
 if(!(vendor==='pagerduty'&&value.type==='generic_email_inbound_integration'||vendor==='opsgenie'&&value.type==='Email'))return
 const differences:Difference[]=[],rules:EmailRule[]=[]
 let blocked=false
 const retain=(field:string,reason:string,original:any,blocks=true)=>{
  differences.push({field,reason:`${reason}. Original retained for review; no equivalent rule activated.`,original:original??null});blocked ||= blocks
 }
 let mode:Draft['mode']='custom',fallback:Draft['fallback']='quarantine'
 if(vendor==='pagerduty') {
  const modes:Record<string,Draft['mode']>={on_new_email:'each',on_new_email_subject:'subject',only_if_no_open_incidents:'single',use_rules:'custom'}
  mode=modes[value.email_incident_creation]
  if(!mode){mode='custom';retain('email_incident_creation','Unknown incident creation mode',value.email_incident_creation)}
  if(value.email_parsing_fallback==='open_new_incident')fallback='subject'
  else if(value.email_parsing_fallback==='discard')retain('email_parsing_fallback','PagerDuty discards unmatched mail; Oncall quarantines it instead',value.email_parsing_fallback,false)
  else if(mode==='custom')retain('email_parsing_fallback','Missing or unknown unmatched-email behavior',value.email_parsing_fallback)
  if(value.email_filter_mode!==undefined&&value.email_filter_mode!=='all-email')retain('email_filter_mode','Accept or reject email filters have no exact receiving equivalent',value.email_filter_mode)
  if(value.email_filters!==undefined&&!Array.isArray(value.email_filters))retain('email_filters','Malformed email filters',value.email_filters)
  for(const [i,filter] of (Array.isArray(value.email_filters)?value.email_filters:[]).entries())retain(`email_filters.${i}`,'Accept or reject email filter is retained only',filter,value.email_filter_mode!=='all-email')
  if(value.email_parsers!==undefined&&!Array.isArray(value.email_parsers))retain('email_parsers','Malformed parser list',value.email_parsers)
  for(const [i,parser] of (Array.isArray(value.email_parsers)?value.email_parsers:[]).entries()) {
   try {
    known(parser,['action','match_predicate','value_extractors'])
    if(!['trigger','resolve'].includes(parser.action))throw Error(`unsupported action ${parser.action}`)
    if(mode!=='custom'&&parser.action!=='resolve')throw Error('trigger parser is not used by this incident creation mode')
    if(!Array.isArray(parser.value_extractors)||parser.value_extractors.length!==1||parser.value_extractors[0].value_name!=='incident_key')throw Error('exactly one incident_key extractor is supported; other value extractors need review')
    const rule:EmailRule={id:`pagerduty-${i+1}`,action:parser.action,...pdPredicate(parser.match_predicate),key:pdKey(parser.value_extractors[0])}
    emailDraft({mode,fallback,rules:[rule]});if(rules.length===20)throw Error('more than 20 ordered rules')
    rules.push(rule)
   }catch(error){retain(`email_parsers.${i}`,`Parser ${i+1} (${parser.action??'unknown'}): ${(error as Error).message}`,parser)}
  }
 }else {
  const actions=value._emailActions
  if(!actions)retain('integration_actions','Save the integration actions response with its _parent identity',null)
  else {
   const groups=['ignore','create','close','acknowledge','addNote']
   for(const key of Object.keys(actions).filter(k=>!['_parent',...groups].includes(k)))retain(`integration_actions.${key}`,'Unknown action group',actions[key])
   for(const group of groups) {
    const list=actions[group]??[]
    if(!Array.isArray(list)){retain(`integration_actions.${group}`,'Malformed action list',list);continue}
    const orders=new Set<number>()
    for(const action of [...list].sort((a,b)=>a.order-b.order)) {
     const field=`integration_actions.${group}.${list.indexOf(action)}`
     try {
      if(!['create','close'].includes(group))throw Error(`${group} action is unsupported`)
      known(action,['type','name','order','filter','alias','user','note','message','description','source','entity','priority','tags','responders','extraProperties','alertActions','appendAttachments','ignoreAlertActionsFromPayload','ignoreRespondersFromPayload','ignoreTeamsFromPayload','ignoreTagsFromPayload','ignoreExtraPropertiesFromPayload'])
      if(action.type!==group||!Number.isSafeInteger(action.order)||action.order<0||orders.has(action.order))throw Error('missing, duplicate or inconsistent action order')
      orders.add(action.order)
      // Content, routing and note templates are not silently converted to rules.
      for(const key of ['note','entity','tags','responders','extraProperties','alertActions'])if(action[key]&&Object.keys(action[key]).length)throw Error(`unsupported ${key} effect`)
      if(action.appendAttachments===true)throw Error('attachment custody is not supported')
      for(const [key,expected] of [['message','{{subject}}'],['description','{{message}}']])if(action[key]&&action[key]!==expected)throw Error(`unsupported ${key} template`)
      const rule:EmailRule={id:`opsgenie-${group}-${action.order}`,action:group==='create'?'trigger':'resolve',...ogPredicate(action.filter),key:ogKey(action.alias),...(group==='create'&&action.priority?{priority:action.priority}:{})}
      emailDraft({mode,fallback,rules:[rule]});if(rules.length===20)throw Error('more than 20 ordered rules')
      rules.push(rule)
     }catch(error){retain(field,`Action ${action.name??group} (${group}): ${(error as Error).message}`,action)}
    }
   }
   retain('unmatched-email','Opsgenie ignores mail with no matching action; Oncall quarantines it instead','no matching action',false)
  }
 }
 return {draft:emailDraft({mode,fallback,rules}),differences,blocked}
}
