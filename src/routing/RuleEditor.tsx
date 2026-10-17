import { useId, useState } from 'react';
import type { State } from '../family/response-operations/domain';
import type { RoutingRule } from './types';

export function RuleEditor({rule,index,services,onChange,onMove,onRemove,first,last,disabled}:{rule:RoutingRule;index:number;services:State['services'];onChange:(rule:RoutingRule)=>void;onMove:(delta:number)=>void;onRemove:()=>void;first:boolean;last:boolean;disabled:boolean}) {
  const uid=useId(),dynamic='field' in rule.target,[expanded,setExpanded]=useState(rule.id.startsWith('rule-'));
  return <details className="routing-rule" open={expanded} onToggle={e=>setExpanded(e.currentTarget.open)}>
    <summary><span className="routing-number">{index+1}</span><span className="routing-rule-copy"><strong>{rule.id || 'New rule'}</strong><small>{rule.conditions.map(c=>`${c.field} ${c.op}${c.value===undefined?'':` ${c.value}`}`).join(rule.match==='all'?' · and · ':' · or · ')}</small></span><span className="routing-target">{'service' in rule.target?services.find(s=>'service' in rule.target&&s.id===rule.target.service)?.name:'Service from '+rule.target.field}</span><span className="tag">{dynamic?'Dynamic':'Fixed service'}</span></summary>
    <fieldset disabled={disabled}>
      <div className="routing-fields">
        <label className="field">Rule ID<input required maxLength={80} value={rule.id} onChange={e=>onChange({...rule,id:e.target.value})}/></label>
        <label className="field"><span id={uid+'match'}>Match conditions</span><select aria-labelledby={uid+'match'} value={rule.match} onChange={e=>onChange({...rule,match:e.target.value as 'all'|'any'})}><option value="all">All conditions</option><option value="any">Any condition</option></select></label>
      </div>
      {rule.conditions.map((condition,n)=><div className="routing-condition" key={n}>
        <label className="field">Field path<input required maxLength={200} placeholder="payload.custom_details.team" value={condition.field} onChange={e=>onChange({...rule,conditions:rule.conditions.map((item,i)=>i===n?{...item,field:e.target.value}:item)})}/></label>
        <label className="field"><span id={uid+'op'+n}>Comparison</span><select aria-labelledby={uid+'op'+n} value={condition.op} onChange={e=>onChange({...rule,conditions:rule.conditions.map((item,i)=>i===n?(e.target.value==='exists'?{field:item.field,op:'exists'}:{...item,op:e.target.value as typeof item.op,value:item.value??''}):item)})}><option value="equals">Equals</option><option value="contains">Contains</option><option value="exists">Exists</option><option value="matches">Matches RE2 regex</option><option value="not-matches">Does not match RE2 regex</option></select></label>
        {condition.op!=='exists'&&<label className="field">Comparison value<input required maxLength={1000} value={condition.value??''} onChange={e=>onChange({...rule,conditions:rule.conditions.map((item,i)=>i===n?{...item,value:e.target.value}:item)})}/></label>}
        <button type="button" disabled={rule.conditions.length===1} onClick={()=>onChange({...rule,conditions:rule.conditions.filter((_,i)=>i!==n)})}>Remove condition {n+1}</button>
      </div>)}
      <button type="button" onClick={()=>onChange({...rule,conditions:[...rule.conditions,{field:'summary',op:'contains',value:''}]})}>Add condition</button>
      <div className="routing-fields">
        <label className="field"><span id={uid+'target'}>Target type</span><select aria-labelledby={uid+'target'} value={dynamic?'dynamic':'fixed'} onChange={e=>onChange({...rule,target:e.target.value==='dynamic'?{field:'payload.custom_details.service'}:{service:services[0]?.id??''}})}><option value="fixed">Fixed service</option><option value="dynamic">Service from a field</option></select></label>
        {'service' in rule.target?<label className="field"><span id={uid+'service'}>Target service</span><select aria-labelledby={uid+'service'} value={rule.target.service} onChange={e=>onChange({...rule,target:{service:e.target.value}})}>{services.map(s=><option key={s.id} value={s.id}>{s.name} · {s.environment}</option>)}</select></label>:<>
          <label className="field">Dynamic service field<input required value={rule.target.field} onChange={e=>onChange({...rule,target:{...rule.target,field:e.target.value}})}/></label>
          <label className="field">Capture regex (optional)<input value={rule.target.pattern??''} onChange={e=>onChange({...rule,target:{field:'field' in rule.target?rule.target.field:'',...(e.target.value?{pattern:e.target.value,group:'group' in rule.target?rule.target.group??0:0}:{})}})}/></label>
          {rule.target.pattern&&<label className="field">Capture group<input type="number" min={0} max={20} value={rule.target.group??0} onChange={e=>onChange({...rule,target:{...rule.target,group:Number(e.target.value)}})}/></label>}
        </>}
      </div>
      <div className="routing-actions"><button type="button" disabled={first} onClick={()=>onMove(-1)}>Move up</button><button type="button" disabled={last} onClick={()=>onMove(1)}>Move down</button><button type="button" onClick={onRemove}>Remove rule</button></div>
    </fieldset>
  </details>;
}
