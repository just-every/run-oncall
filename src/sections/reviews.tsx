import {useState} from 'react';
import type {Incident} from '../family/response-operations/domain';
import {useLocation} from '@tanstack/react-router';
import {ReviewsHome} from '../reviews/ReviewsHome';
import {ReviewSheet} from '../reviews/ReviewSheet';
import {useWorkspaceContext} from '../app/shell/WorkspaceContext';
export function ReviewsSection(){
 const [committed,setCommitted]=useState<Record<string,Incident>>({});
 const {w,page,selectIncident,s,canEdit,command}=useWorkspaceContext(),{pathname}=useLocation();
 if(page!=='reviews')return null;
 const state={...s,incidents:s.incidents.map(i=>(committed[i.id]?.revision??0)>i.revision?committed[i.id]:i)};
 const id=pathname.split('/')[2]?decodeURIComponent(pathname.split('/')[2]):'',incident=state.incidents.find(i=>i.id===id);
 const props={state,onSaved:(incident:Incident)=>setCommitted(saved=>({...saved,[incident.id]:incident})),busy:w.busy,canEdit,command,onOpenIncident:(id:string)=>{void selectIncident(id);}};
 return <><div inert={!!id}><ReviewsHome {...props}/></div>{id&&(incident?<ReviewSheet {...props} incident={incident} key={incident.id}/>:<section className="panel padded"><h2>Review not found</h2><a href="/reviews">Back to Reviews</a></section>)}</>;
}
