import {fail,text,type State,type Member} from '../family/response-operations/domain';

export type Team={id:string;name:string;visibility:'public';active:boolean;revision:number;members:string[];managers:string[]};
export function teamCoverage(state:State,actor:Member,service:string):boolean {
 const current=state.members.find(m=>m.id===actor.id&&m.active);
 if(!current)return false;
 if(current.role==='admin')return true;
 const owner=state.services.find(s=>s.id===service)?.team;
 return current.role==='responder'&&!!state.teams?.some(t=>t.id===owner&&t.active&&t.managers.includes(current.id));
}
export function requireTeamCoverage(state:State,actor:Member,service:string) {
 if(!teamCoverage(state,actor,service))fail('Not found',404);
}
export function validateTeams(state:State) {
 if(state.teams===undefined)return;
 if(!Array.isArray(state.teams)||state.teams.length>1000||new Set(state.teams.map(t=>t.id)).size!==state.teams.length)fail('Invalid teams');
 for(const team of state.teams){
  if(!team||Object.keys(team).some(k=>!['id','name','visibility','active','revision','members','managers'].includes(k)))fail('Invalid team fields');
  text(team.id,'Team ID',100);text(team.name,'Team name',200);
  if(team.visibility!=='public'||typeof team.active!=='boolean'||!Number.isSafeInteger(team.revision)||team.revision<1)fail('Invalid team state');
  for(const key of ['members','managers'] as const){const ids=team[key];if(!Array.isArray(ids)||ids.length>1000||new Set(ids).size!==ids.length||ids.some(id=>!state.members.some(m=>m.id===id&&!m.erased)))fail('Invalid team membership');}
  if(team.managers.some(id=>!team.members.includes(id)||!state.members.some(m=>m.id===id&&['admin','responder'].includes(m.role))))fail('Managers must be team responders');
 }
 for(const service of state.services)if(service.team!==undefined&&service.team!==null&&!state.teams.some(t=>t.id===service.team))fail('Invalid owning team');
}
export function editTeam(state:State,actor:Member,input:any):Team {
 if(!state.members.some(m=>m.id===actor.id&&m.active&&m.role==='admin'))fail('Current administrator required',403);
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!['id','name','visibility','active','revision','members','managers'].includes(k)))fail('Invalid team fields');
 // Private records cannot be authored until every existing read/export/integration door enforces their scope.
 if(input.visibility!=='public')fail('Private teams are not available: access enforcement is not complete',409);
 const id=input.id?text(input.id,'Team ID',100):crypto.randomUUID(),old=state.teams?.find(t=>t.id===id);
 if(!Number.isSafeInteger(input.revision)||input.revision!==(old?.revision??0))fail('Team changed; reload and retry',409);
 const team:Team={id,name:text(input.name,'Team name',200),visibility:'public',active:input.active,revision:input.revision+1,members:input.members,managers:input.managers};
 if(team.members?.some(id=>!state.members.some(m=>m.id===id&&m.active))||team.managers?.some(id=>!state.members.some(m=>m.id===id&&m.active)))fail('Choose active team members');
 state.teams=[...(state.teams??[]).filter(t=>t.id!==id),team];validateTeams(state);return team;
}
