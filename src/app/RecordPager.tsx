type Pager = {
  data: { items: unknown[]; total: number; nextCursor: string | null } | null;
  loading: boolean;
  error: string;
  enabled: boolean;
  page: number;
  hasPrevious: boolean;
  previous: () => void;
  next: () => void;
  refresh: () => void;
};

export function RecordPager({ pager, label }: { pager: Pager; label: string }) {
  if (!pager.enabled) return null;
  const start = (pager.page - 1) * 25 + 1;
  return <div className="record-pager" aria-label={`${label} pagination`}>
    <p role="status" aria-live="polite">{pager.loading ? `Loading ${label}…` : pager.data ? pager.data.total ? `${label}: ${start}–${start + pager.data.items.length - 1} of ${pager.data.total}, newest first.` : `0 ${label}.` : ''}</p>
    {pager.error && <p role="alert">Could not load {label}: {pager.error}</p>}
    <div className="intake-actions" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
      <button type="button" disabled={pager.loading || !pager.hasPrevious} onClick={pager.previous} aria-label={`Previous ${label} page`}>Previous</button>
      <button type="button" disabled={pager.loading || !pager.data?.nextCursor} onClick={pager.next} aria-label={`Next ${label} page`}>Next</button>
      <button type="button" disabled={pager.loading} onClick={pager.refresh} aria-label={`Refresh ${label}`}>Refresh</button>
    </div>
  </div>;
}
