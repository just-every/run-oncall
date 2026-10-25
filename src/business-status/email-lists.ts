/** A bounded distribution address is a record, not a verified or deliverable destination. */
export function emailListAddress(value:unknown):string|null {
 if(typeof value!=='string'||value.length>254)return null;
 const clean=value.trim(),parts=clean.split('@');if(parts.length!==2)return null;
 const [local,domain]=parts;
 if(!local||local.length>64||local.startsWith('.')||local.endsWith('.')||local.includes('..')||!/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(local))return null;
 const labels=domain.split('.');if(labels.length<2||labels.some(label=>!label||label.length>63||!/^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/.test(label)))return null;
 return local+'@'+domain.toLowerCase();
}
