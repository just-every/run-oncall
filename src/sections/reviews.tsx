import {useLocation} from '@tanstack/react-router';
import {ReviewsHome} from '../reviews/ReviewsHome';
import {ReviewSheet} from '../reviews/ReviewSheet';
import {useWorkspaceContext} from '../app/shell/WorkspaceContext';
export function ReviewsSection(){
 const {w,page,selectIncident,s,canEdit,command,actor}=useWorkspaceContext(),{pathname}=useLocation();
 if(page!=='reviews')return null;
 const id=pathname.split('/')[2]?decodeURIComponent(pathname.split('/')[2]):'',incident=s.incidents.find(i=>i.id===id);
 const props={state:s,draftScope:actor.id,onSaved:w.commitIncident,busy:w.busy,canEdit,command,onOpenIncident:(id:string)=>{void selectIncident(id);}};
 return <><div inert={!!id}><ReviewsHome {...props}/></div>{id&&(incident?<ReviewSheet {...props} incident={incident} key={incident.id}/>:<section className="panel padded"><h2>Review not found</h2><a href="/reviews">Back to Reviews</a></section>)}</>;
}
