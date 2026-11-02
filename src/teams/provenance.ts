import {fail} from '../family/response-operations/domain';

export type OwnershipProvenance={source:'backstage';entity:string;importId:string;importedAt:string};
export type DependencyReference={ref:string;service?:string;reason?:string};
export type DependencyProvenance=OwnershipProvenance&{references:DependencyReference[]};
export const dependencyLimit=30,referenceLimit=600;
export function validateProvenance(value:any,dependencies?:string[]) {
 const keys=['source','entity','importId','importedAt',...(dependencies===undefined?[]:['references'])];
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==keys.length||Object.keys(value).some(k=>!keys.includes(k))||value.source!=='backstage'||typeof value.entity!=='string'||!/^component:[^/]{1,253}\/[^/]{1,253}$/.test(value.entity)||typeof value.importId!=='string'||!value.importId||value.importId.length>100||typeof value.importedAt!=='string'||!Number.isFinite(Date.parse(value.importedAt)))fail('Imported service provenance is not valid.');
 if(dependencies===undefined)return;
 if(!Array.isArray(value.references)||value.references.length>dependencyLimit)fail('Imported dependency references are not valid.');
 for(const r of value.references){
  if(!r||typeof r!=='object'||Array.isArray(r)||Object.keys(r).some(k=>!['ref','service','reason'].includes(k))||typeof r.ref!=='string'||!r.ref.trim()||r.ref.length>referenceLimit||((r.service===undefined)===(r.reason===undefined)))fail('Imported dependency reference is not valid.');
  if(r.service!==undefined&&(typeof r.service!=='string'||!dependencies.includes(r.service)))fail('Imported dependency does not match its reference.');
  if(r.reason!==undefined&&(typeof r.reason!=='string'||!r.reason||r.reason.length>200))fail('Imported dependency reason is not valid.');
 }
}
