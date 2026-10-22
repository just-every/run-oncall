import {origins,changedStat} from './workspace-accounting.ts';
import {collections} from './workspace-tables.ts';
import {storedReceipt} from './native-prefix-store.ts';
import {fail,type State} from './family/response-operations/domain.ts';

/** Product bounds the intake budget derives from. The receipt count binds first. */
export const intakeReceiptCapacity=10000;
const nativePrefixBytes=65536,detailsBytes=8192,evidenceBytes=7000;
// Event, alert, owner-notice audit rows and routing explanation of one receipt.
const generatedBytes=24576;
export const encodedPrefixBytes=(bytes:number)=>Math.ceil(Math.min(nativePrefixBytes,bytes)/3)*4;
// One native receipt keeps its prefix, details and the evidence twice (details and incomplete).
export const intakeReceiptFootprint=encodedPrefixBytes(nativePrefixBytes)+detailsBytes+2*evidenceBytes+generatedBytes;
export const intakeBudgetBytes=intakeReceiptCapacity*intakeReceiptFootprint;

const isIntakeAudit=(row:State['audit'][number])=>row.actor.startsWith('source:');
// Custody sources are created only by native incomplete intake (src/native-incomplete.ts).
const isNativeCustody=(source:{id:string;name:string})=>source.id.startsWith('native:')&&source.name.startsWith('Native incomplete: ');

/** The 1 MB authored profile measures human-authored records only. Machine-ingested
 * records (events, alerts, receipts, their audit rows including rate notices, and
 * native custody sources) are charged to intake accounting, so no sender can make
 * a human write fail. The outbox keeps its own bounds. */
export function authoredWorkspace(state:State) {
 const {apiOutbox,events,alerts,intakeReceipts,...workspace}=state;
 return {...workspace,intakeSources:state.intakeSources?.filter(source=>!isNativeCustody(source)),audit:state.audit.filter(row=>!isIntakeAudit(row))};
}

const jsonBytes=(value:unknown)=>new TextEncoder().encode(JSON.stringify(value)).length;
/** Count persisted rows and the selected write delta without materialising custody. */
export function authoredSize(state:State):number {
 if(!origins.has(state))return jsonBytes(authoredWorkspace(state));
 const profile=authoredWorkspace(state) as Record<string,unknown>;
 for(const key of collections)if(Array.isArray(profile[key]))profile[key]=[];
 let size=jsonBytes(profile);
 for(const key of collections)if(Array.isArray(profile[key])){const stat=changedStat(state,key,key==='intakeReceipts'?storedReceipt:undefined);size+=stat.authorBytes+Math.max(0,stat.authorCount-1);}
 return size;
}
/** Bytes held for intake custody: maintained totals plus each selected write delta. */
export function intakeBytes(state:State):number {
 const origin=origins.get(state);
 if(!origin){const prefixes=(state.intakeReceipts??[]).reduce((sum,r)=>r.provider==='native'&&r.incomplete?sum+encodedPrefixBytes(r.incomplete.bytes):sum,0);return jsonBytes(state.events)+jsonBytes(state.alerts)+jsonBytes(state.intakeReceipts??[])+jsonBytes(state.intakeSources?.filter(isNativeCustody)??[])+jsonBytes(state.audit.filter(isIntakeAudit))+prefixes;}
 let size=origin.stats.prefixes?.bytes??0;
 for(const key of ['events','alerts','intakeReceipts','intakeSources','audit'] as const){const stat=changedStat(state,key,key==='intakeReceipts'?storedReceipt:undefined),count=stat.count-stat.authorCount;size+=2+stat.bytes-stat.authorBytes+Math.max(0,count-1);}
 for(const receipt of state.intakeReceipts??[])if(!origin.rows.get('intakeReceipts')?.has(receipt.id)&&receipt.provider==='native'&&receipt.incomplete)size+=encodedPrefixBytes(receipt.incomplete.bytes);
 return size;
}

/** The derived budget holds the full receipt capacity; this is the capacity refusal, never a smaller limit. */
export function checkIntakeBudget(state:State) {
 if(intakeBytes(state)>intakeBudgetBytes)fail('Local intake receipt capacity reached; export before extending capacity',429);
}
