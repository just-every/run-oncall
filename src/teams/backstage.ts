import type {State} from '../family/response-operations/domain';

// Ownership import from a Backstage catalog export (GET /api/catalog/entities): an array of entities, or {items}.
export type Component={kind:'Component';metadata:{name:string;namespace?:string;title?:string};spec:{owner?:string}};
export type ImportRow={entity:string;service?:{id:string;name:string};current?:{id:string;name:string}|null;team?:{id:string;name:string};action:'change'|'conflict'|'unchanged'|'unmatched';reason?:string};
export type Choices=Record<string,'current'|'backstage'>;
export const catalogLimit=1000;
// Each reduced Component allows name 253, namespace 253, title 500 and owner 300 code units.
// JSON may use six bytes per code unit. Apply also allows one 100-character service ID choice per row;
// 256 bytes per row and 256 for the envelope cover fixed keys, punctuation, digest and choice values.
export const catalogBodyLimit=catalogLimit*(6*(253+253+500+300+100)+256)+256;

const text=(value:unknown,max:number)=>typeof value==='string'&&value.length<=max;
const entity=(e:any)=>!!e&&typeof e==='object'&&!Array.isArray(e)&&text(e.kind,100)&&!!e.metadata&&typeof e.metadata==='object'&&text(e.metadata.name,253)&&!!e.metadata.name&&(e.metadata.namespace===undefined||text(e.metadata.namespace,253))&&(e.metadata.title===undefined||text(e.metadata.title,500))&&(e.spec?.owner===undefined||text(e.spec.owner,300));
// The catalog's Components reduced to what the import reads (the browser sends only these); null when it is not a catalog.
export function catalogComponents(value:unknown):Component[]|null {
 const items=Array.isArray(value)?value:value&&typeof value==='object'&&Array.isArray((value as any).items)?(value as any).items:null;
 if(!items||!items.every(entity))return null;
 return items.filter((e:any)=>e.kind.toLowerCase()==='component').map((e:any)=>({kind:'Component',metadata:{name:e.metadata.name,...(e.metadata.namespace?{namespace:e.metadata.namespace}:{}),...(e.metadata.title?{title:e.metadata.title}:{})},spec:e.spec?.owner?{owner:e.spec.owner}:{}}));
}
// What the browser sends for pasted text: its Components when it is a catalog, else the value (or text) as pasted.
export function catalogFrom(pasted:string):unknown {
 let value:unknown;try{value=JSON.parse(pasted);}catch{return pasted;}
 return catalogComponents(value)??value;
}

export const slug=(value:string)=>value.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
// A component names one service by id, else by its name or title against each service name; its group owner names one
// active team. Anything else writes nothing: an import never invents a team or a person.
export function importRows(state:State,components:Component[]):ImportRow[] {
 const matches=components.map(c=>{
  const byId=state.services.filter(s=>s.id===c.metadata.name);
  return byId.length?byId:state.services.filter(s=>slug(s.name)===slug(c.metadata.name)||!!c.metadata.title&&slug(s.name)===slug(c.metadata.title));
 });
 const team=(id:string|null|undefined)=>{const t=state.teams?.find(t=>t.id===id);return t?{id:t.id,name:t.name}:null;};
 return components.map((c,i):ImportRow=>{
  const found=matches[i],service=found.length===1?found[0]:undefined;
  const row:ImportRow={entity:'component:'+(c.metadata.namespace||'default')+'/'+c.metadata.name,action:'unmatched',...service?{service:{id:service.id,name:service.name},current:team(service.team)}:{}};
  // The owner first: a component no team owns writes nothing, wherever it is.
  const owner=c.spec.owner?.trim(),kind=owner&&/^([^:/]+):/.exec(owner)?.[1].toLowerCase(),name=owner?.replace(/^[^:/]+:/,'').replace(/^[^/]*\//,'')??'';
  if(!owner)return {...row,reason:'No owner'};
  if(kind==='user')return {...row,reason:'Owned by a person, not a team'};
  if(kind&&kind!=='group')return {...row,reason:'Owner is not a team'};
  const named=(state.teams??[]).filter(t=>t.active&&slug(t.name)===slug(name));
  if(named.length!==1)return {...row,reason:named.length?'More than one team named '+name:'No active team named '+name};
  if(!service)return {...row,reason:found.length?'Matches '+found.map(s=>s.name).join(' and '):'Not in Oncall'};
  if(matches.filter(m=>m.length===1&&m[0]===service).length>1)return {...row,reason:'More than one component names this service'};
  const target={id:named[0].id,name:named[0].name};
  if(service.team===target.id)return {...row,team:target,action:'unchanged'};
  return {...row,team:target,action:!service.team||service.ownership?.source==='backstage'?'change':'conflict'};
 });
}
export const applies=(row:ImportRow,choices:Choices)=>row.action==='change'||row.action==='conflict'&&choices[row.service!.id]==='backstage';
// The applied row is already in the record (an apply whose answer was lost).
export const landed=(state:State,row:ImportRow)=>{const s=state.services.find(x=>x.id===row.service?.id);return !!s&&s.team===row.team?.id&&s.ownership?.source==='backstage'&&s.ownership.entity===row.entity;};
// The rows and the matched services' ownership, never the workspace revision: an unrelated write never stales a preview.
export async function importDigest(state:State,rows:ImportRow[]):Promise<string> {
 const input=JSON.stringify(rows.map(r=>[r,r.service?state.services.find(s=>s.id===r.service!.id)?.ownership??null:null]));
 return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(input)))].map(b=>b.toString(16).padStart(2,'0')).join('');
}
