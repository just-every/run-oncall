import {fail,type State} from '../family/response-operations/domain';
export type KeyAllowance={id:string;requests:number;events:number};
export const defaultAllowance={requests:600,events:120};
export const allowanceCeiling={requests:6000,events:1200};
export function validateAllowance(value:unknown):asserts value is KeyAllowance {
 const v=value as KeyAllowance;
 if(!v||typeof v!=='object'||Object.keys(v).sort().join(',')!=='events,id,requests'||typeof v.id!=='string'||!/^(?:source|intake):.{1,100}$/.test(v.id)||!Number.isSafeInteger(v.requests)||v.requests<1||v.requests>allowanceCeiling.requests||!Number.isSafeInteger(v.events)||v.events<1||v.events>allowanceCeiling.events)fail('Invalid key allowance');
}
export function validateAllowances(state:State) {
 if(state.keyAllowances===undefined)return;
 if(!Array.isArray(state.keyAllowances)||state.keyAllowances.length>10000||new Set(state.keyAllowances.map(v=>v.id)).size!==state.keyAllowances.length)fail('Invalid key allowances');
 state.keyAllowances.forEach(validateAllowance);
}
