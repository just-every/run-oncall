import {shortTime} from '../reviews/time';
import {failureMessage} from '../app/FailureLine';
import {useViewAnchor} from '../app/useViewAnchor';
import { useEffect, useState } from 'react';
import { request } from '../useWorkspace';
import './changes.css';
import {changeProviderNames, type ChangeProvider} from './model';

export function RecentChanges({service, at, revision, expanded=false, windowChoices=false}: {service:string; at?:string; revision:number; expanded?:boolean; windowChoices?:boolean}) {
  const preserveView=useViewAnchor();
  const [open,setOpen]=useState(expanded),[hours,setHours]=useState(24),[loaded,setLoaded]=useState<{query:string;value:any}|null>(null),[error,setError]=useState('');
  const query=new URLSearchParams({service,hours:String(hours),...(at?{at}:{})}).toString();
  const data=loaded?.query===query?loaded.value:null;
  useEffect(()=>{if(!open)return;let live=true;request('/api/changes/recent?'+query).then(v=>{if(live){preserveView();setError('');setLoaded({query,value:v})}}).catch(e=>{if(live)setError(failureMessage(e,true))});return()=>{live=false};},[query,revision,open]);
  return <details className="recent-changes" open={open} onToggle={e=>setOpen(e.currentTarget.open)}><summary>Recent changes</summary>
    <label className="field">{windowChoices ? <>Window<select aria-label="Recent changes window" value={hours} onChange={event => setHours(Number(event.target.value))}>{[[1,"1 h"],[6,"6 h"],[24,"24 h"],[72,"3 days"]].map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></> : <>Lookback hours<input type="number" min={1} max={168} value={hours} onChange={e=>{const value=Number(e.target.value);if(Number.isInteger(value)&&value>=1&&value<=168)setHours(value)}} /></>}</label>
    {error&&<p role="alert">{error}</p>}
    {data&&<><p className="muted">{shortTime(data.from)} – {shortTime(data.to)} · this service and its direct dependencies. Changes never page.</p>
      {!data.items.length&&<p>No changes in this window.</p>}
      <ol className="change-list">{data.items.map((change:any)=><li key={change.id}><div className="tags"><span className="tag">{changeProviderNames[change.provider as ChangeProvider]}</span><span className="tag">{change.kind}</span>{change.dependency&&<span className="tag">Dependency · {change.serviceName}</span>}{change.truncated&&<span className="tag">Truncated context</span>}</div><strong>{change.summary}</strong><p><time dateTime={change.occurredAt}>{shortTime(change.occurredAt)}</time> · reported by {change.author}{change.timeBasis==='received'&&' · received time; source time not provided'}</p>
        {change.links.map((url:string,n:number)=><a key={url} href={url} target="_blank" rel="noreferrer">Source {n+1} ↗</a>)}
        {!!Object.keys(change.details).length&&<details><summary>Retained context</summary><dl>{Object.entries(change.details).map(([key,value])=><div key={key}><dt>{key}</dt><dd>{String(value)}</dd></div>)}</dl></details>}
      </li>)}</ol></>}
  </details>;
}
