import {useState} from 'react';
import {Form} from '../forms';
import type {State} from '../family/response-operations/domain';
import type {IntakeRun} from '../intake/CompatibleTest';
import {defaultAllowance,allowanceCeiling} from './model';
export function AllowanceForm({state,id,admin,busy,run}:{state:State;id:string;admin:boolean;busy:boolean;run:IntakeRun}) {
 const current=state.keyAllowances?.find(v=>v.id===id)??defaultAllowance;
 const [requests,setRequests]=useState(current.requests),[events,setEvents]=useState(current.events);
 return <details><summary>Per-key rate allowance</summary><p>{current.requests} authenticated requests and {current.events} newly admitted events per rolling minute. Rotation keeps this key’s usage. Duplicates count as requests; further observations grouped into an existing generation do not use another event slot.</p>{admin&&<Form busy={busy} label="Save key allowance" onSubmit={async()=>{await run('/api/intake/allowances',{id,requests,events,revision:state.revision},'Key allowance saved');return false;}}><div className="routing-fields"><label className="field">Requests per minute<input type="number" min={1} max={allowanceCeiling.requests} required value={requests} onChange={e=>setRequests(Number(e.target.value))}/></label><label className="field">New events per minute<input type="number" min={1} max={allowanceCeiling.events} required value={events} onChange={e=>setEvents(Number(e.target.value))}/></label></div><small>Ceilings: {allowanceCeiling.requests} requests and {allowanceCeiling.events} events. Oversized batches must be split or fit the configured allowance. Email has its own limit. Paging stays OFF.</small></Form>}</details>;
}
