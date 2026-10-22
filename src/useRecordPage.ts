import { useEffect, useState } from 'react';
import type { Alert, Entry, Event } from './family/response-operations/domain';
import type { IntakeReceipt } from './intake/model';

type Collections = { alerts: Alert; events: Event; intakeReceipts: IntakeReceipt; audit: Entry };
export type RecordFilters = {
  source?: string;
  providerGroup?: 'monitoring';
  outcome?: 'unrouted';
  unreadmitted?: boolean;
};
export type RecordPage<T> = {
  items: T[];
  total: number;
  workspaceRevision: number;
  nextCursor: string | null;
  summaries?: Record<string, { title: string; severity: 'critical' | 'warning' | 'info' | null; observedAt: string | null }>;
  readmitted?: string[];
  countsBySource?: Record<string, number>;
  sourceTimeMissing?: string[];
};

export function useRecordPage<C extends keyof Collections>(collection: C, revision: number, filters: RecordFilters = {}, enabled = true) {
  const query = new URLSearchParams({ limit: '25' });
  if (filters.source) query.set('source', filters.source);
  if (filters.providerGroup) query.set('providerGroup', filters.providerGroup);
  if (filters.outcome) query.set('outcome', filters.outcome);
  if (filters.unreadmitted) query.set('unreadmitted', 'true');
  const filterKey = query.toString();
  const scope = JSON.stringify([collection, revision, filterKey, enabled]);
  const [navigation, setNavigation] = useState({ scope, cursors: [null] as (string | null)[], index: 0, refresh: 0 });
  if (navigation.scope !== scope) {
    setNavigation({ scope, cursors: [null], index: 0, refresh: 0 });
  }
  const current = navigation.scope === scope ? navigation : { scope, cursors: [null], index: 0, refresh: 0 };
  const cursor = current.cursors[current.index];
  const requestKey = JSON.stringify([scope, cursor, current.refresh]);
  const [result, setResult] = useState<{ key: string; data: RecordPage<Collections[C]> | null; error: string }>({ key: '', data: null, error: '' });
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    const params = new URLSearchParams(filterKey);
    if (cursor) params.set('cursor', cursor);
    setResult({ key: requestKey, data: null, error: '' });
    fetch(`/api/records/${collection}?${params}`, { signal: controller.signal })
      .then(async response => {
        const value: any = await response.json();
        if (!response.ok) throw new Error(value.error ?? `Request failed (${response.status})`);
        return value as RecordPage<Collections[C]>;
      })
      .then(data => { if (!controller.signal.aborted) setResult({ key: requestKey, data, error: '' }); })
      .catch(error => { if (!controller.signal.aborted) setResult({ key: requestKey, data: null, error: error instanceof Error ? error.message : 'Could not load records' }); });
    return () => controller.abort();
  }, [collection, filterKey, cursor, requestKey, enabled]);
  const data = enabled && result.key === requestKey ? result.data : null;
  const error = enabled && result.key === requestKey ? result.error : '';
  const loading = enabled && !data && !error;
  return {
    data, error, loading, enabled,
    page: current.index + 1,
    hasPrevious: current.index > 0,
    previous: () => setNavigation(value => ({ ...value, index: Math.max(0, value.index - 1) })),
    next: () => {
      if (data?.nextCursor) setNavigation(value => ({ ...value, cursors: [...value.cursors.slice(0, value.index + 1), data.nextCursor], index: value.index + 1 }));
    },
    refresh: () => setNavigation(value => ({ scope, cursors: [null], index: 0, refresh: value.refresh + 1 })),
  };
}
