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

/** Bytes held for intake custody: stored records plus each native prefix kept in its own table. */
export function intakeBytes(state:State):number {
 const json=(value:unknown)=>new TextEncoder().encode(JSON.stringify(value)).length;
 const prefixes=(state.intakeReceipts??[]).reduce((sum,receipt)=>receipt.provider==='native'&&receipt.incomplete?sum+encodedPrefixBytes(receipt.incomplete.bytes):sum,0);
 return json(state.events)+json(state.alerts)+json(state.intakeReceipts??[])+json(state.intakeSources?.filter(isNativeCustody)??[])+json(state.audit.filter(isIntakeAudit))+prefixes;
}

/** The derived budget holds the full receipt capacity; this is the capacity refusal, never a smaller limit. */
export function checkIntakeBudget(state:State) {
 if(intakeBytes(state)>intakeBudgetBytes)fail('Local intake receipt capacity reached; export before extending capacity',429);
}
