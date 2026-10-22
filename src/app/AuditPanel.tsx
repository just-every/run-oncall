import { useState } from 'react';
import { useRecordPage } from '../useRecordPage';
import { RecordPager } from './RecordPager';

export function AuditPanel({ revision }: { revision: number }) {
  const [open, setOpen] = useState(false);
  const pager = useRecordPage('audit', revision, {}, open);
  return <details className="panel padded" open={open} onToggle={event => setOpen(event.currentTarget.open)}>
    <summary>Configuration audit{pager.data ? ` (${pager.data.total})` : ''}</summary>
    {open && <>
      <RecordPager pager={pager} label="configuration audit records" />
      {pager.data?.total === 0 && <p>No configuration audit records.</p>}
      {pager.data?.items.map(entry => <p key={entry.id}>{new Date(entry.at).toLocaleString()} · {entry.kind} · {entry.text}</p>)}
    </>}
  </details>;
}
