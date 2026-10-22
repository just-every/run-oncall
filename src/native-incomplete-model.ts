import type {IntakeReceipt} from './intake/model.ts';
export const nativePrefixMaximum=65536;
export function nativePrefixReference(receipt:IntakeReceipt):boolean {
 const prefix=receipt.details?.nativePrefix as {encoding?:unknown;bytes?:unknown;sha256?:unknown}|undefined;
 return receipt.provider==='native'&&!!receipt.incomplete&&!!prefix&&typeof prefix==='object'&&!Array.isArray(prefix)&&Object.keys(prefix).sort().join(',')==='bytes,encoding,sha256'&&prefix.encoding==='base64'&&prefix.bytes===Math.min(nativePrefixMaximum,receipt.incomplete.bytes)&&prefix.sha256===receipt.incomplete.sha256;
}
/** Ordinary details stay under 8 KiB; only native custody may retain 64 KiB of bytes. */
export function nativeIncompleteDetails(receipt:IntakeReceipt):boolean {
 if(receipt.provider!=='native'||!receipt.incomplete||!receipt.details||typeof receipt.details!=='object'||Array.isArray(receipt.details))return false;
 const {nativePrefix:rawPrefix,...details}=receipt.details;
 if(new TextEncoder().encode(JSON.stringify(details)).length>8192)return false;
 if(nativePrefixReference(receipt))return true;
 const nativePrefix=rawPrefix as {encoding?:unknown;value?:unknown}|null;
 if(!nativePrefix||typeof nativePrefix!=='object'||Array.isArray(nativePrefix)||Object.keys(nativePrefix).sort().join(',')!=='encoding,value'||nativePrefix.encoding!=='base64'||typeof nativePrefix.value!=='string')return false;
 try {
  const prefix=atob(nativePrefix.value);
  return btoa(prefix)===nativePrefix.value&&prefix.length===Math.min(nativePrefixMaximum,receipt.incomplete.bytes);
 }catch{return false;}
}
