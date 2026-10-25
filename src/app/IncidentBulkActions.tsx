import { useRef, useState } from 'react';
import { request } from '../useWorkspace';
import { Field, Form } from '../forms';
import type { Member } from '../family/response-operations/domain';
import type { BulkResult } from '../family/response-operations/triage';

export function IncidentBulkActions({items, allMatching, count, query, workspaceRevision, members, incidents, busy, canEdit, run, clear}: {items: {id: string; revision: number;kind?:string}[]; allMatching: boolean; count: number; query: unknown; workspaceRevision: number; members: Member[]; incidents:{id:string;title:string;revision:number}[]; busy: boolean; canEdit: boolean; run: (path: string | (() => Promise<any>), data?: any, message?: any) => Promise<any>; clear: () => void}) {
  const pending = useRef<{key: string; operationId: string;payload:any} | null>(null);
  const [preview,setPreview]=useState<{comparison:{position:number;alert:string;step:string;ok:boolean;error?:string;templateVersion?:number|null;member?:string}[]}|null>(null);
  const [durable,setDurable]=useState(false);
  const [action, setAction] = useState('acknowledge');
  const [result, setResult] = useState<{operationId: string; results: BulkResult[]; remaining?: number} | null>(null);
  return <section className="triage-bulk" aria-label="Bulk incident actions">
    <strong>{items.length} selected{allMatching ? ' · all matching' : ''}</strong> <button className="quiet" disabled={busy} onClick={clear}>Clear selection</button>
    <label>Bulk action<select aria-label="Bulk action" disabled={busy || !canEdit} value={action} onChange={e => setAction(e.target.value)}><option value="acknowledge">Acknowledge</option><option value="reassign">Reassign</option>{items.every(item=>item.kind==='alert')&&!allMatching&&<option value="orchestrate">Declare incidents and record notifications</option>}<option value="set-priority">Set priority</option><option value="set-urgency">Set urgency</option><option value="snooze">Snooze</option><option value="merge">Merge into incident</option><option value="resolve">Resolve / close alert-only items</option></select></label>
    <Form busy={busy} disabled={!canEdit} label={`Apply to ${items.length} ${items.every(i=>i.kind==='alert')?'alert-only items':'incidents'}`} onSubmit={async data => {
      const target=incidents.find(i=>i.id===data.target);
      const payload = {...data, action, items,...((action==='orchestrate'||durable&&action==='reassign')&&items.every(i=>i.kind==='alert')?{durable:true}:{}), allMatching, query, workspaceRevision, confirmedCount: count,...(action==='snooze'?{minutes:Number(data.minutes)}:{}),...(action==='merge'?{targetRevision:target?.revision}:{})};
      const key = JSON.stringify({...payload,targetRevision:undefined});
      if (pending.current?.key !== key) pending.current = {key, operationId: crypto.randomUUID(),payload};
      const operationId = pending.current!.operationId;
      const response = await run(async () => {
        let current;
        do {
          current = await request('/api/triage/bulk', {...pending.current!.payload, operationId});
          setResult(current);
        } while (current.remaining > 0 && !current.interrupted && !pending.current!.payload.durable);
        return current;
      }, undefined, (v: any) => `${v.results.filter((r: BulkResult) => r.ok).length} ${action==='orchestrate'?'steps recorded':'changed'}; ${v.results.filter((r: BulkResult) => !r.ok).length} refused${v.remaining ? `; ${v.remaining} pending — submit the same action to resume` : ''}`);
      if (response) setResult(response);
      return response?.remaining ? null : response;
    }}>
      {['reassign','orchestrate'].includes(action) && <Field name="member" label={action==='orchestrate'?'Recorded notification responder':'Bulk assignee'} required={action==='orchestrate'}><option value="">{action==='orchestrate'?'Choose responder':'Unassigned'}</option>{members.filter(m => m.active && ["admin", "responder"].includes(m.role)).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</Field>}
      {action==='snooze'&&<Field name="minutes" label="Snooze minutes" type="number" value="15"/>}
      {action==='merge'&&<Field name="target" label="Merge target">{incidents.filter(i=>!items.some(item=>item.id===i.id)).map(i=><option key={i.id} value={i.id}>{i.title}</option>)}</Field>}
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
    {result && <div role="status"><p>Operation {result.operationId}{result.remaining ? ` · ${result.results.length} processed · ${result.remaining} pending` : ""}</p><ul>{result.results.map(r => <li key={r.id}>{r.step??r.id.slice(0, 8)}: {r.ok ? `saved · revision ${r.revision}` : r.error}</li>)}</ul></div>}
  </section>;
}
