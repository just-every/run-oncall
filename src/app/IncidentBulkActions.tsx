import { useRef, useState } from 'react';
import { request } from '../useWorkspace';
import { Field, Form } from '../forms';
import type { Member } from '../family/response-operations/domain';
import type { BulkResult } from '../family/response-operations/triage';

export function IncidentBulkActions({items, allMatching, count, query, workspaceRevision, members, busy, canEdit, run, clear}: {items: {id: string; revision: number}[]; allMatching: boolean; count: number; query: unknown; workspaceRevision: number; members: Member[]; busy: boolean; canEdit: boolean; run: (path: string | (() => Promise<any>), data?: any, message?: any) => Promise<any>; clear: () => void}) {
  const pending = useRef<{key: string; operationId: string} | null>(null);
  const [action, setAction] = useState('acknowledge');
  const [result, setResult] = useState<{operationId: string; results: BulkResult[]; remaining?: number} | null>(null);
  return <section className="triage-bulk" aria-label="Bulk incident actions">
    <strong>{items.length} selected{allMatching ? ' · all matching' : ''}</strong> <button className="quiet" disabled={busy} onClick={clear}>Clear selection</button>
    <label>Bulk action<select aria-label="Bulk action" disabled={busy || !canEdit} value={action} onChange={e => setAction(e.target.value)}><option value="acknowledge">Acknowledge</option><option value="reassign">Reassign</option><option value="set-priority">Set priority</option><option value="set-urgency">Set urgency</option><option value="resolve">Resolve with evidence</option></select></label>
    <Form busy={busy} disabled={!canEdit} label={`Apply to ${items.length} incidents`} onSubmit={async data => {
      const payload = {...data, action, items, allMatching, query, workspaceRevision, confirmedCount: count};
      const key = JSON.stringify(payload);
      if (pending.current?.key !== key) pending.current = {key, operationId: crypto.randomUUID()};
      const operationId = pending.current!.operationId;
      const response = await run(async () => {
        let current;
        do {
          current = await request('/api/triage/bulk', {...payload, operationId});
          setResult(current);
        } while (current.remaining > 0 && !current.interrupted);
        return current;
      }, undefined, (v: any) => `${v.results.filter((r: BulkResult) => r.ok).length} changed; ${v.results.filter((r: BulkResult) => !r.ok).length} refused${v.remaining ? `; ${v.remaining} pending — submit the same action to resume` : ''}`);
      if (response) setResult(response);
      return response?.remaining ? null : response;
    }}>
      {action === 'reassign' && <Field name="member" label="Bulk assignee" required={false}><option value="">Unassigned</option>{members.filter(m => m.active && m.role !== 'viewer').map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</Field>}
      {action === 'set-priority' && <Field name="priority" label="Bulk priority">{['P1', 'P2', 'P3', 'P4', 'P5'].map(p => <option key={p}>{p}</option>)}</Field>}
      {action === 'set-urgency' && <Field name="urgency" label="Bulk urgency"><option>high</option><option>low</option></Field>}
      <Field name="reason" label={action === 'resolve' ? 'Resolution summary for every incident' : 'Bulk action reason'} type="textarea" />
      {action === 'resolve' && <Field name="evidence" label="Recovery evidence for every incident" type="url" />}
    </Form>
    {result && <div role="status"><p>Operation {result.operationId}{result.remaining ? ` · ${items.length - result.remaining} processed · ${result.remaining} pending` : ""}</p><ul>{result.results.map(r => <li key={r.id}>{r.id.slice(0, 8)}: {r.ok ? `saved · revision ${r.revision}` : r.error}</li>)}</ul></div>}
  </section>;
}
