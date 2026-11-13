import { useId, useRef, useState } from 'react';
import { request } from '../useWorkspace';
import { Field, Form } from '../forms';
import type { Member } from '../family/response-operations/domain';
import { BulkResults, bulkCounts, type BulkDisplay, type BulkResponse, type BulkSelection } from './BulkResults';

export function IncidentBulkActions({items, allMatching, count, total, refreshing, selectPage, selectMatching, query, workspaceRevision, members, incidents, busy, canEdit, run, clear, committed}: {items: BulkSelection[]; allMatching: boolean; count: number; total: number; refreshing: boolean; selectPage: () => void; selectMatching: () => void; query: unknown; workspaceRevision: number; members: Member[]; incidents:{id:string;title:string;revision:number}[]; busy: boolean; canEdit: boolean; run: (path: string | (() => Promise<any>), data?: any, message?: any) => Promise<any>; clear: () => void; committed: (result: BulkDisplay) => void}) {
  const pending = useRef<{key: string; operationId: string;payload:any; items: BulkSelection[]; action: string} | null>(null);
  const [preview,setPreview]=useState<{comparison:{position:number;alert:string;step:string;ok:boolean;error?:string;templateVersion?:number|null;member?:string}[]}|null>(null);
  const [durable,setDurable]=useState(false);
  const [action, setAction] = useState('acknowledge');
  const [mergeTarget, setMergeTarget] = useState('');
  const mergeHelp = useId();
  const sources = action === 'merge' ? items.filter(item => item.id !== mergeTarget) : items;
  const targets = incidents.filter(incident => items.length > 1 && items.length <= 501 || !items.some(item => item.id === incident.id));
  const [result, setResult] = useState<BulkDisplay | null>(null);
  return <section className="triage-bulk" aria-label="Bulk incident actions">
    <div className="triage-selection"><strong>{items.length} selected{allMatching ? ' · all matching' : ''}</strong>
      <button className="quiet" disabled={busy || refreshing} onClick={selectPage}>Select this page</button>
      {total <= 1000 && !allMatching && <button className="quiet" disabled={busy || refreshing} onClick={selectMatching}>Select all {total} matching</button>}
      <button className="quiet" disabled={busy} onClick={clear}>Clear selection</button></div>
    <label>Bulk action<select aria-label="Bulk action" disabled={busy || !canEdit} value={action} onChange={e => setAction(e.target.value)}><option value="acknowledge">Acknowledge</option><option value="reassign">Reassign</option>{items.every(item=>item.kind==='alert')&&!allMatching&&<option value="orchestrate">Declare incidents and record notifications</option>}<option value="set-priority">Set priority</option><option value="set-urgency">Set urgency</option><option value="snooze">Snooze</option><option value="merge">Merge into incident</option><option value="resolve">Resolve / close alert-only items</option></select></label>
    <Form busy={busy} disabled={!canEdit || !sources.length} label={`Apply to ${sources.length} ${items.every(i=>i.kind==='alert')?'alert-only items':'incidents'}`} onSubmit={async data => {
      const target=incidents.find(i=>i.id===data.target);
      const selectedTarget = action === 'merge' && items.find(item => item.id === data.target);
      const payload = {...data, action, items: sources.map(({id, revision, kind}) => ({id, revision, kind})),...((action==='orchestrate'||durable&&action==='reassign')&&items.every(i=>i.kind==='alert')?{durable:true}:{}), allMatching: selectedTarget ? false : allMatching, query, workspaceRevision, confirmedCount: sources.length,...(action==='snooze'?{minutes:Number(data.minutes)}:{}),...(action==='merge'?{targetRevision:selectedTarget ? selectedTarget.revision : target?.revision}:{})};
      const key = JSON.stringify({...payload,targetRevision:undefined});
      if (pending.current?.key !== key) pending.current = {key, operationId: crypto.randomUUID(),payload, items: [...sources], action};
      const operation = pending.current!;
      const {operationId} = operation;
      setResult(null);
      const response = await run(async () => {
        let current: BulkResponse & {remaining: number; interrupted?: boolean};
        do {
          current = await request('/api/triage/bulk', {...operation.payload, operationId});
          const display = {...current, items: operation.items, action: operation.action};
          setResult(display);
          committed(display);
          // Keep retries on the reserved operation even as its own receipts
          // advance the visible selection; continuations use the original body.
          const retained = operation.items.map(item => {
            const saved = current.results.find((row: any) => row.id === item.id && row.ok && !row.step);
            return {id: item.id, revision: saved?.revision ?? item.revision, kind: item.kind};
          });
          operation.key = JSON.stringify({...operation.payload, items: retained, allMatching: false, targetRevision: undefined});
        } while (current.remaining > 0 && !current.interrupted && !operation.payload.durable);
        return current;
      }, undefined, (v: any) => {
        const counts = bulkCounts(v, operation.items);
        return `${counts.succeeded} ${operation.action==='orchestrate'?'steps recorded':'changed'}; ${counts.skipped ? `${counts.skipped} skipped; ` : ''}${counts.refused} refused${v.remaining ? `; ${v.remaining} pending — submit the same action to resume` : ''}`;
      });
      if (response) setResult({...response, items: operation.items, action: operation.action});
      return response?.remaining ? null : response;
    }}>
      {['reassign','orchestrate'].includes(action) && <Field name="member" label={action==='orchestrate'?'Recorded notification responder':'Bulk assignee'} required={action==='orchestrate'}><option value="">{action==='orchestrate'?'Choose responder':'Unassigned'}</option>{members.filter(m => m.active && ["admin", "responder"].includes(m.role)).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</Field>}
      {action==='snooze'&&<Field name="minutes" label="Snooze minutes" type="number" value="15"/>}
      {action === 'merge' && <>
        <label className="field"><span id={mergeHelp + '-label'}>Merge target</span><select name="target" required value={mergeTarget} aria-labelledby={mergeHelp + '-label'} aria-describedby={mergeHelp} onChange={event => setMergeTarget(event.target.value)}>
          <option value="">Choose incident to keep</option>
          {targets.map(incident => <option key={incident.id} value={incident.id}>{incident.title}</option>)}
        </select></label>
        <p id={mergeHelp}>{targets.length ? items.length > 501 ? 'Choose an unselected incident to keep, or narrow the selection to at most 500 source incidents to keep a selected target.' : 'Choose the incident to keep. If it is selected, only the other selected incidents will merge into it.' : 'Select another incident, or clear one selection to make it the merge target.'}</p>
      </>}
      {action === 'set-priority' && <Field name="priority" label="Bulk priority">{['P1', 'P2', 'P3', 'P4', 'P5'].map(p => <option key={p}>{p}</option>)}</Field>}
      {action === 'set-urgency' && <Field name="urgency" label="Bulk urgency"><option>high</option><option>low</option></Field>}
      {action==='reassign'&&items.every(i=>i.kind==='alert')&&<label><input type="checkbox" checked={durable} onChange={e=>setDurable(e.target.checked)}/>Save reassignment as a resumable workflow</label>}
      {action==='orchestrate'&&<><p>Up to 25 selected alerts. Each declares an incident, then records a responder obligation. Paging is OFF; no sender runs.</p><button type="button" disabled={busy||!canEdit} onClick={async event=>{
        const form=event.currentTarget.closest('form');if(!form?.reportValidity())return;
        const input=Object.fromEntries(new FormData(form));
        await run(async()=>{const value=await request('/api/triage/workflows/preview',{...input,items,confirmedCount:count});setPreview(value);return value;},undefined,'Workflow comparison ready; no effects were written');
      }}>Compare workflow steps</button></>}
      <Field name="reason" label={action === 'resolve' ? 'Resolution summary for declared incidents' : 'Bulk action reason'} type="textarea" required={action!=='resolve'||items.some(i=>i.kind!=='alert')} />
      {action === 'resolve' && items.some(i=>i.kind!=='alert') && <Field name="evidence" label="Recovery evidence for every incident" type="url" />}
    </Form>
    {action==='orchestrate'&&preview&&<div role="status"><p>Ordered comparison · no effects</p><ol>{preview.comparison.map(step=><li key={step.position}>{step.step==='declare'?'Declare incident':'Record responder obligation'} · alert {step.alert.slice(0,8)} · {step.ok?'would record':step.error}{step.ok&&step.step==='declare'&&(step.templateVersion===null?' · no service template':` · template v${step.templateVersion}`)}{step.ok&&step.step==='notify'&&` · ${members.find(member=>member.id===step.member)?.name??'Responder unavailable'} · no sender`}</li>)}</ol></div>}
    {result && <BulkResults key={result.operationId} result={result} />}
  </section>;
}
