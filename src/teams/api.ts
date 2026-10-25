import {editTeam} from './model';
import {fail,type State} from '../family/response-operations/domain';
type Deps={body:(c:any)=>Promise<any>;state:(c:any,admin?:boolean)=>Promise<State>;save:(c:any,state:State,revision:number)=>Promise<void>};
export function installTeams(api:any,deps:Deps){
 api.get('/api/teams',async(c:any)=>{const state=await deps.state(c);return c.json({teams:state.teams??[],workspaceRevision:state.revision});});
 api.post('/api/teams',async(c:any)=>{const input=await deps.body(c),state=await deps.state(c,true),revision=state.revision;const team=editTeam(state,c.get('actor'),input);await deps.save(c,state,revision);return c.json(team);});
 api.post('/api/teams/ownership',async(c:any)=>{
  const input=await deps.body(c),state=await deps.state(c,true),revision=state.revision;
  if(!input||Object.keys(input).some(k=>!['service','team','workspaceRevision'].includes(k)))fail('Invalid ownership fields');
  if(input.workspaceRevision!==revision)fail('Workspace changed; reload and retry',409);
  const service=state.services.find(s=>s.id===input.service);if(!service)fail('Not found',404);
  if(input.team!==null&&!state.teams?.some(t=>t.id===input.team&&t.active))fail('Choose an active owning team or explicitly unassigned');
  service.team=input.team;await deps.save(c,state,revision);return c.json(service);
 });
}
