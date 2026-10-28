import {setAuditSubject} from '../audit-store';
import {editTeam,validateTeams} from './model';
import {applies,catalogComponents,catalogLimit,catalogBodyLimit,importDigest,importRows,type Choices} from './backstage';
import {cannotBelong,importChanged,notCatalog,serviceGone,staleOwnership,tooManyComponents} from './words';
import {fail,type State} from '../family/response-operations/domain';
type Deps={body:(c:any,max?:number,tooLarge?:string)=>Promise<any>;state:(c:any,admin?:boolean)=>Promise<State>;save:(c:any,state:State,revision:number)=>Promise<void>};
// A Backstage catalog, bounded before any row is computed (deps.state(c,true) has already required an administrator).
function catalog(input:any,keys:string[]){
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!keys.includes(k)))fail(notCatalog);
 const components=catalogComponents(input.catalog)??fail(notCatalog);
 if(components.length>catalogLimit)fail(tooManyComponents,413);
 return components;
}
export function installTeams(api:any,deps:Deps){
 api.get('/api/teams',async(c:any)=>{const state=await deps.state(c);return c.json({teams:state.teams??[],workspaceRevision:state.revision});});
 api.post('/api/teams',async(c:any)=>{const input=await deps.body(c),state=await deps.state(c,true),revision=state.revision;const team=editTeam(state,c.get('actor'),input);setAuditSubject(c.env.DB,'entity',team.id);await deps.save(c,state,revision);return c.json(team);});
 api.post('/api/teams/ownership',async(c:any)=>{
  const input=await deps.body(c),state=await deps.state(c,true),revision=state.revision;
  if(!input||Object.keys(input).some(k=>!['service','team','workspaceRevision'].includes(k)))fail('Choose a service and its owning team.');
  if(input.workspaceRevision!==revision)fail(staleOwnership,409);
  const service=state.services.find(s=>s.id===input.service);if(!service)fail(serviceGone,404);
  if(input.team!==null&&!state.teams?.some(t=>t.id===input.team&&t.active))fail(cannotBelong(service.name,state.teams?.find(t=>t.id===input.team)?.name??'this team'));
  // A choice made here is the person's own: it replaces any imported provenance.
  service.team=input.team;delete service.ownership;await deps.save(c,state,revision);return c.json(service);
 });
 // Preview writes nothing; apply recomputes the same rows and refuses a changed digest.
 api.post('/api/teams/backstage/preview',async(c:any)=>{
  const input=await deps.body(c,catalogBodyLimit,tooManyComponents),state=await deps.state(c,true),rows=importRows(state,catalog(input,['catalog']));
  return c.json({rows,digest:await importDigest(state,rows)});
 });
 api.post('/api/teams/backstage/apply',async(c:any)=>{
  const input=await deps.body(c,catalogBodyLimit,tooManyComponents),state=await deps.state(c,true),revision=state.revision,rows=importRows(state,catalog(input,['catalog','digest','choices']));
  if(input.digest!==await importDigest(state,rows))fail(importChanged,409);
  const choices:Choices=input.choices??{};
  if(!choices||typeof choices!=='object'||Array.isArray(choices)||Object.entries(choices).some(([id,choice])=>!['current','backstage'].includes(choice)||!rows.some(r=>r.action==='conflict'&&r.service?.id===id)))fail('Choose Keep current or Use Backstage for each conflict.');
  const applied=rows.filter(r=>applies(r,choices)),imported={source:'backstage' as const,importId:crypto.randomUUID(),importedAt:new Date().toISOString()};
  for(const row of applied){const service=state.services.find(s=>s.id===row.service!.id)!;service.team=row.team!.id;service.ownership={...imported,entity:row.entity};}
  if(applied.length){validateTeams(state);await deps.save(c,state,revision);}
  return c.json({rows,applied:applied.map(r=>r.service!.id)});
 });
}
