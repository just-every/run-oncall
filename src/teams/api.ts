import {setAuditSubject} from '../audit-store';
import {editTeam} from './model';
import {fail,type State} from '../family/response-operations/domain';
type Deps={body:(c:any)=>Promise<any>;state:(c:any,admin?:boolean)=>Promise<State>;save:(c:any,state:State,revision:number)=>Promise<void>};
export function installTeams(api:any,deps:Deps){
 api.get('/api/teams',async(c:any)=>{const state=await deps.state(c);return c.json({teams:state.teams??[],workspaceRevision:state.revision});});
 api.post('/api/teams',async(c:any)=>{const input=await deps.body(c),state=await deps.state(c,true),revision=state.revision;const team=editTeam(state,c.get('actor'),input);setAuditSubject(c.env.DB,'entity',team.id);await deps.save(c,state,revision);return c.json(team);});
 api.post('/api/teams/ownership',async(c:any)=>{
  const input=await deps.body(c),state=await deps.state(c,true),revision=state.revision;
  if(!input||Object.keys(input).some(k=>!['service','team','workspaceRevision'].includes(k)))fail('Choose a service and its owning team.');
  if(input.workspaceRevision!==revision)fail('Service ownership changed. Retry to keep your choice with its latest version.',409);
  const service=state.services.find(s=>s.id===input.service);if(!service)fail('This service is not available. Choose a current service.',404);
  if(input.team!==null&&!state.teams?.some(t=>t.id===input.team&&t.active))fail(service.name+' cannot belong to '+(state.teams?.find(t=>t.id===input.team)?.name??'this team')+' because the team is archived or unavailable. Restore the team or choose another.');
  service.team=input.team;await deps.save(c,state,revision);return c.json(service);
 });
}
