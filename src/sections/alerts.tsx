import {useEffect, useEffectEvent, useState} from 'react';
import type {Alert} from '../family/response-operations/domain';
import {AlertsPanel} from '../app/AlertsPanel';
import {useWorkspaceContext} from '../app/shell/WorkspaceContext';
export function AlertsSection() {
  const [committed,setCommitted]=useState<Record<string,Alert>>({});
  const {page}=useWorkspaceContext();
  return page==='alerts' ? <CurrentAlerts committed={committed} onSaved={alert=>setCommitted(saved=>({...saved,[alert.id]:alert}))}/> : null;
}

function CurrentAlerts({committed,onSaved}: {committed:Record<string,Alert>; onSaved:(alert:Alert)=>void}) {
  const {w,selectIncident,s,canEdit,name,command,actor}=useWorkspaceContext();
  const [status,setStatus]=useState<'loading'|'loaded'|'failed'>('loading');
  const refresh=useEffectEvent(w.refreshAfterPendingRead);
  useEffect(() => {
    if (status!=='loading') return;
    let active=true;
    void refresh().then(
      () => {if (active) setStatus('loaded');},
      () => {if (active) setStatus('failed');},
    );
    return () => {active=false;};
  },[status]);
  if (status==='loading') return <p className="alerts-read-pending" role="status">Loading alerts…</p>;
  if (status==='failed') return <div className="panel padded alerts-read-pending"><p role="alert">Alerts could not be loaded.</p><button onClick={()=>setStatus('loading')}>Retry</button></div>;

  const state={...s,alerts:s.alerts.map(alert=>(committed[alert.id]?.urgencyRevision??-1)>(alert.urgencyRevision??0)?committed[alert.id]:alert)};
  return <AlertsPanel draftScope={actor.id} state={state} onCall={w.onCall} canEdit={canEdit} run={w.run} busy={w.busy} name={name} onSaved={onSaved} onOpenIncident={selectIncident} onDeclare={async data=>{
    const created=await command(data);
    if(created)await selectIncident(created.id,true);
  }}/>;
}
