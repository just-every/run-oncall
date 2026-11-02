import type {Team} from './model';
import type {State} from '../family/response-operations/domain';
import {cannotManage,managesButNotMember,noLongerActive,teamNameRule} from './words';

export type TeamEdit=
 | {kind:'name';value:string}
 | {kind:'active';value:boolean}
 | {kind:'members'|'managers';member:string;checked:boolean};

export const editTarget=(edit:TeamEdit)=>edit.kind+('member' in edit?':'+edit.member:'');

// The same single edit projects a kept draft and builds a write against the latest record.
export function applyTeamEdit(team:Team,edit:TeamEdit):Team {
 if(edit.kind==='name')return {...team,name:edit.value};
 if(edit.kind==='active')return {...team,active:edit.value};
 const chosen=team[edit.kind];
 const values=edit.checked?(chosen.includes(edit.member)?chosen:[...chosen,edit.member]):chosen.filter(id=>id!==edit.member);
 return {...team,[edit.kind]:values,...(edit.kind==='members'&&!edit.checked?{managers:team.managers.filter(id=>id!==edit.member)}:{})};
}

// Whether a kept edit still applies to the latest record, in the Teams door's own words: null when it applies.
export function teamEditProblem(state:State,id:string,edit:TeamEdit):string|null {
 const team=state.teams?.find(t=>t.id===id),person=(member:string)=>state.members.find(m=>m.id===member);
 if(!team)return 'This team is no longer available. Nothing was saved.';
 if(edit.kind==='managers'&&edit.checked&&!team.members.includes(edit.member))return (person(edit.member)?.name??'This person')+' is no longer a member of this team. Nothing was saved.';
 const next=applyTeamEdit(team,edit);
 if(typeof next.name!=='string'||!next.name.trim()||next.name.length>200)return teamNameRule;
 for(const member of next.managers){
  if(!next.members.includes(member))return managesButNotMember(person(member)?.name??'This person');
  if(!['admin','responder'].includes(person(member)?.role??''))return cannotManage(person(member)?.name??'This person');
 }
 const inactive=[...next.members,...next.managers].find(member=>!person(member)?.active);
 return inactive?noLongerActive(person(inactive)?.name??'This person'):null;
}
export const teamEditHeld=(team:Team,edit:TeamEdit)=>edit.kind==='name'?team.name===edit.value.trim():JSON.stringify(applyTeamEdit(team,edit))===JSON.stringify(team);
