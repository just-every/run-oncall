import {useEffect,useId,useRef,useState} from 'react';
import {Field,Form} from '../forms';
import {request} from '../useWorkspace';
import type {State,Member} from '../family/response-operations/domain';
import type {Team} from './model';
import {applyTeamEdit,editTarget,type TeamEdit} from './edits';
import './teams.css';

type Note={saving?:boolean;saved?:boolean;error?:string;retry?:()=>void};
type Pending={key:string;target:string;operation:()=>Promise<void>;team?:{id:string;edit:TeamEdit};ownership?:{service:string;value:string};error?:string};
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
function Choices({state,members,managers,onChange,note}:{state:State;members:string[];managers:string[];onChange:(members:string[],managers:string[],kind:'members'|'managers',edit:TeamEdit)=>void;note?:(kind:string)=>Note|undefined}){
 const id=useId(),[lastManager,setLastManager]=useState<string>();
 return <div className="teams-choices" role="group" aria-labelledby={id}><div id={id}>Members <Mark note={note?.('members')}/></div>
 {state.members.filter(m=>m.active&&!m.machine).map(m=><div className={'teams-person'+(members.includes(m.id)?' teams-chosen':'')} key={m.id}>
 <label className="teams-choice"><input type="checkbox" aria-label={'Member '+m.name} checked={members.includes(m.id)} onChange={e=>onChange(e.target.checked?[...members,m.id]:members.filter(id=>id!==m.id),e.target.checked?managers:managers.filter(id=>id!==m.id),'members',{kind:'members',member:m.id,checked:e.target.checked})}/><span>{m.name}</span></label>
 {members.includes(m.id)&&['admin','responder'].includes(m.role)&&<label className="teams-choice teams-manager"><input type="checkbox" aria-label={'Manager '+m.name} checked={managers.includes(m.id)} onChange={e=>{setLastManager(m.id);onChange(members,e.target.checked?[...managers,m.id]:managers.filter(id=>id!==m.id),'managers',{kind:'managers',member:m.id,checked:e.target.checked});}}/><span>Manager <Mark note={lastManager===m.id?note?.('managers'):undefined}/></span></label>}
 </div>)}<Feedback note={note?.('members')}/><div className="teams-manager-status"><Feedback note={note?.('managers')}/></div></div>;
}
function TeamEditor({state,team,write,notes}:{state:State;team:Team;write:(team:Team,edit:TeamEdit,key:string)=>void;notes:Record<string,Note>}){
 const [draft,setDraft]=useState<string|null>(null);
 const key=(field:string)=>team.id+':'+field;
 const commit=()=>{if(draft!==null){write(team,{kind:'name',value:draft},key('name'));setDraft(null);}};
 return <div className="teams-editor">
 <div onBlur={commit} onKeyDown={e=>{if(e.key==='Enter'&&e.target instanceof HTMLInputElement){e.preventDefault();commit();}}}><label className="field"><span>Team name <Mark note={draft!==null?undefined:notes[key('name')]}/></span><input name="name" aria-label="Team name" value={draft??team.name} onChange={e=>setDraft(e.target.value===team.name?null:e.target.value)}/></label><Feedback note={notes[key('name')]}/></div>
 <Choices state={state} members={team.members} managers={team.managers} onChange={(_m,_g,kind,edit)=>write(team,edit,key(kind))} note={kind=>notes[key(kind)]}/>
 <label className="field"><span>Team state <Mark note={notes[key('active')]}/></span><select name="active" aria-label="Team state" value={String(team.active)} onChange={e=>write(team,{kind:'active',value:e.target.value==='true'},key('active'))}><option value="true">Active</option><option value="false">Archived</option></select></label><Feedback note={notes[key('active')]}/>
 </div>;
}
function Ownership({service,teams,value,note,write}:{service:State['services'][number];teams:Team[];value:string;note?:Note;write:(value:string)=>void}){
 return <div className="teams-ownership"><label className="field"><span>{'Owning team for '+service.name} <Mark note={note}/></span><select aria-label={'Owning team for '+service.name} value={value} onChange={e=>write(e.target.value)}><option value="">Unassigned</option>{teams.filter(t=>t.active||t.id===value).map(t=><option key={t.id} value={t.id}>{t.name}{t.active?'':' (archived)'}</option>)}</select></label><Feedback note={note}/></div>;
}
export function TeamsPanel({state,actor,refresh,showOwnership=true}:{state:State;actor:Member;refresh:()=>Promise<void>;showOwnership?:boolean}){
 const [savedNotes,setNotes]=useState<Record<string,Note>>({}),[pending,setPending]=useState<Pending[]>([]),[creating,setCreating]=useState(false),[members,setMembers]=useState<string[]>([]),[managers,setManagers]=useState<string[]>([]);
 const jobs=useRef<Pending[]>([]),current=useRef(state),queue=useRef(Promise.resolve()),createRoot=useRef<HTMLDetailsElement>(null),createAttempt=useRef<string|undefined>(undefined),createDraft=useRef({members,managers});
 createDraft.current={members,managers};
 const teams=state.teams??[],admin=actor.role==='admin';
 useEffect(()=>{current.current=state;},[state]);
 const note=(key:string,value:Note)=>setNotes(old=>({...old,[key]:value}));
 const publish=()=>setPending([...jobs.current]);
 const notes={...savedNotes};
 for(const job of pending){
  const related=pending.filter(p=>p.key===job.key),failed=related.find(p=>p.error);
  notes[job.key]=failed?{error:failed.error,retry:()=>related.filter(p=>p.error).forEach(p=>enqueue(p,true))}:{saving:true};
 }
 async function readBack(){current.current=await request('/api/state');await refresh();}
 // Keep each requested edit over the record, including failed edits. All writes share one revision queue.
 function enqueue(job:Pending,retry=false){
  delete job.error;publish();
  const execute=async()=>{
   if(!jobs.current.includes(job))return;
   try{
    if(retry)await readBack();
    await job.operation();await readBack();
    jobs.current=jobs.current.filter(p=>p!==job);publish();note(job.key,{saved:true});
   }catch(error){
    // Even a refused write can reveal another admin's changes. An offline read leaves the draft kept.
    await readBack().catch(()=>{});
    job.error=words(error);publish();
   }
  };
  queue.current=queue.current.then(execute,execute);
 }
 function keep(job:Pending){
  jobs.current=[...jobs.current.filter(p=>p.target!==job.target),job];enqueue(job);
 }
 const shown=(team:Team)=>pending.reduce((value,p)=>p.team?.id===team.id?applyTeamEdit(value,p.team.edit):value,team);
 const write=(team:Team,edit:TeamEdit,key:string)=>keep({key,target:team.id+':'+editTarget(edit),team:{id:team.id,edit},operation:async()=>{
  const latest=current.current.teams?.find(t=>t.id===team.id);
  if(!latest)throw Error(team.name+' is not available');
  const result=await request('/api/teams',applyTeamEdit(latest,edit));
  if(!result||result.id!==latest.id||!Number.isSafeInteger(result.revision)||result.revision!==latest.revision+1)throw Error('Invalid server response');
  current.current={...current.current,teams:current.current.teams!.map(t=>t.id===result.id?result:t)};
 }});
 async function create(data:any,id=createAttempt.current??crypto.randomUUID(),retry=false){
  const repeated=retry||createAttempt.current===id;
  createAttempt.current=id;
  const draft={name:data.name,members:[...createDraft.current.members],managers:[...createDraft.current.managers]};
  setCreating(true);
  let succeeded=false;
  const operation=async()=>{
   const existing:Team|undefined=repeated?(await request('/api/teams')).teams.find((t:Team)=>t.id===id):undefined;
   if(existing&&existing.name===draft.name&&JSON.stringify(existing.members)===JSON.stringify(draft.members)&&JSON.stringify(existing.managers)===JSON.stringify(draft.managers))return;
   const payload=existing?{...existing,...draft}:{id,...draft,revision:0,visibility:'public',active:true};
   const result=await request('/api/teams',payload);
   if(result?.id!==id||result.revision!==(existing?existing.revision+1:1))throw Error('Invalid server response');
  };
  note('create',{saving:true});
  const execute=async()=>{try{
   await operation();await readBack();
   succeeded=true;createAttempt.current=undefined;createRoot.current?.querySelector('form')?.reset();
   setMembers([]);setManagers([]);note('create',{saved:true});
  }catch(error){await readBack().catch(()=>{});note('create',{error:words(error),retry:()=>{
   const form=createRoot.current!.querySelector('form')!;
   void create({name:new FormData(form).get('name')},id,true);
  }});}finally{setCreating(false);}};
  queue.current=queue.current.then(execute,execute);await queue.current;return succeeded;
 }
 return <section className="panel padded teams-panel" aria-label="Teams"><h2>Teams</h2>
 {teams.map(team=><article className="service-card" key={team.id}><h3>{team.name}</h3><p>Public · {team.active?'Active':'Archived'} · {team.members.length} {team.members.length===1?'member':'members'}</p><p>Managers: {team.managers.map(id=>state.members.find(m=>m.id===id)?.name??'Unavailable member').join(', ')||'None'}</p>
 {admin&&<details><summary>Edit team</summary><TeamEditor state={state} team={shown(team)} write={write} notes={notes}/></details>}</article>)}
 {admin&&<><details ref={createRoot} onChange={()=>{if(notes.create?.saved)note('create',{});}}><summary>Create team</summary><Form busy={creating} label="Create team" onSubmit={create}><Field name="name" label="Team name"/><Choices state={state} members={members} managers={managers} onChange={(m,g)=>{setMembers(m);setManagers(g);}}/></Form><Mark note={notes.create}/><Feedback note={notes.create}/></details>
 {showOwnership&&<><h3>Service ownership</h3>{state.services.map(service=><Ownership key={service.id} service={service} teams={teams} value={pending.find(p=>p.ownership?.service===service.id)?.ownership?.value??service.team??''} note={notes['ownership:'+service.id]} write={value=>keep({key:'ownership:'+service.id,target:'ownership:'+service.id,ownership:{service:service.id,value},operation:async()=>{
 const revision=current.current.revision,result=await request('/api/teams/ownership',{service:service.id,team:value||null,workspaceRevision:revision});
 if(!result||result.id!==service.id||result.team!==(value||null))throw Error('Invalid server response');
 }})}/>)}</>}</>}
 </section>;
}
