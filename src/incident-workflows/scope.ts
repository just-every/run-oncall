import type { Incident, State } from '../family/response-operations/domain.ts';

/** A merged or split record never widens a service-account's original service grant. */
export function incidentWithinServices(state:State,incident:Incident,services:string[]):boolean {
 const seen=new Set<string>();
 const visit=(row:Incident):boolean=>{
  if(seen.has(row.id))return true;seen.add(row.id);
  if(!services.includes(row.service)||row.alerts.some(id=>{const alert=state.alerts.find(a=>a.id===id);return alert?.service!==null&&alert?.service!==undefined&&!services.includes(alert.service);} ))return false;
  const related=[...(row.mergedSources??[]),...(row.splitFrom?[row.splitFrom.incident]:[])];
  return related.every(id=>{const source=state.incidents.find(i=>i.id===id);return !!source&&visit(source);});
 };
 return visit(incident);
}
