import {useAutosave,autosaveRequest} from '../app/autosave/useAutosave';
import {SavedState,SaveFeedback} from '../app/autosave/SavedState';
import {request} from '../useWorkspace';
import type {State} from '../family/response-operations/domain';
import type {IntakeRun} from '../intake/CompatibleTest';
import {defaultAllowance,allowanceCeiling} from './model';
export function AllowanceForm({state,id,admin}:{state:State;id:string;admin:boolean;busy:boolean;run:IntakeRun}) {
 const snapshot=(value:State)=>({values:{requests:(value.keyAllowances?.find(v=>v.id===id)??defaultAllowance).requests,events:(value.keyAllowances?.find(v=>v.id===id)??defaultAllowance).events},revision:value.revision});
 const save=useAutosave({storageKey:'allowance:'+id,snapshot:snapshot(state),read:async()=>snapshot(await request('/api/state')),write:async change=>{await autosaveRequest('/api/intake/allowances',{id,...change.values,revision:change.revision});return snapshot(await request('/api/state'));}});
 return <details><summary>Per-key rate allowance</summary><div className="routing-fields">{(['requests','events'] as const).map(field=><div key={field}><label className="field"><span>{field==='requests'?'Requests per minute':'New events per minute'} <SavedState state={save.states[field]}/></span><input aria-label={field==='requests'?'Requests per minute':'New events per minute'} disabled={!admin} type="number" min={1} max={allowanceCeiling[field]} value={save.values[field]} onChange={e=>save.change(field,Number(e.target.value),'text')} onBlur={()=>save.blur(field)}/></label><SaveFeedback state={save.states[field]} retry={()=>save.retry(field)} useMine={()=>save.useMine(field)}/></div>)}</div></details>;
}
