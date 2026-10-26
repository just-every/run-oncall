import {useEffect,useId,useRef,useState} from 'react';
import {Field,Form} from '../forms';
import {request} from '../useWorkspace';
import type {State,Member} from '../family/response-operations/domain';
import type {Team} from './model';
import {applyTeamEdit,editTarget,ownershipHeld,ownershipProblem,teamEditHeld,teamEditProblem,type TeamEdit} from './edits';
import {staleOwnership,staleTeam} from './words';
import {Feedback,Mark,type Note} from './feedback';
import {BackstageImport} from './BackstageImport';
import './teams.css';

// How a write failed: lost on the way, refused as stale, or refused for its value. `blocked` records that the
// record read after the refusal explained it, so a later read can show the change applies again.
type Failure={kind:'transport'|'stale'|'refused';words:string;blocked:boolean};
type Pending={key:string;target:string;operation:()=>Promise<void>;team?:{id:string;edit:TeamEdit};ownership?:{service:string;value:string};failure?:Failure};
function failureOf(error:unknown,blocked:boolean):Failure{
 const message=error instanceof Error?error.message:'';
 if(message==='Connection interrupted; no success confirmed')return {kind:'transport',words:'The connection was lost. Your change is kept.',blocked};
 if(/^(Invalid server response|Request failed|Storage or server failure)/.test(message))return {kind:'transport',words:'The save could not be confirmed. Your change is kept.',blocked};
 if(message===staleTeam||message===staleOwnership)return {kind:'stale',words:message,blocked};
 if(message==='Workspace changed. Reload and retry.')return {kind:'stale',words:'Someone else changed this team or its services. Your change is kept.',blocked};
 return {kind:'refused',words:message||'This change could not be saved. Your change is kept.',blocked};
}
function Choices({state,members,managers,onChange,note}:{state:State;members:string[];managers:string[];onChange:(members:string[],managers:string[],kind:'members'|'managers',edit:TeamEdit)=>void;note?:(kind:string)=>Note|undefined}){
 const id=useId(),[lastManager,setLastManager]=useState<string>();
 return <div className="teams-choices" role="group" aria-labelledby={id}><div><span id={id}>Members</span> <Mark note={note?.('members')}/></div>
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
 <div><label className="field"><span>Team state <Mark note={notes[key('active')]}/></span><select name="active" aria-label="Team state" value={String(team.active)} onChange={e=>write(team,{kind:'active',value:e.target.value==='true'},key('active'))}><option value="true">Active</option><option value="false">Archived</option></select></label><Feedback note={notes[key('active')]}/></div>
 </div>;
}
function Ownership({service,teams,value,note,write}:{service:State['services'][number];teams:Team[];value:string;note?:Note;write:(value:string)=>void}){
 const imported=service.ownership?.source==='backstage'&&value===service.team?service.ownership:undefined;
 return <div className="teams-ownership"><label className="field"><span>{'Owning team for '+service.name} <Mark note={note}/></span><select aria-label={'Owning team for '+service.name} value={value} onChange={e=>write(e.target.value)}><option value="">Unassigned</option>{teams.filter(t=>t.active||t.id===value).map(t=><option key={t.id} value={t.id}>{t.name}{t.active?'':' (archived)'}</option>)}</select></label>{imported&&<span className="teams-provenance">From Backstage · {imported.entity}</span>}<Feedback note={note}/></div>;
}
export function TeamsPanel({state,actor,refresh}:{state:State;actor:Member;refresh:()=>Promise<void>}){
 const [savedNotes,setNotes]=useState<Record<string,Note>>({}),[pending,setPending]=useState<Pending[]>([]),[creating,setCreating]=useState(false),[members,setMembers]=useState<string[]>([]),[managers,setManagers]=useState<string[]>([]);
 const jobs=useRef<Pending[]>([]),current=useRef(state),queue=useRef(Promise.resolve()),createRoot=useRef<HTMLDetailsElement>(null),createAttempt=useRef<string|undefined>(undefined),createDraft=useRef({members,managers});
 createDraft.current={members,managers};
 const teams=state.teams??[],admin=actor.role==='admin';
 useEffect(()=>{current.current=state;},[state]);
 const note=(key:string,value:Note)=>setNotes(old=>({...old,[key]:value}));
 const publish=()=>setPending([...jobs.current]);
 const problem=(job:Pending,record:State)=>job.team?teamEditProblem(record,job.team.id,job.team.edit):ownershipProblem(record,job.ownership!.service,job.ownership!.value);
 const held=(job:Pending,record:State)=>{const team=job.team&&record.teams?.find(t=>t.id===job.team!.id);return job.team?!!team&&teamEditHeld(team,job.team.edit):ownershipHeld(record,job.ownership!.service,job.ownership!.value);};
 // A failed change offers Retry only while the latest record lets it apply; otherwise its words and Discard.
 function outcome(job:Pending){
  const failure=job.failure!,reason=problem(job,state);
  if(reason)return {words:reason,applies:false};
  if(failure.kind!=='refused')return {words:failure.words,applies:true};
  return failure.blocked?{words:job.team?staleTeam:staleOwnership,applies:true}:{words:failure.words,applies:false};
 }
 const notes={...savedNotes};
 for(const job of pending){
  const failed=pending.filter(p=>p.key===job.key&&p.failure),views=failed.map(p=>({job:p,...outcome(p)})),blocked=views.filter(v=>!v.applies);
  notes[job.key]=!failed.length?{saving:true}:blocked.length?{error:blocked[0].words,discard:()=>discard(job.key,blocked.map(v=>v.job))}:{error:views[0].words,retry:()=>failed.forEach(p=>enqueue(p,true))};
 }
 async function readBack(){current.current=await request('/api/state');await refresh();}
 function done(job:Pending){jobs.current=jobs.current.filter(p=>p!==job);publish();note(job.key,{saved:true});}
 // Discard sends nothing: the field shows the record again.
 function discard(key:string,dropped:Pending[]){jobs.current=jobs.current.filter(p=>!dropped.includes(p));publish();setNotes(({[key]:_,...rest})=>rest);}
 // Keep each requested edit over the record, including failed edits. All writes share one revision queue.
 function enqueue(job:Pending,retry=false){
  const failure=job.failure;delete job.failure;publish();
  const execute=async()=>{
   if(!jobs.current.includes(job))return;
   try{
    if(retry){
     await readBack();
     // A retried change the record already holds was saved by its lost first answer; one it now refuses is not sent.
     if(held(job,current.current))return done(job);
     if(problem(job,current.current)){job.failure=failure;publish();return;}
    }
    await job.operation();await readBack();done(job);
   }catch(error){
    // Even a refused write can reveal another admin's changes. An offline read leaves the draft kept.
    await readBack().catch(()=>{});
    if(held(job,current.current))return done(job);
    job.failure=failureOf(error,!!problem(job,current.current));publish();
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
  }catch(error){await readBack().catch(()=>{});const failure=failureOf(error,false);note('create',{error:failure.words,...failure.kind==='refused'?{}:{retry:()=>{
   const form=createRoot.current!.querySelector('form')!;
   void create({name:new FormData(form).get('name')},id,true);
  }}});}finally{setCreating(false);}};
  queue.current=queue.current.then(execute,execute);await queue.current;return succeeded;
 }
 return <section className="panel padded teams-panel" aria-label="Teams"><h2>Teams</h2>
 {teams.map(team=><article className="service-card" key={team.id}><h3>{team.name}</h3><p>Public · {team.active?'Active':'Archived'} · {team.members.length} {team.members.length===1?'member':'members'}</p><p>Managers: {team.managers.map(id=>state.members.find(m=>m.id===id)?.name??'Unavailable member').join(', ')||'None'}</p>
 {admin&&<details><summary>Edit team</summary><TeamEditor state={state} team={shown(team)} write={write} notes={notes}/></details>}</article>)}
 {admin&&<><details ref={createRoot} onChange={()=>{if(notes.create?.saved)note('create',{});}}><summary>Create team</summary><Form busy={creating} label="Create team" onSubmit={create}><Field name="name" label="Team name"/><Choices state={state} members={members} managers={managers} onChange={(m,g)=>{setMembers(m);setManagers(g);}}/></Form><Mark note={notes.create}/><Feedback note={notes.create}/></details>
 <h3>Service ownership</h3>{state.services.map(service=><Ownership key={service.id} service={service} teams={teams} value={pending.find(p=>p.ownership?.service===service.id)?.ownership?.value??service.team??''} note={notes['ownership:'+service.id]} write={value=>keep({key:'ownership:'+service.id,target:'ownership:'+service.id,ownership:{service:service.id,value},operation:async()=>{
 const revision=current.current.revision,result=await request('/api/teams/ownership',{service:service.id,team:value||null,workspaceRevision:revision});
 if(!result||result.id!==service.id||result.team!==(value||null))throw Error('Invalid server response');
 }})}/>)}<BackstageImport refresh={refresh}/></>}
 </section>;
}
