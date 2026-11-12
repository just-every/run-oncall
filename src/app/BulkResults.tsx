import { useState } from 'react';
import type { BulkResult } from '../family/response-operations/triage';

export type BulkSelection = {id: string; revision: number; kind?: string; title: string; context: string};
export type BulkResponse = {operationId: string; results: BulkResult[]; remaining?: number};
export type BulkDisplay = BulkResponse & {items: BulkSelection[]; action: string};

function selectedItem(result: BulkResult, items: BulkSelection[]) {
  // Workflow result identities describe ordered steps, rather than incidents.
  const step = result.kind === 'workflow' && /^step:(\d+):/.exec(result.id);
  return step ? items[Number(step[1])] : items.find(item => item.id === result.id);
}

function skipped(result: BulkResult, items: BulkSelection[]) {
  return result.ok
    ? !result.step && result.revision === selectedItem(result, items)?.revision
    : ['Cannot acknowledge an incident in acknowledged state', 'Incident is already resolved', 'Alert-only item is already closed', 'No assignment change needed', 'No priority change needed', 'No urgency change needed'].includes(result.error ?? '');
}

export function bulkCounts(result: BulkResponse, items: BulkSelection[]) {
  const skip = result.results.filter(row => skipped(row, items)).length;
  const refused = result.results.filter(row => !row.ok && !skipped(row, items)).length;
  return {succeeded: result.results.length - skip - refused, skipped: skip, refused};
}

function outcome(row: BulkResult, result: BulkDisplay) {
  const action = row.step ?? result.action;
  if (skipped(row, result.items)) {
    if (action === 'reassign') return 'Skipped — no assignment change needed.';
    const state = row.error === 'Alert-only item is already closed' ? 'closed' : action === 'acknowledge' ? 'acknowledged' : action === 'resolve' ? 'resolved' : action === 'set-priority' ? 'at this priority' : action === 'set-urgency' ? 'at this urgency' : 'in that state';
    return `Skipped — already ${state}.`;
  }
  if (row.ok) {
    const done: Record<string, string> = {acknowledge: 'acknowledged', resolve: row.kind === 'alert' ? 'closed' : 'resolved', reassign: 'reassigned', 'set-priority': 'priority updated', 'set-urgency': 'urgency updated', snooze: 'snoozed', merge: 'merged into the chosen incident', declare: 'incident declared', notify: 'responder obligation recorded; no notification sent'};
    return `Done — ${done[action] ?? 'action completed'}.`;
  }
  // Diagnostic identities belong in the copied receipt, even in error text.
  const reason = (row.error ?? 'The action could not be completed.').replace(/\b[0-9a-f]{8}-[0-9a-f-]{27,}\b/gi, 'item');
  let next = 'Review the incident and the action details, then try again.';
  if (/changed|revision|stale|replaced/i.test(reason)) next = 'Reload the list, review the latest changes, then select the incident again.';
  else if (/role|permission|authori/i.test(reason)) next = 'Ask an administrator for responder access.';
  else if (/unknown|not found/i.test(reason)) next = 'Refresh the list and select an available item.';
  else if (/requires acknowledgment/i.test(reason)) next = 'Acknowledge the incident before snoozing it.';
  else if (/evidence/i.test(reason)) next = 'Add a recovery evidence link, then try again.';
  else if (/reason|summary/i.test(reason)) next = 'Enter a reason or resolution summary, then try again.';
  else if (/unconfirmed|storage/i.test(reason)) next = 'Submit the same action to inspect committed results before trying a new action.';
  return `Refused — ${reason} ${next}`;
}

export function BulkResults({result}: {result: BulkDisplay}) {
  const [copyStatus, setCopyStatus] = useState('');
  const counts = bulkCounts(result, result.items);
  return <div className="bulk-results">
    <div className="bulk-results-heading">
      <p role="status">{counts.succeeded} succeeded · {counts.skipped} skipped · {counts.refused} refused{result.remaining ? ` · ${result.remaining} pending` : ''}</p>
      <button type="button" className="quiet" onClick={async () => {
        try {
          await navigator.clipboard.writeText(JSON.stringify({...result, results: result.results.map(row => ({...row, title: selectedItem(row, result.items)?.title, outcome: outcome(row, result)}))}, null, 2));
          setCopyStatus('Details copied');
        } catch { setCopyStatus('Could not copy details. Allow clipboard access and try again.'); }
      }}>Copy details</button>
    </div>
    {copyStatus && <p role="status">{copyStatus}</p>}
    <ul tabIndex={0} aria-label="Bulk operation results" className="bulk-result-list">{result.results.map(row => {
      const item = selectedItem(row, result.items);
      return <li key={row.id} data-bulk-outcome={skipped(row, result.items) ? 'skipped' : row.ok ? 'succeeded' : 'refused'}>
        <strong>{item?.title ?? 'Item unavailable'}</strong>
        {item?.context && <span className="bulk-result-context">{item.context}</span>}
        <span>{outcome(row, result)}</span>
      </li>;
    })}</ul>
  </div>;
}
