import type {State} from '../family/response-operations/domain';
import {dependencyLimit,referenceLimit,type DependencyReference} from './provenance';

// Ownership and dependency import from a Backstage catalog export (GET /api/catalog/entities): an array of entities, or {items}.
export type Component={kind:'Component';metadata:{name:string;namespace?:string;title?:string};spec:{owner?:string;dependsOn?:string[]}};
type Named={id:string;name:string};
type Action='change'|'conflict'|'unchanged'|'unmatched';
export type ImportRow={entity:string;service?:Named;current?:Named|null;team?:Named;action:Action;reason?:string;dependencies?:{current:Named[];next:Named[];references:DependencyReference[];action:Action;reason?:string}};
export type Choices=Record<string,'current'|'backstage'>;
export const catalogLimit=1000;
// Each reduced Component includes bounded identity, ownership and up to 30 dependency references.
// JSON can use six bytes per code unit; fixed overhead covers both conflict choices and the envelope.
export const catalogBodyLimit=catalogLimit*(6*(253+253+500+300+100+dependencyLimit*referenceLimit)+512)+256;

const text=(value:unknown,max:number)=>typeof value==='string'&&value.length<=max;
const entity=(e:any)=>!!e&&typeof e==='object'&&!Array.isArray(e)&&text(e.kind,100)&&!!e.metadata&&typeof e.metadata==='object'&&text(e.metadata.name,253)&&!!e.metadata.name&&!e.metadata.name.includes('/')&&(e.metadata.namespace===undefined||text(e.metadata.namespace,253)&&!!e.metadata.namespace&&!e.metadata.namespace.includes('/'))&&(e.metadata.title===undefined||text(e.metadata.title,500))&&(e.spec?.owner===undefined||text(e.spec.owner,300))&&(e.spec?.dependsOn===undefined||Array.isArray(e.spec.dependsOn)&&e.spec.dependsOn.length<=dependencyLimit&&e.spec.dependsOn.every((r:unknown)=>text(r,referenceLimit)&&!!(r as string).trim()));
// The catalog's Components reduced to what the import reads (the browser sends only these); null when it is not a catalog.
export function catalogComponents(value:unknown):Component[]|null {
 const items=Array.isArray(value)?value:value&&typeof value==='object'&&Array.isArray((value as any).items)?(value as any).items:null;
 if(!items||!items.every(entity))return null;
 return items.filter((e:any)=>e.kind.toLowerCase()==='component').map((e:any)=>({kind:'Component',metadata:{name:e.metadata.name,...(e.metadata.namespace?{namespace:e.metadata.namespace}:{}),...(e.metadata.title?{title:e.metadata.title}:{})},spec:{...(e.spec?.owner?{owner:e.spec.owner}:{}),...(e.spec?.dependsOn!==undefined?{dependsOn:[...e.spec.dependsOn]}:{})}}));
}
// What the browser sends for pasted text: its Components when it is a catalog, else the value (or text) as pasted.
export function catalogFrom(pasted:string):unknown {
 let value:unknown;try{value=JSON.parse(pasted);}catch{return pasted;}
 return catalogComponents(value)??value;
}

