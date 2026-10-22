import type {IntakeReceipt} from './intake/model';
/** Ordinary details stay under 8 KiB; only native custody may retain 64 KiB of bytes. */
export function nativeIncompleteDetails(receipt:IntakeReceipt):boolean {
 if(receipt.provider!=='native'||!receipt.incomplete||!receipt.details||typeof receipt.details!=='object'||Array.isArray(receipt.details))return false;
 const {nativePrefix:rawPrefix,...details}=receipt.details;
 const nativePrefix=rawPrefix as {encoding?:unknown;value?:unknown}|null;
 if(!nativePrefix||typeof nativePrefix!=='object'||Array.isArray(nativePrefix)||Object.keys(nativePrefix).sort().join(',')!=='encoding,value'||nativePrefix.encoding!=='base64'||typeof nativePrefix.value!=='string')return false;
 try {
  const prefix=atob(nativePrefix.value);
  return btoa(prefix)===nativePrefix.value&&prefix.length===Math.min(65536,receipt.incomplete.bytes)&&new TextEncoder().encode(JSON.stringify(details)).length<=8192;
 }catch{return false;}
}
