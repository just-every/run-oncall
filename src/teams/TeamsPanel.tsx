import {useId} from 'react';
import {Field,Form} from '../forms';
import type {State,Member} from '../family/response-operations/domain';
import type {Team} from './model';

function TeamFields({state,team}:{state:State;team?:Team}){
 const identity=useId(),members=state.members.filter(m=>m.active&&!m.machine);
 return <><Field name="name" label="Team name" value={team?.name}/>
 <label className="field"><span id={identity+'-members'}>Members</span><select name="members" multiple aria-labelledby={identity+'-members'} defaultValue={team?.members??[]}>{members.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
 <label className="field"><span id={identity+'-managers'}>Managers</span><select name="managers" multiple aria-labelledby={identity+'-managers'} defaultValue={team?.managers??[]}>{members.filter(m=>['admin','responder'].includes(m.role)).map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
 <p>Public team. Managers must also be selected as members. Managers administer this team’s service coverage. Workspace administrators retain cross-team access.</p>
 {team&&<Field name="active" label="Team state" value={String(team.active)}><option value="true">Active</option><option value="false">Archived</option></Field>}</>;
}
export function TeamsPanel({state,actor,busy,run}:{state:State;actor:Member;busy:boolean;run:(path:string,data:any)=>Promise<any>}){
 const admin=actor.role==='admin',teams=state.teams??[];
 const save=(data:any,team?:Team)=>run('/api/teams',{...data,members:data.members??[],managers:data.managers??[],id:team?.id,revision:team?.revision??0,visibility:'public',active:team?data.active==='true':true});
 return <section className="panel padded" aria-label="Teams"><h2>Teams</h2><p>Public teams organize service ownership and coverage. Private access is not available yet.</p>
 {teams.map(team=><article className="service-card" key={team.id}><h3>{team.name}</h3><p>Public · {team.active?'Active':'Archived'} · {team.members.length} members</p><p>Managers: {team.managers.map(id=>state.members.find(m=>m.id===id)?.name??'Unavailable member').join(', ')||'None'}</p>
 {admin&&<details><summary>Edit team</summary><Form key={team.revision} busy={busy} label="Save team" onSubmit={data=>save(data,team)}><TeamFields state={state} team={team}/></Form></details>}</article>)}
 {admin&&<><details><summary>Create team</summary><Form busy={busy} label="Create team" onSubmit={data=>save(data)}><TeamFields state={state}/></Form></details>
 <h3>Service ownership</h3>{state.services.map(service=><Form key={service.id+':'+state.revision} busy={busy} label="Save owning team" onSubmit={data=>run('/api/teams/ownership',{service:service.id,team:data.team||null,workspaceRevision:state.revision})}><Field name="team" label={'Owning team for '+service.name} value={service.team??''} required={false}><option value="">Unassigned · workspace visible</option>{teams.filter(t=>t.active||t.id===service.team).map(t=><option key={t.id} value={t.id}>{t.name}{t.active?'':' (archived)'}</option>)}</Field></Form>)}</>}
 </section>;
}
