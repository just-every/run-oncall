import { useEffect, useState } from 'react';
import { request } from '../useWorkspace';
import './changes.css';

export function RecentChanges({service, at, revision, expanded=false}: {service:string; at?:string; revision:number; expanded?:boolean}) {
  const [open,setOpen]=useState(expanded),[hours,setHours]=useState(24),[data,setData]=useState<any>(null),[error,setError]=useState('');
  useEffect(()=>{if(!open)return;let live=true;setError('');setData(null);request('/api/changes/recent?'+new URLSearchParams({service,hours:String(hours),...(at?{at}:{})})).then(v=>{if(live)setData(v)}).catch(e=>{if(live)setError(e.message)});return()=>{live=false};},[service,at,hours,revision,open]);
  return <details className="recent-changes" open={open} onToggle={e=>setOpen(e.currentTarget.open)}><summary>Recent changes</summary>
    <label>Lookback hours<input type="number" min={1} max={168} value={hours} onChange={e=>{const value=Number(e.target.value);if(Number.isInteger(value)&&value>=1&&value<=168)setHours(value)}} /></label>
    {error&&<p role="alert">{error}</p>}
    {data&&<><p className="muted">{new Date(data.from).toLocaleString()} – {new Date(data.to).toLocaleString()} · this service and its direct dependencies. Changes never page.</p>
      {!data.items.length&&<p>No changes in this window.</p>}
      <ol className="change-list">{data.items.map((change:any)=><li key={change.id}><div className="tags"><span className="tag">{change.kind}</span>{change.dependency&&<span className="tag">Dependency · {change.serviceName}</span>}{change.truncated&&<span className="tag">Truncated context</span>}</div><strong>{change.summary}</strong><p><time>{new Date(change.occurredAt).toLocaleString()}</time> · reported by {change.author}{change.timeBasis==='received'&&' · received time; source time not provided'}</p>
        {change.links.map((url:string,n:number)=><a key={url} href={url} target="_blank" rel="noreferrer">Source {n+1} ↗</a>)}
        {!!Object.keys(change.details).length&&<details><summary>Retained context</summary><dl>{Object.entries(change.details).map(([key,value])=><div key={key}><dt>{key}</dt><dd>{String(value)}</dd></div>)}</dl></details>}
      </li>)}</ol></>}
  </details>;
}
