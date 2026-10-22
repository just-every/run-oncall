import { fail, type State } from './family/response-operations/domain';
import type { IntakeReceipt } from './intake/model';
import { nativeIncompleteDetails, nativePrefixMaximum, nativePrefixReference } from './native-incomplete-model';

/** A stored receipt keeps encoding, length and request hash; the bytes live in oc_native_prefixes. */
export function storedReceipt(receipt:IntakeReceipt):IntakeReceipt {
 if(receipt.provider!=='native'||!receipt.incomplete)return receipt;
 const prefix=receipt.details.nativePrefix as {encoding:string;value?:string}|undefined;
 if(typeof prefix?.value!=='string')return receipt;
 if(!nativeIncompleteDetails(receipt))fail('Invalid native prefix custody');
 return {...receipt,details:{...receipt.details,nativePrefix:{encoding:'base64',bytes:Math.min(nativePrefixMaximum,receipt.incomplete.bytes),sha256:receipt.incomplete.sha256}}};
}
/** Prefix rows are written in the receipt's own write_token-guarded batch, only for receipts new to this write. */
export function nativePrefixWrites(db:D1Database,receipts:IntakeReceipt[],token:string,held?:ReadonlySet<string>) {
 const gate='EXISTS(SELECT 1 FROM workspace_control WHERE id=1 AND write_token=?)';
 return receipts.flatMap(receipt=>{
  if(held?.has(receipt.id)||receipt.provider!=='native'||!receipt.incomplete)return [];
  const prefix=receipt.details.nativePrefix as {value?:string}|undefined;
  if(typeof prefix?.value==='string')return [db.prepare(`INSERT INTO oc_native_prefixes(id,bytes,request_sha256,prefix) SELECT ?,?,?,? WHERE ${gate} ON CONFLICT(id) DO UPDATE SET bytes=excluded.bytes,request_sha256=excluded.request_sha256,prefix=excluded.prefix WHERE bytes<>excluded.bytes OR request_sha256<>excluded.request_sha256 OR prefix<>excluded.prefix`).bind(receipt.id,Math.min(nativePrefixMaximum,receipt.incomplete.bytes),receipt.incomplete.sha256,prefix.value,token)];
  if(receipt.routing?.readmission)return [db.prepare(`INSERT OR IGNORE INTO oc_native_prefixes(id,bytes,request_sha256,prefix) SELECT ?,bytes,request_sha256,prefix FROM oc_native_prefixes WHERE id=? AND ${gate}`).bind(receipt.id,receipt.routing.readmission.receipt,token)];
  return [];
 });
}
/** Prefixes are read only for an explicit protected custody export, never by intake or human writes.
 * The JSON door keeps its restore limit; a larger custody uses the streaming portable export. */
export async function hydrateNativePrefixes(db:D1Database,state:State,limit:number):Promise<State> {
 const held=(state.intakeReceipts??[]).filter(receipt=>nativePrefixReference(receipt));
 if(!held.length)return state;
 const total=await db.prepare('SELECT COALESCE(SUM(length(prefix)),0) AS bytes FROM oc_native_prefixes').first<{bytes:number}>();
 if((total?.bytes??0)+new TextEncoder().encode(JSON.stringify(state)).length>limit)fail('Native custody exceeds this export limit; use the streaming portable export',413);
 for(const receipt of held) {
  const row=await db.prepare('SELECT prefix,bytes,request_sha256 FROM oc_native_prefixes WHERE id=?').bind(receipt.id).first<{prefix:string;bytes:number;request_sha256:string}>();
  if(!row||row.bytes!==Math.min(nativePrefixMaximum,receipt.incomplete!.bytes)||row.request_sha256!==receipt.incomplete!.sha256)fail('Native custody is unavailable',503);
  receipt.details={...receipt.details,nativePrefix:{encoding:'base64',value:row.prefix}};
  if(!nativeIncompleteDetails(receipt))fail('Native custody is invalid',503);
 }
 return state;
}
/** References are installation-local; external JSON replacement must carry the bytes. */
export function requireNativePrefixValues(state:State) {
 for(const receipt of state.intakeReceipts??[])if(receipt.provider==='native'&&receipt.incomplete&&nativePrefixReference(receipt))fail('Native archive must include its retained prefix bytes');
}
