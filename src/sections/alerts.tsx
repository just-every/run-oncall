import {useState} from 'react';
import type {Alert} from '../family/response-operations/domain';
import {AlertsPanel} from '../app/AlertsPanel';
import {useWorkspaceContext} from '../app/shell/WorkspaceContext';
export function AlertsSection() {
  const [committed,setCommitted]=useState<Record<string,Alert>>({});
  const {w,page,selectIncident,s,canEdit,name,command,actor}=useWorkspaceContext();
  const state={...s,alerts:s.alerts.map(alert=>(committed[alert.id]?.urgencyRevision??-1)>(alert.urgencyRevision??0)?committed[alert.id]:alert)};
  return page==='alerts'?<AlertsPanel draftScope={actor.id} state={state} canEdit={canEdit} run={w.run} busy={w.busy} name={name} onSaved={alert=>setCommitted(saved=>({...saved,[alert.id]:alert}))} onOpenIncident={selectIncident} onDeclare={async data=>{
    const created=await command(data);
    if(created)await selectIncident(created.id,true);
  }}/>:null;
}
