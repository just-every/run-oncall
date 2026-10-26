import {useEffect,useId,useRef,useState} from 'react';
import {Field,Form} from '../forms';
import {request} from '../useWorkspace';
import type {State,Member} from '../family/response-operations/domain';
import type {Team} from './model';
import './teams.css';

type Note={saving?:boolean;saved?:boolean;error?:string;retry?:()=>void};
type Patch=Partial<Pick<Team,'name'|'members'|'managers'|'active'>>;
function words(error:unknown){
 const message=error instanceof Error?error.message:'';
 if(/Connection interrupted/.test(message))return 'The connection was lost. Your change is kept.';
 if(/Invalid server response|Request failed/.test(message))return 'The save could not be confirmed. Your change is kept.';
 if(/^(This team changed\.|Service ownership changed\.)/.test(message))return message;
 if(/changed;|changed\./i.test(message))return 'Someone else changed this team or its services. Your change is kept.';
 if(/ cannot belong to /.test(message))return message;
 if(/^(.* manages but is not a member|.* cannot manage this team|.* is no longer an active member|.* is archived|.* is not available|Enter a team name|Choose |Only |Sign in |Private teams)/.test(message))return message;
 return 'This change could not be saved. Your change is kept.';
}
function Feedback({note}: {note?:Note}){
 const ref=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(note?.error&&ref.current){const r=ref.current.getBoundingClientRect();if(r.top<0||r.bottom>innerHeight)ref.current.scrollIntoView({block:'nearest'});}},[note?.error]);
 return note?.error?<div ref={ref} className="teams-failure" role="alert">{note.error} <button type="button" onClick={note.retry}>Retry</button></div>:null;
}
function Mark({note}:{note?:Note}){return <span className="teams-status" role="status">{note?.saving?'Saving…':note?.saved?'Saved':''}</span>;}
function Choices({state,members,managers,onChange,note}:{state:State;members:string[];managers:string[];onChange:(members:string[],managers:string[],kind:'members'|'managers')=>void;note?:(kind:string)=>Note|undefined}){
 const id=useId();
 return <div className="teams-choices" role="group" aria-labelledby={id}><div id={id}>Members <Mark note={note?.('members')}/></div>
 {state.members.filter(m=>m.active&&!m.machine).map(m=><div className={'teams-person'+(members.includes(m.id)?' teams-chosen':'')} key={m.id}>
 <label className="teams-choice"><input type="checkbox" aria-label={'Member '+m.name} checked={members.includes(m.id)} onChange={e=>onChange(e.target.checked?[...members,m.id]:members.filter(id=>id!==m.id),e.target.checked?managers:managers.filter(id=>id!==m.id),'members')}/><span>{m.name}</span></label>
 {members.includes(m.id)&&['admin','responder'].includes(m.role)&&<label className="teams-choice teams-manager"><input type="checkbox" aria-label={'Manager '+m.name} checked={managers.includes(m.id)} onChange={e=>onChange(members,e.target.checked?[...managers,m.id]:managers.filter(id=>id!==m.id),'managers')}/><span>Manager <Mark note={note?.('managers')}/></span></label>}
 </div>)}<Feedback note={note?.('members')}/><div className="teams-manager-status"><Mark note={note?.('managers')}/><Feedback note={note?.('managers')}/></div></div>;
}
function TeamEditor({state,team,write,notes}:{state:State;team:Team;write:(team:Team,patch:Patch,key:string)=>void;notes:Record<string,Note>}){
 const [name,setName]=useState(team.name),[members,setMembers]=useState(team.members),[managers,setManagers]=useState(team.managers),[active,setActive]=useState(team.active);
 const dirty=useRef(false),lastName=useRef(team.name);
 useEffect(()=>{if(!dirty.current){setName(team.name);lastName.current=team.name;}},[team.name]);
 const key=(field:string)=>team.id+':'+field;
 const commit=()=>{if(name!==lastName.current){lastName.current=name;dirty.current=false;write(team,{name},key('name'));}};
 return <div className="teams-editor">
 <div onBlur={commit} onKeyDown={e=>{if(e.key==='Enter'&&e.target instanceof HTMLInputElement){e.preventDefault();commit();}}}><label className="field"><span>Team name <Mark note={notes[key('name')]}/></span><input name="name" aria-label="Team name" value={name} onChange={e=>{dirty.current=true;setName(e.target.value);}}/></label><Feedback note={notes[key('name')]}/></div>
 <Choices state={state} members={members} managers={managers} onChange={(m,g,kind)=>{setMembers(m);setManagers(g);write(team,{members:m,managers:g},key(kind));}} note={kind=>notes[key(kind)]}/>
 <label className="field"><span>Team state <Mark note={notes[key('active')]}/></span><select name="active" aria-label="Team state" value={String(active)} onChange={e=>{const value=e.target.value==='true';setActive(value);write(team,{active:value},key('active'));}}><option value="true">Active</option><option value="false">Archived</option></select></label><Feedback note={notes[key('active')]}/>
 </div>;
}
function Ownership({service,teams,note,write}:{service:State['services'][number];teams:Team[];note?:Note;write:(value:string)=>void}){
 const [value,setValue]=useState(service.team??'');
 return <div className="teams-ownership"><label className="field"><span>{'Owning team for '+service.name} <Mark note={note}/></span><select aria-label={'Owning team for '+service.name} value={value} onChange={e=>{setValue(e.target.value);write(e.target.value);}}><option value="">Unassigned</option>{teams.filter(t=>t.active||t.id===value).map(t=><option key={t.id} value={t.id}>{t.name}{t.active?'':' (archived)'}</option>)}</select></label><Feedback note={note}/></div>;
}
export function TeamsPanel({state,actor,refresh}:{state:State;actor:Member;refresh:()=>Promise<void>}){
 const [notes,setNotes]=useState<Record<string,Note>>({}),[creating,setCreating]=useState(false),[members,setMembers]=useState<string[]>([]),[managers,setManagers]=useState<string[]>([]);
 const current=useRef(state),queue=useRef(Promise.resolve());
 const teams=state.teams??[],admin=actor.role==='admin';
 useEffect(()=>{current.current=state;},[state]);
 const note=(key:string,value:Note)=>setNotes(old=>({...old,[key]:value}));
 // Every Teams write, including ownership, shares one queue and the state returned by the previous write.
 function enqueue(key:string,operation:()=>Promise<void>,retry=false){
  note(key,{saving:true});
  const execute=async()=>{try{
   if(retry)current.current=await request('/api/state');
   await operation();
   current.current=await request('/api/state');
   await refresh();
   note(key,{saved:true});
  }catch(error){note(key,{error:words(error),retry:()=>enqueue(key,operation,true)});}};
  queue.current=queue.current.then(execute,execute);
 }
 const write=(team:Team,patch:Patch,key:string)=>enqueue(key,async()=>{
  const latest=current.current.teams?.find(t=>t.id===team.id);
  if(!latest)throw Error(team.name+' is not available');
  const result=await request('/api/teams',{...latest,...patch});
  if(!result||result.id!==latest.id||!Number.isSafeInteger(result.revision)||result.revision<=latest.revision)throw Error('Invalid server response');
  current.current={...current.current,teams:current.current.teams!.map(t=>t.id===result.id?result:t)};
 });
 async function create(data:any,id=crypto.randomUUID()){
  setCreating(true);
  // Keep Form's values until a confirmed create, including on Retry.
  let succeeded=false;
  const operation=async()=>{const result=await request('/api/teams',{id,name:data.name,members:[...members],managers:[...managers],revision:0,visibility:'public',active:true});if(!result?.id||result.revision!==1)throw Error('Invalid server response');};
  note('create',{saving:true});
  const execute=async()=>{try{await operation();current.current=await request('/api/state');await refresh();succeeded=true;note('create',{saved:true});setMembers([]);setManagers([]);}catch(error){note('create',{error:words(error),retry:()=>{void create(data,id);}});}finally{setCreating(false);}};
  queue.current=queue.current.then(execute,execute);await queue.current;return succeeded;
 }
 return <section className="panel padded teams-panel" aria-label="Teams"><h2>Teams</h2>
 {teams.map(team=><article className="service-card" key={team.id}><h3>{team.name}</h3><p>Public · {team.active?'Active':'Archived'} · {team.members.length} {team.members.length===1?'member':'members'}</p>
 {admin&&<details><summary>Edit team</summary><TeamEditor state={state} team={team} write={write} notes={notes}/></details>}</article>)}
 {admin&&<><details><summary>Create team</summary><Form busy={creating} label="Create team" onSubmit={create}><Field name="name" label="Team name"/><Choices state={state} members={members} managers={managers} onChange={(m,g)=>{setMembers(m);setManagers(g);}}/></Form><Mark note={notes.create}/><Feedback note={notes.create}/></details>
 <h3>Service ownership</h3>{state.services.map(service=><Ownership key={service.id} service={service} teams={teams} note={notes['ownership:'+service.id]} write={value=>enqueue('ownership:'+service.id,async()=>{
 const revision=current.current.revision,result=await request('/api/teams/ownership',{service:service.id,team:value||null,workspaceRevision:revision});
 if(!result||result.id!==service.id||result.team!==(value||null))throw Error('Invalid server response');
 })}/>)}</>}
 </section>;
}
