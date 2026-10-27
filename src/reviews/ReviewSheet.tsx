import {useEffect,useRef,useState} from 'react';
import {useNavigate} from '@tanstack/react-router';
import type {Incident,State} from '../family/response-operations/domain';
import {request} from '../useWorkspace';
import {useAutosave,autosaveRequest} from '../app/autosave/useAutosave';
import {SavedState,SaveFeedback} from '../app/autosave/SavedState';
import {InlineConfirm} from '../app/autosave/InlineConfirm';
import {leaveAfterSaving} from '../app/autosave/leaveGuard';
import {Tooltip} from '../app/Tooltip';
import {FailureLine,useActionFailure} from '../app/FailureLine';
import {ReviewMaterial,type Material} from './ReviewMaterial';
import type {ReviewProps} from './ReviewsHome';
import {shortTime} from './time';
export function ReviewSheet({incident,state,canEdit,command,onOpenIncident,onSaved}:ReviewProps&{incident:Incident}) {
  const navigate=useNavigate(), sheet=useRef<HTMLDivElement>(null), failures=useActionFailure();
  const [latest,setLatest]=useState(incident),[material,setMaterial]=useState<Material|null>(null),[confirm,setConfirm]=useState(false),[accepting,setAccepting]=useState(false),[menu,setMenu]=useState(false);
  const current=latest.revision>incident.revision?latest:incident;
  const snapshot=(i:Incident)=>({values:{text:i.review,rootCause:i.rootCause??i.reviewAcceptance?.rootCause??'',impact:i.impact??i.reviewAcceptance?.impact??''},revision:i.revision});
  const save=useAutosave({snapshot:snapshot(current),read:async()=>{const state:State=await request('/api/state');return snapshot(state.incidents.find(i=>i.id===incident.id)!);},write:async change=>{
    const result:Incident=await autosaveRequest('/api/command',{type:'review',incident:incident.id,revision:change.revision,field:change.field==='text'?'review':change.field,to:change.to});setLatest(result);onSaved?.(result);return snapshot(result);
  }});
  const close=()=>{void leaveAfterSaving(()=>{void navigate({to:'/reviews',resetScroll:false} as any);});};
  async function refresh(){try{const value:Material=await request('/api/reviews/'+encodeURIComponent(incident.id)+'/material');setMaterial(value);failures.clear();}catch(error){failures.show(error,{read:true,target:null,retry:refresh});}}
  useEffect(()=>{void refresh();},[incident.id,current.revision,state.revision]);
  useEffect(()=>{
    const previous=document.activeElement as HTMLElement|null;
    const overflow=document.body.style.overflow;document.body.style.overflow='hidden';
    const frame=requestAnimationFrame(()=>(sheet.current?.querySelector<HTMLElement>('textarea')??sheet.current?.querySelector<HTMLElement>('button'))?.focus({preventScroll:true}));
    return()=>{document.body.style.overflow=overflow;cancelAnimationFrame(frame);requestAnimationFrame(()=>previous?.isConnected&&previous.focus({preventScroll:true}));};
  },[]);
  return <div className="review-sheet-layer"><div className="review-sheet-shade"/>
    <div className="review-sheet panel padded" role="dialog" aria-modal="true" aria-labelledby="review-sheet-title" ref={sheet} onKeyDown={e=>{
      if(e.key==='Escape'){e.preventDefault();if(menu)setMenu(false);else if(confirm)setConfirm(false);else close();}
      if(e.key==='Tab'){const nodes=[...sheet.current!.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],textarea:not(:disabled),input:not(:disabled),summary')].filter(n=>n.getClientRects().length);const first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}
    }}>
      <header className="review-sheet-head"><div><h2 id="review-sheet-title">{incident.title}</h2><a href={'/incidents/'+encodeURIComponent(incident.id)} onClick={e=>{e.preventDefault();void leaveAfterSaving(()=>onOpenIncident(incident.id));}}>Open incident</a></div>
        <Tooltip label="Review actions"><button aria-label="Review actions" aria-expanded={menu} onClick={()=>setMenu(!menu)}>⋯</button></Tooltip>
        <Tooltip label="Close review"><button aria-label="Close review" onClick={close}>×</button></Tooltip>
      </header>
      {menu&&<div className="review-sheet-menu"><button disabled={accepting} onClick={()=>{setMenu(false);void refresh();}}>Refresh material</button>{accepting&&<p>Wait for review acceptance to finish.</p>}</div>}
      <FailureLine failure={failures.failure}/>
      {(['text','rootCause','impact'] as const).map(field=><div key={field} className="review-edit"><label className="field"><span>{field==='text'?'Review':field==='rootCause'?'Root cause':'Impact'} <SavedState state={save.states[field]}/></span><textarea aria-label={field==='text'?'Review':field==='rootCause'?'Root cause':'Impact'} rows={field==='text'?4:3} maxLength={field==='text'?10000:3000} value={save.values[field]} disabled={!canEdit||incident.state!=='resolved'||accepting} onChange={e=>{setConfirm(false);save.change(field,e.target.value,'text');}} onBlur={()=>save.blur(field)}/></label><SaveFeedback state={save.states[field]} retry={()=>save.retry(field)} useMine={()=>save.useMine(field)}/></div>)}
      {incident.state!=='resolved'&&<p>Resolve the incident before writing its review.</p>}
      {current.reviewAcceptance&&<p className="review-meta">Accepted by {state.members.find(m=>m.id===current.reviewAcceptance!.by)?.name??'Former member'} · {shortTime(current.reviewAcceptance.at)}</p>}
      {canEdit&&incident.state==='resolved'&&<button disabled={accepting||!Object.values(save.values).every(v=>v.trim())} onClick={async()=>{if(await save.flush())setConfirm(true);}}>Accept review</button>}
      {confirm&&<InlineConfirm action="Accept this review" keep="Keep writing" busy={accepting} onCancel={()=>setConfirm(false)} onConfirm={async()=>{
        if(!await save.flush())return;setAccepting(true);failures.clear();
        try{const retained:Material=await request('/api/reviews/'+encodeURIComponent(incident.id)+'/material');const result:Incident=await autosaveRequest('/api/command',{type:'review',incident:incident.id,revision:retained.incidentRevision,...save.values,accept:true,materialRevision:retained.incidentRevision,materialWorkspaceRevision:retained.workspaceRevision});setLatest(result);onSaved?.(result);setConfirm(false);await refresh();}catch(error){failures.show(error);}finally{setAccepting(false);}
      }}>Accept the Review, Root cause and Impact on screen now as your human assessment?</InlineConfirm>}
      {material&&<ReviewMaterial material={material}/>}
      <p><a href={'/incidents/'+encodeURIComponent(incident.id)}>Add a follow-up on this incident</a></p>
    </div>
  </div>;
}
