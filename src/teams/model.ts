import {fail,text,type State,type Member} from '../family/response-operations/domain.ts';

export type Team={id:string;name:string;visibility:'public';active:boolean;revision:number;members:string[];managers:string[]};
function teamName(value:unknown){try{return text(value,'Team name',200);}catch{fail('Enter a team name with up to 200 characters.');}}
export function teamCoverage(state:State,actor:Member,service:string):boolean {
 const current=state.members.find(m=>m.id===actor.id&&m.active);
 if(!current)return false;
 if(current.role==='admin')return true;
 const owner=state.services.find(s=>s.id===service)?.team;
 return current.role==='responder'&&!!state.teams?.some(t=>t.id===owner&&t.active&&t.managers.includes(current.id));
}
export function requireTeamCoverage(state:State,actor:Member,service:string) {
 if(!['admin','responder'].includes(actor.role))fail('Only responders and workspace administrators can change coverage.',403);
 if(!teamCoverage(state,actor,service))fail((state.services.find(s=>s.id===service)?.name??'This service')+' is not covered by a team you manage. A workspace administrator can change its owning team.',404);
}
/** PTO never grants authority over the rest of a rota. Use current team membership,
 * not retained rotation slots, to bind an ordinary responder to their own absence. */
export function teamPTO(state:State,actor:Member,service:string,member:unknown):boolean {
 const current=state.members.find(m=>m.id===actor.id&&m.active);
 if(!current)return false;
 if(current.role==='admin')return true;
 if(current.role!=='responder'||member!==current.id)return false;
 const owner=state.services.find(s=>s.id===service)?.team;
 return !!state.teams?.some(t=>t.id===owner&&t.active&&t.members.includes(current.id));
}
export function requireTeamPTO(state:State,actor:Member,service:string,member:unknown) {
 if(!['admin','responder'].includes(actor.role))fail('Only responders and workspace administrators can record PTO.',403);
 if(actor.role!=='admin'&&member!==actor.id)fail('Only an administrator can record another member’s PTO',403);
 if(!teamPTO(state,actor,service,member))fail('This rota is not owned by an active team you belong to. Ask a workspace administrator to record your PTO.',404);
}
export function validateTeams(state:State) {
 if(state.teams===undefined){if(state.services.some(s=>s.team!==undefined&&s.team!==null))fail('Choose an available owning team or Unassigned.');return;}
 if(!Array.isArray(state.teams)||state.teams.length>1000||new Set(state.teams.map(t=>t?.id)).size!==state.teams.length)fail('Choose up to 1,000 teams, each with its own name.');
 for(const team of state.teams){
  if(!team||typeof team!=='object'||Array.isArray(team)||Object.keys(team).some(k=>!['id','name','visibility','active','revision','members','managers'].includes(k)))fail('Enter a team name and choose its members.');
  text(team.id,'Team ID',100);teamName(team.name);
  if(team.visibility!=='public'||typeof team.active!=='boolean'||!Number.isSafeInteger(team.revision)||team.revision<1)fail('Choose Active or Archived for this public team.');
  for(const key of ['members','managers'] as const){const ids=team[key];if(!Array.isArray(ids)||ids.length>1000||new Set(ids).size!==ids.length||ids.some(id=>!state.members.some(m=>m.id===id&&!m.erased)))fail('Choose each available member once.');}
  for(const id of team.managers){const person=state.members.find(m=>m.id===id);if(!team.members.includes(id))fail((person?.name??'This person')+' manages but is not a member');if(!person||!['admin','responder'].includes(person.role))fail((person?.name??'This person')+' cannot manage this team. Choose a responder or administrator.');}
 }
 for(const service of state.services)if(service.team!==undefined&&service.team!==null&&!state.teams.some(t=>t.id===service.team))fail('Choose an available owning team or Unassigned.');
}
export function editTeam(state:State,actor:Member,input:any):Team {
 if(!state.members.some(m=>m.id===actor.id&&m.active&&m.role==='admin'))fail('Only a current workspace administrator can change teams.',403);
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!['id','name','visibility','active','revision','members','managers'].includes(k)))fail('Enter a team name and choose its members.');
 // Private records cannot be authored until every existing read/export/integration door enforces their scope.
 if(input.visibility!=='public')fail('Private teams are not available: access enforcement is not complete',409);
 const id=input.id?text(input.id,'Team ID',100):crypto.randomUUID(),old=state.teams?.find(t=>t.id===id);
 if(!Number.isSafeInteger(input.revision)||input.revision!==(old?.revision??0))fail('This team changed. Retry to keep your change with its latest version.',409);
 const team:Team={id,name:teamName(input.name),visibility:'public',active:input.active,revision:input.revision+1,members:input.members,managers:input.managers};
 state.teams=[...(state.teams??[]).filter(t=>t.id!==id),team];validateTeams(state);
 for(const id of [...team.members,...team.managers])if(!state.members.some(m=>m.id===id&&m.active))fail((state.members.find(m=>m.id===id)?.name??'This person')+' is no longer an active member. Choose an active member.');
 return team;
}
