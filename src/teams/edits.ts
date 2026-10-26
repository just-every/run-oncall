import type {Team} from './model';

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
