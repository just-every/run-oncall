import {fail,text,type State,type Member} from '../family/response-operations/domain.ts';
import {cannotManage,managesButNotMember,noLongerActive,staleTeam,teamNameRule} from './words.ts';

export type Team={id:string;name:string;visibility:'public';active:boolean;revision:number;members:string[];managers:string[]};
function teamName(value:unknown){try{return text(value,'Team name',200);}catch{fail(teamNameRule);}}
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
// PTO authority is narrower than coverage management: ordinary responders may
// append only their own PTO on a service owned by their current active team.
export function memberPTO(state:State,actor:Member,service:string,member:string):boolean {
 const current=state.members.find(m=>m.id===actor.id&&m.active);
 if(!current)return false;
 if(current.role==='admin')return true;
 if(current.role!=='responder'||member!==current.id)return false;
 const owner=state.services.find(s=>s.id===service)?.team;
 return !!state.teams?.some(t=>t.id===owner&&t.active&&t.members.includes(current.id));
}
export function requireMemberPTO(state:State,actor:Member,service:string,member:string) {
 if(!memberPTO(state,actor,service,member))fail('Only an administrator or a current member of this service’s team recording their own PTO can record PTO.',403);
}
export function validateTeams(state:State) {
 if(state.teams===undefined){if(state.services.some(s=>s.team!==undefined&&s.team!==null||s.ownership!==undefined))fail('Choose an available owning team or Unassigned.');return;}
 if(!Array.isArray(state.teams)||state.teams.length>1000||new Set(state.teams.map(t=>t?.id)).size!==state.teams.length)fail('Choose up to 1,000 teams, each with its own name.');
 for(const team of state.teams){
  if(!team||typeof team!=='object'||Array.isArray(team)||Object.keys(team).some(k=>!['id','name','visibility','active','revision','members','managers'].includes(k)))fail('Enter a team name and choose its members.');
  text(team.id,'Team ID',100);teamName(team.name);
  if(team.visibility!=='public'||typeof team.active!=='boolean'||!Number.isSafeInteger(team.revision)||team.revision<1)fail('Choose Active or Archived for this public team.');
  for(const key of ['members','managers'] as const){const ids=team[key];if(!Array.isArray(ids)||ids.length>1000||new Set(ids).size!==ids.length||ids.some(id=>!state.members.some(m=>m.id===id&&!m.erased)))fail('Choose each available member once.');}
  for(const id of team.managers){const person=state.members.find(m=>m.id===id);if(!team.members.includes(id))fail(managesButNotMember(person?.name??'This person'));if(!person||!['admin','responder'].includes(person.role))fail(cannotManage(person?.name??'This person'));}
 }
 for(const service of state.services)if(service.team!==undefined&&service.team!==null&&!state.teams.some(t=>t.id===service.team))fail('Choose an available owning team or Unassigned.');
 // Imported ownership names the Backstage component it came from; it holds no person.
 for(const {ownership:o,team} of state.services)if(o!==undefined&&(!o||typeof o!=='object'||Array.isArray(o)||Object.keys(o).length!==4||o.source!=='backstage'||typeof o.entity!=='string'||!/^component:[^/]{1,253}\/[^/]{1,253}$/.test(o.entity)||typeof o.importId!=='string'||!o.importId||o.importId.length>100||typeof o.importedAt!=='string'||Number.isNaN(Date.parse(o.importedAt))||!team))fail('Imported service ownership is not valid.');
}
export function editTeam(state:State,actor:Member,input:any):Team {
 if(!state.members.some(m=>m.id===actor.id&&m.active&&m.role==='admin'))fail('Only a current workspace administrator can change teams.',403);
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!['id','name','visibility','active','revision','members','managers'].includes(k)))fail('Enter a team name and choose its members.');
 // Private records cannot be authored until every existing read/export/integration door enforces their scope.
 if(input.visibility!=='public')fail('Private teams are not available: access enforcement is not complete',409);
 const id=input.id?text(input.id,'Team ID',100):crypto.randomUUID(),old=state.teams?.find(t=>t.id===id);
 if(!Number.isSafeInteger(input.revision)||input.revision!==(old?.revision??0))fail(staleTeam,409);
 const team:Team={id,name:teamName(input.name),visibility:'public',active:input.active,revision:input.revision+1,members:input.members,managers:input.managers};
 // An edited team keeps its place, so another admin's edit never reorders the cards around a field being typed in.
 state.teams=old?state.teams!.map(t=>t.id===id?team:t):[...(state.teams??[]),team];validateTeams(state);
 for(const id of [...team.members,...team.managers])if(!state.members.some(m=>m.id===id&&m.active))fail(noLongerActive(state.members.find(m=>m.id===id)?.name??'This person'));
 return team;
}
