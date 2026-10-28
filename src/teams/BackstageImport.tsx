import {useState} from 'react';
import {HttpFailure,InterruptedTransport,request} from '../useWorkspace';
import type {State} from '../family/response-operations/domain';
import {applies,catalogFrom,landed,type Choices,type ImportRow} from './backstage';
import {importChanged} from './words';
import {Feedback,Mark,type Note} from './feedback';

type Preview={rows:ImportRow[];digest:string};
// A failure on the way (Retry can work) as opposed to an answer that refuses the import.
function lost(error:unknown){
 return error instanceof InterruptedTransport||error instanceof HttpFailure&&(error.status>=500||!error.human)?'The import could not be confirmed. It is kept.':null;
}
// What applying a row does, in the fewest words.
function meta(row:ImportRow){
 if(row.action==='unmatched')return row.reason;
 if(row.action==='unchanged')return row.team!.name+' · No change';
 return (row.current?.name??'Unassigned')+' → '+row.team!.name;
}
export function BackstageImport({refresh}:{refresh:()=>Promise<void>}){
 const [text,setText]=useState(''),[preview,setPreview]=useState<Preview|null>(null),[choices,setChoices]=useState<Choices>({}),[busy,setBusy]=useState(false),[previewNote,setPreviewNote]=useState<Note>(),[applyNote,setApplyNote]=useState<Note>();
 // Choices are kept for rows still in conflict, including across "Preview again".
 const chosen:Choices=Object.fromEntries(Object.entries(choices).filter(([id])=>preview?.rows.some(r=>r.action==='conflict'&&r.service?.id===id)));
 const applying=preview?.rows.filter(r=>applies(r,chosen))??[];
 async function previewImport(){
  setBusy(true);setApplyNote(undefined);
  try{setPreview(await request('/api/teams/backstage/preview',{catalog:catalogFrom(text)}));setPreviewNote(undefined);}
  catch(error){
   const transport=lost(error);
   setPreviewNote(transport?{error:transport,retry:()=>void previewImport()}:{error:(error as Error).message,discard:()=>{setText('');setPreview(null);setPreviewNote(undefined);}});
  }finally{setBusy(false);}
 }
 async function applyImport(retry=false){
  if(!preview)return;
  const sent={catalog:catalogFrom(text),digest:preview.digest,choices:chosen},rows=applying;
  setBusy(true);setApplyNote({saving:true});
  try{
   // A retried import whose first answer was lost but which already landed is saved without a second write.
   const latest:State|null=retry?await request('/api/state'):null;
   if(!latest||!rows.every(row=>landed(latest,row)))await request('/api/teams/backstage/apply',sent);
   await refresh();setPreview(null);setChoices({});setApplyNote({saved:true});
  }catch(error){
   const transport=lost(error),message=error instanceof Error?error.message:'';
   setApplyNote(transport?{error:transport,retry:()=>void applyImport(true)}:error instanceof HttpFailure&&error.status===409&&message===importChanged?{error:message,again:()=>void previewImport()}:{error:message,discard:()=>{setPreview(null);setApplyNote(undefined);}});
  }finally{setBusy(false);}
 }
 return <details className="teams-import"><summary>Import from Backstage</summary><div className="teams-import-form">
  <label className="field"><span>Backstage catalog</span><textarea name="catalog" spellCheck={false} value={text} onChange={e=>setText(e.target.value)}/></label>
  <label className="field"><span>Catalog file</span><input type="file" accept=".json,application/json" onChange={async e=>{const file=e.target.files?.[0];if(file)setText(await file.text());}}/></label>
  <div><button type="button" disabled={busy} onClick={()=>void previewImport()}>Preview import</button><Feedback note={previewNote}/></div>
  {preview&&<ul className="teams-import-rows">{preview.rows.map((row,i)=><li key={i}>
   <span className="teams-import-name">{row.service?.name??row.entity.replace(/^component:[^/]*\//,'')}</span><span className="teams-import-meta">{meta(row)}</span>
   {row.action==='conflict'&&<span className="field"><select aria-label={'Import choice for '+row.service!.name} value={chosen[row.service!.id]??'current'} onChange={e=>setChoices(old=>({...old,[row.service!.id]:e.target.value as Choices[string]}))}><option value="current">Keep current</option><option value="backstage">Use Backstage</option></select></span>}
  </li>)}</ul>}
  <div><div className="teams-import-apply"><button type="button" disabled={busy||!applying.length} onClick={()=>void applyImport()}>Apply import</button><Mark note={applyNote}/></div><Feedback note={applyNote}/></div>
 </div></details>;
}