export const slug=(value:string)=>value.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const entityName=(c:Component)=>'component:'+(c.metadata.namespace||'default')+'/'+c.metadata.name;
const named=(s:Named):Named=>({id:s.id,name:s.name});
const same=(a:string[],b:string[])=>JSON.stringify([...a].sort())===JSON.stringify([...b].sort());
// A component names one service by id, else by its name or title against each service name; its group owner names one
// active team. Anything else writes nothing: an import never invents a team or a person.
export function importRows(state:State,components:Component[]):ImportRow[] {
 const matches=components.map(c=>{
  const byId=state.services.filter(s=>s.id===c.metadata.name);
  return byId.length?byId:state.services.filter(s=>slug(s.name)===slug(c.metadata.name)||!!c.metadata.title&&slug(s.name)===slug(c.metadata.title));
 });
 const team=(id:string|null|undefined)=>{const t=state.teams?.find(t=>t.id===id);return t?{id:t.id,name:t.name}:null;};
 const rows=components.map((c,i):ImportRow=>{
  const found=matches[i],service=found.length===1?found[0]:undefined;
  const row:ImportRow={entity:entityName(c),action:'unmatched',...service?{service:named(service),current:team(service.team)}:{}};
  // Ownership is reviewed separately: only an existing active team can receive it.
  const owner=c.spec.owner?.trim(),kind=owner&&/^([^:/]+):/.exec(owner)?.[1].toLowerCase(),name=owner?.replace(/^[^:/]+:/,'').replace(/^[^/]*\//,'')??'';
  if(!owner)return {...row,reason:'No owner'};
  if(kind==='user')return {...row,reason:'Owned by a person, not a team'};
  if(kind&&kind!=='group')return {...row,reason:'Owner is not a team'};
  const teams=(state.teams??[]).filter(t=>t.active&&slug(t.name)===slug(name));
  if(teams.length!==1)return {...row,reason:teams.length?'More than one team named '+name:'No active team named '+name};
  if(!service)return {...row,reason:found.length?'Matches '+found.map(s=>s.name).join(' and '):'Not in Oncall'};
  if(matches.filter(m=>m.length===1&&m[0]===service).length>1)return {...row,reason:'More than one component names this service'};
  const target={id:teams[0].id,name:teams[0].name};
  if(service.team===target.id)return {...row,team:target,action:'unchanged'};
  return {...row,team:target,action:!service.team||service.ownership?.source==='backstage'?'change':'conflict'};
 });
 for(const [i,c] of components.entries()){
  if(c.spec.dependsOn===undefined)continue; // Omitted dependencies do not ask to remove existing ones.
  const row=rows[i],service=state.services.find(s=>s.id===row.service?.id);
  const references:DependencyReference[]=c.spec.dependsOn.map(ref=>{
   const match=/^(?:([^:/]+):)?(?:([^:/]+)\/)?([^:/]+)$/.exec(ref.trim());
   if(!match||(match[1]??'component').toLowerCase()!=='component')return {ref,reason:'Only Component dependencies are supported'};
   const namespace=(match[2]||c.metadata.namespace||'default').toLowerCase(),name=match[3].toLowerCase();
   const targets=components.map((v,index)=>({v,index})).filter(({v})=>(v.metadata.namespace||'default').toLowerCase()===namespace&&v.metadata.name.toLowerCase()===name);
   const found=targets.length===1?matches[targets[0].index]:targets.length>1?[]:namespace==='default'?state.services.filter(s=>s.id.toLowerCase()===name||slug(s.name)===slug(name)):[];
   if(targets.length>1||found.length>1||found.length===1&&matches.filter(m=>m.length===1&&m[0]===found[0]).length>1)return {ref,reason:'Ambiguous Component or service reference'};
   if(!found.length)return {ref,reason:'No existing service matches this Component'};
   if(found[0].id===service?.id)return {ref,reason:'A service cannot depend on itself'};
   return {ref,service:found[0].id};
  });
  const current=(service?.dependencies??[]).map(id=>named(state.services.find(s=>s.id===id)!));
  // Incomplete source references cannot justify deleting an existing dependency.
  const ids=[...new Set([...(references.some(r=>r.reason)?current.map(s=>s.id):[]),...references.flatMap(r=>r.service?[r.service]:[])])];
  const next=ids.map(id=>named(state.services.find(s=>s.id===id)!));
  const reason=!service?'Not in Oncall':matches.filter(m=>m.length===1&&m[0]===service).length>1?'More than one component names this service':ids.length>dependencyLimit?'Resolved dependencies exceed the 30-service bound':undefined;
  const prior=service?.dependencyImport;
  const unchanged=same(current.map(s=>s.id),ids)&&(prior?prior.entity===row.entity&&JSON.stringify(prior.references)===JSON.stringify(references):references.length===0);
  row.dependencies={current,next,references,action:reason?'unmatched':unchanged?'unchanged':!current.length||prior?'change':'conflict',...(reason?{reason}:references.some(r=>r.reason)?{reason:'Unresolved references retained; current dependencies kept'}:{})};
 }
 return rows;
}
export const applies=(row:ImportRow,choices:Choices)=>row.action==='change'||row.action==='conflict'&&choices[row.service!.id]==='backstage';
export const dependencyChoice=(row:ImportRow)=>'dependencies:'+row.service!.id;
export const appliesDependencies=(row:ImportRow,choices:Choices)=>row.dependencies?.action==='change'||row.dependencies?.action==='conflict'&&choices[dependencyChoice(row)]==='backstage';
export const choiceKeys=(row:ImportRow)=>[...(row.action==='conflict'?[row.service!.id]:[]),...(row.dependencies?.action==='conflict'?[dependencyChoice(row)]:[])];
// The applied row is already in the record (an apply whose answer was lost).
export const landed=(state:State,row:ImportRow,choices:Choices)=>{const s=state.services.find(x=>x.id===row.service?.id);return !!s&&(!applies(row,choices)||s.team===row.team?.id&&s.ownership?.source==='backstage'&&s.ownership.entity===row.entity)&&(!appliesDependencies(row,choices)||!!s.dependencyImport&&s.dependencyImport.entity===row.entity&&same(s.dependencies??[],row.dependencies!.next.map(s=>s.id))&&JSON.stringify(s.dependencyImport.references)===JSON.stringify(row.dependencies!.references));};
// Bind ownership, dependencies and their provenance; unrelated notes never stale a preview.
export async function importDigest(state:State,rows:ImportRow[]):Promise<string> {
 const input=JSON.stringify(rows.map(r=>{const s=state.services.find(s=>s.id===r.service?.id);return [r,s?.ownership??null,s?.dependencies??[],s?.dependencyImport??null];}));
 return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(input)))].map(b=>b.toString(16).padStart(2,'0')).join('');
}
